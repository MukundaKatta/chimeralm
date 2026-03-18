"use client";

import { useState, useMemo } from "react";
import { formatNumber, formatFlops } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Slider from "@/components/ui/Slider";

interface ModelConfig {
  name: string;
  totalParams: number;
  activeParams: number;
  hiddenSize: number;
  numLayers: number;
  type: "transformer" | "mamba" | "hybrid" | "moe";
  color: string;
}

const REFERENCE_MODELS: ModelConfig[] = [
  { name: "LLaMA 2 7B", totalParams: 7e9, activeParams: 7e9, hiddenSize: 4096, numLayers: 32, type: "transformer", color: "#f59e0b" },
  { name: "LLaMA 2 13B", totalParams: 13e9, activeParams: 13e9, hiddenSize: 5120, numLayers: 40, type: "transformer", color: "#d97706" },
  { name: "LLaMA 2 70B", totalParams: 70e9, activeParams: 70e9, hiddenSize: 8192, numLayers: 80, type: "transformer", color: "#b45309" },
  { name: "Mamba 2.8B", totalParams: 2.8e9, activeParams: 2.8e9, hiddenSize: 2560, numLayers: 64, type: "mamba", color: "#10b981" },
  { name: "Mamba 7B (est.)", totalParams: 7e9, activeParams: 7e9, hiddenSize: 4096, numLayers: 96, type: "mamba", color: "#059669" },
  { name: "Jamba 52B", totalParams: 52e9, activeParams: 12e9, hiddenSize: 4096, numLayers: 32, type: "hybrid", color: "#8b5cf6" },
  { name: "Mixtral 8x7B", totalParams: 47e9, activeParams: 13e9, hiddenSize: 4096, numLayers: 32, type: "moe", color: "#3b82f6" },
  { name: "Custom Hybrid", totalParams: 10e9, activeParams: 10e9, hiddenSize: 4096, numLayers: 32, type: "hybrid", color: "#ec4899" },
];

