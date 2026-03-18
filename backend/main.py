"""
ChimeraLM Python Backend
Handles compute-intensive architecture analysis, scaling law predictions,
and advanced profiling computations.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
import math

app = FastAPI(title="ChimeraLM Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Models ----------

class LayerConfig(BaseModel):
    type: str  # transformer, mamba, ssm, moe, feedforward, normalization, embedding, output
    hidden_size: int = 4096
    num_heads: Optional[int] = 32
    head_dim: Optional[int] = 128
    intermediate_size: Optional[int] = 11008
    num_experts: Optional[int] = 8
    top_k: Optional[int] = 2
    state_size: Optional[int] = 16
    conv_size: Optional[int] = 4
    vocab_size: Optional[int] = 32000
    max_seq_len: Optional[int] = 4096


class ArchitectureRequest(BaseModel):
    name: str
    layers: list[LayerConfig]
    seq_len: int = 2048
    batch_size: int = 1


class ScalingLawRequest(BaseModel):
    model_params: Optional[float] = None  # If None, compute-optimal
    compute_budgets: list[float]  # List of FLOPs budgets


class ContextAnalysisRequest(BaseModel):
    layers: list[LayerConfig]
    context_lengths: list[int]


class DataMixRequest(BaseModel):
    components: list[dict]  # {name, ratio, quality}
    total_tokens: float
    curriculum_stages: int = 3


# ---------- Compute Functions ----------

def compute_layer_params(layer: LayerConfig) -> int:
    h = layer.hidden_size
    layer_type = layer.type

    if layer_type == "transformer":
        heads = layer.num_heads or 32
        head_dim = layer.head_dim or h // heads
        qkv = 3 * h * heads * head_dim
        out_proj = heads * head_dim * h
        ff = 2 * h * (layer.intermediate_size or 4 * h)
        return qkv + out_proj + ff

    elif layer_type == "mamba":
        d = layer.state_size or 16
        conv = layer.conv_size or 4
        inner = layer.intermediate_size or 2 * h
        in_proj = h * inner * 2
        conv_params = inner * conv
        ssm_params = inner * d * 2 + inner * d
        out_proj = inner * h
        return in_proj + conv_params + ssm_params + out_proj

    elif layer_type == "ssm":
        d = layer.state_size or 64
        inner = layer.intermediate_size or h
        return h * inner + inner * d * 3 + inner * h

    elif layer_type == "moe":
        num_experts = layer.num_experts or 8
        ff_size = layer.intermediate_size or 4 * h
        expert_params = num_experts * 2 * h * ff_size
        router_params = h * num_experts
        return expert_params + router_params

    elif layer_type == "feedforward":
        ff_size = layer.intermediate_size or 4 * h
        return 2 * h * ff_size + ff_size

    elif layer_type == "normalization":
        return 2 * h

    elif layer_type in ("embedding", "output"):
        vocab = layer.vocab_size or 32000
        return vocab * h

    return 0


def compute_layer_flops(layer: LayerConfig, seq_len: int) -> int:
    h = layer.hidden_size
    layer_type = layer.type

    if layer_type == "transformer":
        heads = layer.num_heads or 32
        head_dim = layer.head_dim or h // heads
        qkv = 6 * seq_len * h * heads * head_dim
        attn = 2 * seq_len * seq_len * heads * head_dim
        out_proj = 2 * seq_len * heads * head_dim * h
        ff = 4 * seq_len * h * (layer.intermediate_size or 4 * h)
        return qkv + attn + out_proj + ff

    elif layer_type == "mamba":
        inner = layer.intermediate_size or 2 * h
        d = layer.state_size or 16
        return seq_len * (4 * h * inner + inner * d * 6)

    elif layer_type == "ssm":
        inner = layer.intermediate_size or h
        d = layer.state_size or 64
        return seq_len * (2 * h * inner + inner * d * 6)

    elif layer_type == "moe":
        top_k = layer.top_k or 2
        ff_size = layer.intermediate_size or 4 * h
        return seq_len * top_k * 4 * h * ff_size

    elif layer_type == "feedforward":
        ff_size = layer.intermediate_size or 4 * h
        return seq_len * 4 * h * ff_size

    elif layer_type == "normalization":
        return seq_len * 5 * h

    elif layer_type == "embedding":
        return seq_len * h

    elif layer_type == "output":
        vocab = layer.vocab_size or 32000
        return seq_len * 2 * h * vocab

    return 0


def compute_layer_memory(layer: LayerConfig, seq_len: int, batch_size: int = 1) -> int:
    h = layer.hidden_size
    bytes_per_param = 2  # fp16
    param_memory = compute_layer_params(layer) * bytes_per_param

    activation_memory = 0
    if layer.type == "transformer":
        heads = layer.num_heads or 32
        activation_memory = batch_size * (
            2 * seq_len * h +
            heads * seq_len * seq_len * 2 +
            seq_len * (layer.intermediate_size or 4 * h) * 2
        )
    elif layer.type == "mamba":
        d = layer.state_size or 16
        inner = layer.intermediate_size or 2 * h
        activation_memory = batch_size * (
            seq_len * h * 2 + seq_len * inner * 2 + inner * d * 2
        )
    elif layer.type == "ssm":
        d = layer.state_size or 64
        activation_memory = batch_size * (seq_len * h * 2 + h * d * 2)
    elif layer.type == "moe":
        top_k = layer.top_k or 2
        activation_memory = batch_size * seq_len * h * 2 * (1 + top_k)
    else:
        activation_memory = batch_size * seq_len * h * 2

    return param_memory + activation_memory * bytes_per_param


# ---------- Scaling Laws ----------

def chinchilla_loss(N: float, D: float) -> float:
    """Chinchilla scaling law: L(N, D) = E + A/N^alpha + B/D^beta"""
    E = 1.69
    A = 406.4
    alpha = 0.34
    B = 410.7
    beta = 0.28
    return E + A / (N ** alpha) + B / (D ** beta)


def compute_optimal_allocation(C: float):
    """Find optimal N*, D* for compute budget C (Chinchilla)"""
    # C ≈ 6*N*D
    # Optimal: N* ∝ C^0.5, D* ∝ C^0.5
    N_star = (C / 6) ** 0.5 * 0.7
    D_star = C / (6 * N_star)
    return N_star, D_star


# ---------- Endpoints ----------

@app.get("/")
def root():
    return {"name": "ChimeraLM Backend", "version": "0.1.0", "status": "running"}


@app.post("/api/profile")
def profile_architecture(req: ArchitectureRequest):
    """Profile all layers in an architecture."""
    profiles = []
    total_flops = 0
    total_memory = 0
    total_params = 0

    for i, layer in enumerate(req.layers):
        params = compute_layer_params(layer)
        flops = compute_layer_flops(layer, req.seq_len)
        memory = compute_layer_memory(layer, req.seq_len, req.batch_size)

        total_params += params
        total_flops += flops
        total_memory += memory

        profiles.append({
            "index": i,
            "type": layer.type,
            "params": params,
            "flops": flops,
            "memory_bytes": memory,
            "memory_mb": memory / (1024 ** 2),
        })

    # Add percentages
    for p in profiles:
        p["flops_percent"] = (p["flops"] / total_flops * 100) if total_flops > 0 else 0
        p["memory_percent"] = (p["memory_bytes"] / total_memory * 100) if total_memory > 0 else 0

    # Estimate throughput on A100
    gpu_tflops = 312e12
    utilization = 0.35
    throughput = (gpu_tflops * utilization * req.batch_size * req.seq_len) / total_flops if total_flops > 0 else 0

    return {
        "name": req.name,
        "total_params": total_params,
        "total_flops": total_flops,
        "total_memory_bytes": total_memory,
        "total_memory_gb": total_memory / (1024 ** 3),
        "estimated_throughput_tokens_per_sec": throughput,
        "estimated_latency_ms": (total_flops / req.seq_len) / (gpu_tflops * utilization) * 1000,
        "layers": profiles,
    }


@app.post("/api/scaling-law")
def predict_scaling_law(req: ScalingLawRequest):
    """Predict training loss using Chinchilla scaling laws."""
    predictions = []

    for C in req.compute_budgets:
        if req.model_params:
            N = req.model_params
            D = C / (6 * N)
        else:
            N, D = compute_optimal_allocation(C)

        loss = chinchilla_loss(N, D)
        N_opt, D_opt = compute_optimal_allocation(C)
        optimal_loss = chinchilla_loss(N_opt, D_opt)

        confidence = min(0.95, max(0.3, 0.5 + 0.3 * math.log10(max(C, 1) / 1e18)))

        predictions.append({
            "compute_budget_flops": C,
            "model_params": N,
            "training_tokens": D,
            "predicted_loss": loss,
            "optimal_params": N_opt,
            "optimal_tokens": D_opt,
            "optimal_loss": optimal_loss,
            "efficiency_gap": (loss / optimal_loss - 1) * 100,
            "confidence": confidence,
        })

    return {"predictions": predictions}


@app.post("/api/context-analysis")
def analyze_context(req: ContextAnalysisRequest):
    """Analyze how architecture scales with context length."""
    results = []

    has_transformer = any(l.type == "transformer" for l in req.layers)
    has_ssm = any(l.type in ("mamba", "ssm") for l in req.layers)

    for seq_len in req.context_lengths:
        total_flops = sum(compute_layer_flops(l, seq_len) for l in req.layers)
        total_memory = sum(compute_layer_memory(l, seq_len) for l in req.layers)

        if not has_transformer and has_ssm:
            attention_pattern = "recurrent"
        elif has_transformer and has_ssm:
            attention_pattern = "hybrid"
        elif has_transformer:
            attention_pattern = "quadratic"
        else:
            attention_pattern = "linear"

        gpu_tflops = 312e12
        throughput = (gpu_tflops * 0.35 * seq_len) / total_flops if total_flops > 0 else 0

        results.append({
            "seq_length": seq_len,
            "total_flops": total_flops,
            "flops_per_token": total_flops / seq_len if seq_len > 0 else 0,
            "memory_bytes": total_memory,
            "memory_gb": total_memory / (1024 ** 3),
            "throughput_tokens_per_sec": throughput,
            "attention_pattern": attention_pattern,
        })

    return {"context_analysis": results}


@app.post("/api/data-mix/optimize")
def optimize_data_mix(req: DataMixRequest):
    """Suggest optimized data mix based on quality and diversity."""
    components = req.components
    total_ratio = sum(c.get("ratio", 0) for c in components)

    # Simple quality-weighted optimization
    quality_weights = {"high": 1.5, "medium": 1.0, "low": 0.5}

    optimized = []
    total_weight = sum(quality_weights.get(c.get("quality", "medium"), 1.0) for c in components)

    for c in components:
        quality = c.get("quality", "medium")
        weight = quality_weights.get(quality, 1.0)
        suggested_ratio = weight / total_weight
        current_ratio = c.get("ratio", 0) / total_ratio if total_ratio > 0 else 0

        optimized.append({
            "name": c.get("name", "Unknown"),
            "current_ratio": current_ratio,
            "suggested_ratio": suggested_ratio,
            "quality": quality,
            "suggested_tokens": suggested_ratio * req.total_tokens,
        })

    # Generate curriculum stages
    stages = []
    for s in range(req.curriculum_stages):
        stage_ratios = {}
        progress = s / max(req.curriculum_stages - 1, 1)

        for c in components:
            name = c.get("name", "Unknown")
            quality = c.get("quality", "medium")
            base_ratio = c.get("ratio", 0) / total_ratio if total_ratio > 0 else 0

            # Gradually shift toward higher quality
            if quality == "high":
                stage_ratios[name] = base_ratio * (0.7 + 0.6 * progress)
            elif quality == "medium":
                stage_ratios[name] = base_ratio * (1.0 + 0.0 * progress)
            else:
                stage_ratios[name] = base_ratio * (1.3 - 0.6 * progress)

        # Normalize
        total = sum(stage_ratios.values())
        if total > 0:
            stage_ratios = {k: v / total for k, v in stage_ratios.items()}

        total_steps = 300000
        stages.append({
            "stage": s + 1,
            "start_step": int(s / req.curriculum_stages * total_steps),
            "end_step": int((s + 1) / req.curriculum_stages * total_steps),
            "mix_ratios": stage_ratios,
        })

    return {
        "optimized_mix": optimized,
        "curriculum_stages": stages,
    }


@app.post("/api/compare")
def compare_architectures(architectures: list[ArchitectureRequest]):
    """Compare multiple architectures side by side."""
    results = []

    for arch in architectures:
        total_params = sum(compute_layer_params(l) for l in arch.layers)
        total_flops = sum(compute_layer_flops(l, arch.seq_len) for l in arch.layers)
        total_memory = sum(compute_layer_memory(l, arch.seq_len, arch.batch_size) for l in arch.layers)

        gpu_tflops = 312e12
        utilization = 0.35
        throughput = (gpu_tflops * utilization * arch.batch_size * arch.seq_len) / total_flops if total_flops > 0 else 0

        layer_types = {}
        for l in arch.layers:
            layer_types[l.type] = layer_types.get(l.type, 0) + 1

        results.append({
            "name": arch.name,
            "total_params": total_params,
            "total_flops": total_flops,
            "memory_gb": total_memory / (1024 ** 3),
            "throughput_tokens_per_sec": throughput,
            "latency_ms_per_token": (total_flops / arch.seq_len) / (gpu_tflops * utilization) * 1000,
            "num_layers": len(arch.layers),
            "layer_type_counts": layer_types,
        })

    return {"comparisons": results}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
