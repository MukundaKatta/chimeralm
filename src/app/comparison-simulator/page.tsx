"use client";

import { useState, useMemo } from "react";
import { useArchitectureStore } from "@/stores/architectureStore";
import {
  Architecture,
  LayerConfig,
  LayerType,
  DEFAULT_LAYER_PARAMS,
  LAYER_COLORS,
} from "@/types/architecture";
import {
  computeLayerParams,
  computeLayerFlops,
  computeLayerMemory,
  estimateThroughput,
  estimateLatency,
} from "@/lib/compute";
import { formatNumber, formatFlops, formatBytes, generateId } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Slider from "@/components/ui/Slider";

// Predefined architectures for comparison
function createPreset(name: string, layerTypes: LayerType[], hiddenSize: number): Architecture {
  const layers: LayerConfig[] = layerTypes.map((type, i) => ({
    id: generateId(),
    type,
    name: `${type} ${i + 1}`,
    params: { ...DEFAULT_LAYER_PARAMS[type], hiddenSize },
    position: { x: 0, y: i * 80 },
    connections: [],
  }));

  const totalParams = layers.reduce((s, l) => s + computeLayerParams(l), 0);
  const estimatedFlops = layers.reduce((s, l) => s + computeLayerFlops(l, 2048), 0);
  const estimatedMemory = layers.reduce((s, l) => s + computeLayerMemory(l, 2048), 0);

  return {
    id: generateId(),
    name,
    description: "",
    layers,
    totalParams,
    estimatedFlops,
    estimatedMemory,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const PRESETS = [
  createPreset(
    "Transformer 7B",
    ["embedding", ...Array(32).fill("transformer"), "output"],
    4096
  ),
  createPreset(
    "Mamba 7B",
    ["embedding", ...Array(48).fill("mamba"), "output"],
    4096
  ),
  createPreset(
    "Jamba Hybrid",
    [
      "embedding",
      "transformer", "mamba", "transformer", "mamba",
      "moe", "mamba", "transformer", "mamba",
      "transformer", "mamba", "moe", "mamba",
      "transformer", "mamba", "transformer", "mamba",
      "output",
    ],
    4096
  ),
  createPreset(
    "Mixtral MoE 8x7B",
    ["embedding", ...Array(32).fill("moe"), "output"],
    4096
  ),
  createPreset(
    "StripedHyena",
    [
      "embedding",
      ...Array(16).fill(null).flatMap(() => ["ssm", "transformer"]),
      "output",
    ] as LayerType[],
    4096
  ),
];

export default function ComparisonSimulatorPage() {
  const { savedArchitectures } = useArchitectureStore();
  const [selected, setSelected] = useState<string[]>(
    PRESETS.slice(0, 3).map((p) => p.id)
  );
  const [seqLen, setSeqLen] = useState(2048);
  const [batchSize, setBatchSize] = useState(1);

  const allArchitectures = [...PRESETS, ...savedArchitectures];

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((s) => s !== id)
        : prev.length < 5
        ? [...prev, id]
        : prev
    );
  };

  const comparisons = useMemo(() => {
    return allArchitectures
      .filter((a) => selected.includes(a.id))
      .map((arch) => {
        const totalParams = arch.layers.reduce((s, l) => s + computeLayerParams(l), 0);
        const totalFlops = arch.layers.reduce((s, l) => s + computeLayerFlops(l, seqLen), 0);
        const totalMem = arch.layers.reduce((s, l) => s + computeLayerMemory(l, seqLen, batchSize), 0);
        const throughput = estimateThroughput(arch.layers, seqLen, batchSize);
        const latency = estimateLatency(arch.layers, seqLen);

        return {
          id: arch.id,
          name: arch.name,
          layers: arch.layers.length,
          totalParams,
          totalFlops,
          totalMem,
          throughput,
          latency,
          layerTypes: arch.layers.reduce(
            (acc, l) => { acc[l.type] = (acc[l.type] || 0) + 1; return acc; },
            {} as Record<string, number>
          ),
        };
      });
  }, [selected, seqLen, batchSize, allArchitectures]);

  const maxFlops = Math.max(...comparisons.map((c) => c.totalFlops), 1);
  const maxMem = Math.max(...comparisons.map((c) => c.totalMem), 1);
  const maxThroughput = Math.max(...comparisons.map((c) => c.throughput), 1);
  const maxParams = Math.max(...comparisons.map((c) => c.totalParams), 1);

  const barColors = ["#f59e0b", "#10b981", "#8b5cf6", "#3b82f6", "#ef4444"];

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Comparison Simulator</h1>
        <p className="text-sm text-white/40 mt-1">
          Compare FLOPs, memory, and throughput across different architecture designs
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Select Architectures (max 5)
            </h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {allArchitectures.map((arch, i) => (
                <button
                  key={arch.id}
                  onClick={() => toggleSelect(arch.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    selected.includes(arch.id)
                      ? "bg-white/15 text-white border border-white/20"
                      : "text-white/50 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {selected.includes(arch.id) && (
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: barColors[selected.indexOf(arch.id)] }}
                      />
                    )}
                    <span className="truncate">{arch.name}</span>
                    <span className="text-white/20 ml-auto">{arch.layers.length}L</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
              <Slider
                label="Sequence Length"
                value={seqLen}
                onChange={setSeqLen}
                min={128}
                max={131072}
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
            </div>
          </Card>
        </div>

        {/* Comparison Charts */}
        <div className="col-span-9 space-y-4">
          {/* Overview cards */}
          <div className="grid grid-cols-4 gap-3">
            {["Parameters", "FLOPs", "Memory", "Throughput"].map((metric) => (
              <Card key={metric}>
                <div className="text-[10px] text-white/40 uppercase tracking-wider mb-3">{metric}</div>
                <div className="space-y-2">
                  {comparisons.map((c, i) => {
                    const value =
                      metric === "Parameters" ? c.totalParams :
                      metric === "FLOPs" ? c.totalFlops :
                      metric === "Memory" ? c.totalMem :
                      c.throughput;
                    const maxVal =
                      metric === "Parameters" ? maxParams :
                      metric === "FLOPs" ? maxFlops :
                      metric === "Memory" ? maxMem :
                      maxThroughput;
                    const formatted =
                      metric === "Parameters" ? formatNumber(value) :
                      metric === "FLOPs" ? formatFlops(value) :
                      metric === "Memory" ? formatBytes(value) :
                      `${formatNumber(value)} tok/s`;

                    return (
                      <div key={c.id}>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[10px] text-white/60 truncate max-w-[100px]">{c.name}</span>
                          <span className="text-[10px] font-mono text-white/80">{formatted}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${(value / maxVal) * 100}%`,
                              backgroundColor: barColors[i],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>

          {/* Layer composition comparison */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Layer Type Composition</h3>
            <div className="space-y-3">
              {comparisons.map((c, i) => (
                <div key={c.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: barColors[i] }} />
                    <span className="text-xs text-white/70">{c.name}</span>
                  </div>
                  <div className="flex h-6 rounded-lg overflow-hidden">
                    {Object.entries(c.layerTypes).map(([type, count]) => (
                      <div
                        key={type}
                        className="h-full flex items-center justify-center text-[8px] font-bold text-white/80 transition-all duration-500"
                        style={{
                          width: `${(count / c.layers) * 100}%`,
                          backgroundColor: LAYER_COLORS[type as LayerType],
                          minWidth: count > 0 ? "20px" : "0",
                        }}
                        title={`${type}: ${count}`}
                      >
                        {count > 2 ? `${type.slice(0, 3)} ${count}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-3 mt-4 pt-3 border-t border-white/10 flex-wrap">
              {Object.entries(LAYER_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-white/40 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Efficiency scatter (text-based) */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">
              Efficiency Overview (Params vs. Throughput)
            </h3>
            <div className="relative h-64 grid-bg rounded-lg">
              {comparisons.map((c, i) => {
                const x = (c.totalParams / maxParams) * 85 + 5;
                const y = 90 - (c.throughput / maxThroughput) * 85;
                return (
                  <div
                    key={c.id}
                    className="absolute flex flex-col items-center gap-1 transition-all duration-700"
                    style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white animate-pulse-slow"
                      style={{ backgroundColor: barColors[i] }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[9px] text-white/60 whitespace-nowrap">{c.name}</span>
                  </div>
                );
              })}
              {/* Axes labels */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/30">
                Parameters (more --&gt;)
              </div>
              <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-white/30 whitespace-nowrap">
                Throughput (higher --&gt;)
              </div>
            </div>
          </Card>

          {/* Detailed comparison table */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Detailed Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-white/40 font-normal">Architecture</th>
                    <th className="text-right py-2 text-white/40 font-normal">Layers</th>
                    <th className="text-right py-2 text-white/40 font-normal">Params</th>
                    <th className="text-right py-2 text-white/40 font-normal">FLOPs @{formatNumber(seqLen)}</th>
                    <th className="text-right py-2 text-white/40 font-normal">Memory</th>
                    <th className="text-right py-2 text-white/40 font-normal">Throughput</th>
                    <th className="text-right py-2 text-white/40 font-normal">Latency/tok</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c, i) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: barColors[i] }} />
                          <span className="text-white/80">{c.name}</span>
                        </div>
                      </td>
                      <td className="text-right text-white/60 py-2">{c.layers}</td>
                      <td className="text-right text-white/60 py-2 font-mono">{formatNumber(c.totalParams)}</td>
                      <td className="text-right text-white/60 py-2 font-mono">{formatFlops(c.totalFlops)}</td>
                      <td className="text-right text-white/60 py-2 font-mono">{formatBytes(c.totalMem)}</td>
                      <td className="text-right text-white/60 py-2 font-mono">{formatNumber(c.throughput)} tok/s</td>
                      <td className="text-right text-white/60 py-2 font-mono">{c.latency.toFixed(2)} ms</td>
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