export default function EfficiencyCalculatorPage() {
  const [customParams, setCustomParams] = useState(10e9);
  const [customActive, setCustomActive] = useState(10e9);
  const [customLayers, setCustomLayers] = useState(32);
  const [customHidden, setCustomHidden] = useState(4096);
  const [seqLen, setSeqLen] = useState(2048);
  const [batchSize, setBatchSize] = useState(1);
  const [precision, setPrecision] = useState(2); // bytes per param

  const models = useMemo(() => {
    const custom = REFERENCE_MODELS[REFERENCE_MODELS.length - 1];
    custom.totalParams = customParams;
    custom.activeParams = Math.min(customActive, customParams);
    custom.numLayers = customLayers;
    custom.hiddenSize = customHidden;
    return [...REFERENCE_MODELS];
  }, [customParams, customActive, customLayers, customHidden]);

  const computeMetrics = (model: ModelConfig) => {
    const activeRatio = model.activeParams / model.totalParams;
    const effectiveCompute = model.activeParams * 6 * seqLen; // 6N FLOPs per token
    const memoryParams = model.totalParams * precision;
    const memoryActivations =
      model.type === "transformer"
        ? batchSize * seqLen * model.hiddenSize * model.numLayers * 2 * precision
        : batchSize * seqLen * model.hiddenSize * model.numLayers * precision;
    const totalMemory = memoryParams + memoryActivations;

    // Throughput estimate (simplified)
    const gpuTflops = 312e12;
    const utilization = model.type === "mamba" ? 0.45 : model.type === "moe" ? 0.3 : 0.35;
    const throughput = (gpuTflops * utilization) / (effectiveCompute / seqLen);

    // Quality proxy: effective params per FLOP
    const qualityPerFlop = model.activeParams / effectiveCompute;

    // Efficiency score (higher = more efficient)
    const efficiency = (throughput * activeRatio) / (totalMemory / 1e9);

    return {
      ...model,
      activeRatio,
      effectiveCompute,
      memoryGB: totalMemory / 1e9,
      throughput,
      qualityPerFlop,
      efficiency,
      paramsPerByte: model.totalParams / totalMemory,
    };
  };

  const metrics = models.map(computeMetrics);
  const maxThroughput = Math.max(...metrics.map((m) => m.throughput), 1);
  const maxMemory = Math.max(...metrics.map((m) => m.memoryGB), 1);
  const maxEfficiency = Math.max(...metrics.map((m) => m.efficiency), 1);

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Model Efficiency Calculator</h1>
        <p className="text-sm text-white/40 mt-1">
          Compare parameters vs. effective compute for hybrid vs. pure architectures
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Controls */}
        <div className="col-span-3 space-y-4">
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Custom Model Config
            </h3>
            <div className="space-y-3">
              <Slider
                label="Total Parameters"
                value={customParams / 1e9}
                onChange={(v) => setCustomParams(v * 1e9)}
                min={1}
                max={100}
                step={0.5}
                formatValue={(v) => `${v}B`}
                color="#ec4899"
              />
              <Slider
                label="Active Parameters"
                value={customActive / 1e9}
                onChange={(v) => setCustomActive(v * 1e9)}
                min={1}
                max={customParams / 1e9}
                step={0.5}
                formatValue={(v) => `${v}B`}
                color="#ec4899"
              />
              <Slider
                label="Num Layers"
                value={customLayers}
                onChange={setCustomLayers}
                min={4}
                max={128}
                step={1}
                color="#ec4899"
              />
              <Slider
                label="Hidden Size"
                value={customHidden}
                onChange={setCustomHidden}
                min={512}
                max={16384}
                step={512}
                color="#ec4899"
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Inference Config
            </h3>
            <div className="space-y-3">
              <Slider
                label="Sequence Length"
                value={seqLen}
                onChange={setSeqLen}
                min={128}
                max={32768}
                step={128}
                formatValue={formatNumber}
              />
              <Slider
                label="Batch Size"
                value={batchSize}
                onChange={setBatchSize}
                min={1}
                max={64}
                step={1}
              />
              <div className="flex gap-2">
                {[
                  { label: "FP16", value: 2 },
                  { label: "FP32", value: 4 },
                  { label: "INT8", value: 1 },
                  { label: "INT4", value: 0.5 },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPrecision(opt.value)}
                    className={`flex-1 px-2 py-1.5 rounded text-[10px] transition-all ${
                      precision === opt.value
                        ? "bg-chimera-600/30 text-chimera-300 border border-chimera-500/30"
                        : "bg-white/5 text-white/40 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Legend
            </h3>
            <div className="space-y-1.5">
              {[
                { label: "Transformer", color: "#f59e0b" },
                { label: "Mamba / SSM", color: "#10b981" },
                { label: "Hybrid (T+M)", color: "#8b5cf6" },
                { label: "MoE", color: "#3b82f6" },
                { label: "Custom", color: "#ec4899" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-white/50">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Results */}
        <div className="col-span-9 space-y-4">
          {/* Active vs Total params */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Active vs. Total Parameters</h3>
            <div className="space-y-2">
              {metrics.map((m) => (
                <div key={m.name} className="flex items-center gap-3">
                  <span className="text-[10px] text-white/60 w-28 truncate">{m.name}</span>
                  <div className="flex-1 relative h-5 bg-white/5 rounded-full overflow-hidden">
                    {/* Total params */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full opacity-30"
                      style={{
                        width: `${(m.totalParams / Math.max(...metrics.map((x) => x.totalParams))) * 100}%`,
                        backgroundColor: m.color,
                      }}
                    />
                    {/* Active params */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${(m.activeParams / Math.max(...metrics.map((x) => x.totalParams))) * 100}%`,
                        backgroundColor: m.color,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-[9px] font-mono text-white/80">
                        {formatNumber(m.activeParams)} / {formatNumber(m.totalParams)}
                        {m.activeRatio < 1 && ` (${(m.activeRatio * 100).toFixed(0)}% active)`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Efficiency comparison */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Throughput (tok/s)</h3>
              <div className="space-y-2">
                {metrics
                  .sort((a, b) => b.throughput - a.throughput)
                  .map((m) => (
                    <div key={m.name}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-white/60 truncate max-w-[100px]">{m.name}</span>
                        <span className="font-mono text-white/80">{formatNumber(m.throughput)}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(m.throughput / maxThroughput) * 100}%`,
                            backgroundColor: m.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Memory Usage (GB)</h3>
              <div className="space-y-2">
                {metrics
                  .sort((a, b) => a.memoryGB - b.memoryGB)
                  .map((m) => (
                    <div key={m.name}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-white/60 truncate max-w-[100px]">{m.name}</span>
                        <span className="font-mono text-white/80">{m.memoryGB.toFixed(1)} GB</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(m.memoryGB / maxMemory) * 100}%`,
                            backgroundColor: m.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Efficiency Score</h3>
              <div className="space-y-2">
                {metrics
                  .sort((a, b) => b.efficiency - a.efficiency)
                  .map((m) => (
                    <div key={m.name}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-white/60 truncate max-w-[100px]">{m.name}</span>
                        <span className="font-mono text-white/80">{(m.efficiency / maxEfficiency * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(m.efficiency / maxEfficiency) * 100}%`,
                            backgroundColor: m.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>

          {/* Detailed table */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Detailed Metrics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-white/40">Model</th>
                    <th className="text-right py-2 text-white/40">Type</th>
                    <th className="text-right py-2 text-white/40">Total</th>
                    <th className="text-right py-2 text-white/40">Active</th>
                    <th className="text-right py-2 text-white/40">Active %</th>
                    <th className="text-right py-2 text-white/40">FLOPs/fwd</th>
                    <th className="text-right py-2 text-white/40">Memory</th>
                    <th className="text-right py-2 text-white/40">tok/s</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.name} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                          <span className="text-white/80">{m.name}</span>
                        </div>
                      </td>
                      <td className="text-right text-white/50 py-2 capitalize">{m.type}</td>
                      <td className="text-right text-white/60 py-2 font-mono">{formatNumber(m.totalParams)}</td>
                      <td className="text-right text-white/60 py-2 font-mono">{formatNumber(m.activeParams)}</td>
                      <td className="text-right text-white/60 py-2 font-mono">{(m.activeRatio * 100).toFixed(0)}%</td>
                      <td className="text-right text-white/60 py-2 font-mono">{formatFlops(m.effectiveCompute)}</td>
                      <td className="text-right text-white/60 py-2 font-mono">{m.memoryGB.toFixed(1)} GB</td>
                      <td className="text-right text-white/60 py-2 font-mono">{formatNumber(m.throughput)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
