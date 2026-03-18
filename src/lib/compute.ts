import { LayerConfig, LayerType, LayerProfile, ContextAnalysis, ScalingLawPrediction } from "@/types/architecture";

// Compute parameter counts for each layer type
export function computeLayerParams(layer: LayerConfig): number {
  const p = layer.params;
  const h = p.hiddenSize;

  switch (layer.type) {
    case "transformer": {
      const heads = p.numHeads || 32;
      const headDim = p.headDim || h / heads;
      const qkvParams = 3 * h * heads * headDim;
      const outParams = heads * headDim * h;
      const ffParams = 2 * h * (p.intermediateSize || 4 * h);
      return qkvParams + outParams + ffParams;
    }
    case "mamba": {
      const d = p.stateSize || 16;
      const conv = p.convSize || 4;
      const inner = p.intermediateSize || 2 * h;
      const inProj = h * inner * 2;
      const convParams = inner * conv;
      const ssmParams = inner * d * 2 + inner * d;
      const outProj = inner * h;
      return inProj + convParams + ssmParams + outProj;
    }
    case "ssm": {
      const d = p.stateSize || 64;
      const inner = p.intermediateSize || h;
      return h * inner + inner * d * 3 + inner * h;
    }
    case "moe": {
      const numExperts = p.numExperts || 8;
      const ffSize = p.intermediateSize || 4 * h;
      const expertParams = numExperts * 2 * h * ffSize;
      const routerParams = h * numExperts;
      return expertParams + routerParams;
    }
    case "feedforward": {
      const ffSize = p.intermediateSize || 4 * h;
      return 2 * h * ffSize + ffSize;
    }
    case "normalization":
      return 2 * h;
    case "embedding": {
      const vocab = p.vocabSize || 32000;
      return vocab * h;
    }
    case "output": {
      const vocab = p.vocabSize || 32000;
      return vocab * h;
    }
    default:
      return 0;
  }
}

// Compute FLOPs per token for a layer
export function computeLayerFlops(layer: LayerConfig, seqLen: number): number {
  const p = layer.params;
  const h = p.hiddenSize;

  switch (layer.type) {
    case "transformer": {
      const heads = p.numHeads || 32;
      const headDim = p.headDim || h / heads;
      const qkvFlops = 6 * seqLen * h * heads * headDim;
      const attnFlops = 2 * seqLen * seqLen * heads * headDim;
      const outFlops = 2 * seqLen * heads * headDim * h;
      const ffFlops = 4 * seqLen * h * (p.intermediateSize || 4 * h);
      return qkvFlops + attnFlops + outFlops + ffFlops;
    }
    case "mamba": {
      const inner = p.intermediateSize || 2 * h;
      const d = p.stateSize || 16;
      return seqLen * (4 * h * inner + inner * d * 6);
    }
    case "ssm": {
      const inner = p.intermediateSize || h;
      const d = p.stateSize || 64;
      return seqLen * (2 * h * inner + inner * d * 6);
    }
    case "moe": {
      const topK = p.topK || 2;
      const ffSize = p.intermediateSize || 4 * h;
      return seqLen * topK * 4 * h * ffSize;
    }
    case "feedforward": {
      const ffSize = p.intermediateSize || 4 * h;
      return seqLen * 4 * h * ffSize;
    }
    case "normalization":
      return seqLen * 5 * h;
    case "embedding":
      return seqLen * h;
    case "output": {
      const vocab = p.vocabSize || 32000;
      return seqLen * 2 * h * vocab;
    }
    default:
      return 0;
  }
}

// Compute memory for a layer (activations in bytes, fp16)
export function computeLayerMemory(layer: LayerConfig, seqLen: number, batchSize: number = 1): number {
  const p = layer.params;
  const h = p.hiddenSize;
  const bytesPerParam = 2; // fp16

  const paramMemory = computeLayerParams(layer) * bytesPerParam;

  let activationMemory = 0;
  switch (layer.type) {
    case "transformer": {
      const heads = p.numHeads || 32;
      activationMemory = batchSize * (
        2 * seqLen * h + // input + output
        heads * seqLen * seqLen * 2 + // attention scores
        seqLen * (p.intermediateSize || 4 * h) * 2 // FFN activations
      );
      break;
    }
    case "mamba": {
      const d = p.stateSize || 16;
      const inner = p.intermediateSize || 2 * h;
      activationMemory = batchSize * (
        seqLen * h * 2 + // input/output
        seqLen * inner * 2 + // projections
        inner * d * 2 // state
      );
      break;
    }
    case "ssm": {
      const d = p.stateSize || 64;
      activationMemory = batchSize * (seqLen * h * 2 + h * d * 2);
      break;
    }
    case "moe": {
      const topK = p.topK || 2;
      activationMemory = batchSize * seqLen * h * 2 * (1 + topK);
      break;
    }
    default:
      activationMemory = batchSize * seqLen * h * 2;
  }

  return paramMemory + activationMemory * bytesPerParam;
}

// Profile all layers
export function profileArchitecture(layers: LayerConfig[], seqLen: number): LayerProfile[] {
  const profiles = layers.map((layer) => {
    const flops = computeLayerFlops(layer, seqLen);
    const memoryBytes = computeLayerMemory(layer, seqLen);
    const paramCount = computeLayerParams(layer);

    return {
      layerId: layer.id,
      layerType: layer.type,
      layerName: layer.name,
      flops,
      memoryMB: memoryBytes / (1024 * 1024),
      percentOfTotal: 0,
      paramCount,
    };
  });

  const totalFlops = profiles.reduce((sum, p) => sum + p.flops, 0);
  profiles.forEach((p) => {
    p.percentOfTotal = totalFlops > 0 ? (p.flops / totalFlops) * 100 : 0;
  });

  return profiles;
}

// Context length analysis
export function analyzeContextScaling(
  layers: LayerConfig[],
  contextLengths: number[]
): ContextAnalysis[] {
  return contextLengths.map((seqLen) => {
    const totalFlops = layers.reduce((sum, l) => sum + computeLayerFlops(l, seqLen), 0);
    const totalMemory = layers.reduce((sum, l) => sum + computeLayerMemory(l, seqLen), 0);

    const hasTransformer = layers.some((l) => l.type === "transformer");
    const hasMamba = layers.some((l) => l.type === "mamba" || l.type === "ssm");

    let attentionPattern: ContextAnalysis["attentionPattern"] = "full";
    if (!hasTransformer && hasMamba) attentionPattern = "recurrent";
    else if (hasTransformer && hasMamba) attentionPattern = "linear";

    // Rough throughput estimate (A100 ~312 TFLOPS fp16)
    const gpuTflops = 312e12;
    const throughput = (gpuTflops / (totalFlops / seqLen)) * 0.3; // 30% utilization

    return {
      seqLength: seqLen,
      memoryGB: totalMemory / (1024 ** 3),
      flopsPerToken: totalFlops / seqLen,
      throughput,
      attentionPattern,
    };
  });
}

// Chinchilla scaling law predictions
export function predictScalingLaw(
  computeBudgets: number[],
  modelParams?: number
): ScalingLawPrediction[] {
  // Chinchilla: L(N, D) = E + A/N^alpha + B/D^beta
  const E = 1.69; // irreducible loss
  const A = 406.4;
  const alpha = 0.34;
  const B = 410.7;
  const beta = 0.28;

  return computeBudgets.map((C) => {
    // C ≈ 6 * N * D (compute-optimal)
    // Optimal: N* ∝ C^0.5, D* ∝ C^0.5
    const optimalN = modelParams || Math.pow(C / 6, 0.5) * 0.7;
    const optimalD = C / (6 * optimalN);

    const loss = E + A / Math.pow(optimalN, alpha) + B / Math.pow(optimalD, beta);
    const confidence = Math.min(0.95, 0.5 + 0.3 * Math.log10(C / 1e18));

    return {
      computeBudgetFlops: C,
      optimalParams: optimalN,
      optimalTokens: optimalD,
      predictedLoss: loss,
      confidence: Math.max(0.3, confidence),
    };
  });
}

// Estimate throughput (tokens/sec) for architecture
export function estimateThroughput(
  layers: LayerConfig[],
  seqLen: number,
  batchSize: number = 1,
  gpuTflops: number = 312e12
): number {
  const totalFlopsPerSeq = layers.reduce((sum, l) => sum + computeLayerFlops(l, seqLen), 0);
  const utilization = 0.35;
  return (gpuTflops * utilization * batchSize * seqLen) / totalFlopsPerSeq;
}

// Estimate latency per token (ms)
export function estimateLatency(
  layers: LayerConfig[],
  seqLen: number,
  gpuTflops: number = 312e12
): number {
  const totalFlops = layers.reduce((sum, l) => sum + computeLayerFlops(l, seqLen), 0);
  const flopsPerToken = totalFlops / seqLen;
  const utilization = 0.35;
  return (flopsPerToken / (gpuTflops * utilization)) * 1000;
}
