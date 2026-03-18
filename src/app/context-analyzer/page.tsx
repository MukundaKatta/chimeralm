"use client";

import React, { useState, useMemo } from "react";
import {
  LayerConfig,
  LayerType,
  DEFAULT_LAYER_PARAMS,
  LAYER_COLORS,
} from "@/types/architecture";
import { analyzeContextScaling, computeLayerFlops, computeLayerMemory } from "@/lib/compute";
import { formatNumber, formatBytes, formatFlops, generateId } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Slider from "@/components/ui/Slider";

interface ArchPreset {
  name: string;
  color: string;
  layers: LayerConfig[];
}

function makeLayers(types: LayerType[], hiddenSize: number): LayerConfig[] {
  return types.map((type, i) => ({
    id: generateId(),
    type,
    name: `${type} ${i}`,
    params: { ...DEFAULT_LAYER_PARAMS[type], hiddenSize },
    position: { x: 0, y: 0 },
    connections: [],
  }));
}

const PRESETS: ArchPreset[] = [
  {
    name: "Pure Transformer (32L)",
    color: "#f59e0b",
    layers: makeLayers(["embedding", ...Array(32).fill("transformer"), "output"], 4096),
  },
  {
    name: "Pure Mamba (48L)",
    color: "#10b981",
    layers: makeLayers(["embedding", ...Array(48).fill("mamba"), "output"], 4096),
  },
  {
    name: "Hybrid T+M (32L)",
    color: "#8b5cf6",
    layers: makeLayers(
      ["embedding", ...Array(16).fill(null).flatMap(() => ["transformer", "mamba"]), "output"],
      4096
    ),
  },
  {
    name: "SSM + Attention",
    color: "#f97316",
    layers: makeLayers(
      ["embedding", ...Array(12).fill(null).flatMap(() => ["ssm", "ssm", "transformer"]), "output"],
      4096
    ),
  },
];

const CONTEXT_LENGTHS = [128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072];

export default function ContextAnalyzerPage() {
  const [selectedPresets, setSelectedPresets] = useState([0, 1, 2, 3]);
  const [hiddenSize, setHiddenSize] = useState(4096);
  const [gpuMemoryGB, setGpuMemoryGB] = useState(80);

  const analyses = useMemo(() => {
    return selectedPresets.map((idx) => {
      const preset = PRESETS[idx];
      const layers = preset.layers.map((l) => ({
        ...l,
        params: { ...l.params, hiddenSize },
      }));
      const data = analyzeContextScaling(layers, CONTEXT_LENGTHS);
      return { ...preset, data };
    });
  }, [selectedPresets, hiddenSize]);

  const maxMemory = Math.max(...analyses.flatMap((a) => a.data.map((d) => d.memoryGB)), 1);
  const maxFlopsPerToken = Math.max(...analyses.flatMap((a) => a.data.map((d) => d.flopsPerToken)), 1);
  const maxThroughput = Math.max(...analyses.flatMap((a) => a.data.map((d) => d.throughput)), 1);

  const chartHeight = 280;
  const chartWidth = 700;

  function toSVGPath(
    data: { seqLength: number; value: number }[],
    maxVal: number
  ): string {
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * chartWidth;
      const y = chartHeight - (d.value / maxVal) * (chartHeight - 20);
      return `${x},${y}`;
    });
    return `M ${points.join(" L ")}`;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Context Length Analyzer</h1>
        <p className="text-sm text-white/40 mt-1">
          Visualize how different architectures scale with increasing context length
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Controls */}
        <div className="col-span-3 space-y-4">
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Architectures
            </h3>
            {PRESETS.map((preset, i) => (
              <button
                key={i}
                onClick={() =>
                  setSelectedPresets((prev) =>
                    prev.includes(i)
                      ? prev.filter((p) => p !== i)
                      : [...prev, i]
                  )
                }
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                  selectedPresets.includes(i)
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    backgroundColor: selectedPresets.includes(i) ? preset.color : "transparent",
                    border: `2px solid ${preset.color}`,
                  }}
                />
                {preset.name}
              </button>
            ))}
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Configuration
            </h3>
            <Slider
              label="Hidden Size"
              value={hiddenSize}
              onChange={setHiddenSize}
              min={512}
              max={8192}
              step={512}
            />
            <Slider
              label="GPU Memory (GB)"
              value={gpuMemoryGB}
              onChange={setGpuMemoryGB}
              min={8}
              max={80}
              step={8}
              className="mt-3"
            />
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Scaling Behavior
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-transformer/60" />
                <span className="text-white/60">Transformer: O(n^2) attention</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-mamba/60" />
                <span className="text-white/60">Mamba: O(n) recurrent scan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-ssm/60" />
                <span className="text-white/60">SSM: O(n) state space</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-moe/60" />
                <span className="text-white/60">Hybrid: Mixed scaling</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="col-span-9 space-y-4">
          {/* Memory Scaling Chart */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-1">Memory Scaling (GB)</h3>
            <p className="text-[10px] text-white/30 mb-4">
              Total activation + parameter memory across context lengths
            </p>
            <div className="relative">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-72"
                preserveAspectRatio="none"
              >
                {/* Grid */}
                {Array.from({ length: 5 }, (_, i) => (
                  <line
                    key={i}
                    x1={0}
                    y1={(i / 4) * chartHeight}
                    x2={chartWidth}
                    y2={(i / 4) * chartHeight}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}

                {/* GPU memory limit line */}
                {gpuMemoryGB < maxMemory && (
                  <>
                    <line
                      x1={0}
                      y1={chartHeight - (gpuMemoryGB / maxMemory) * (chartHeight - 20)}
                      x2={chartWidth}
                      y2={chartHeight - (gpuMemoryGB / maxMemory) * (chartHeight - 20)}
                      stroke="#ef4444"
                      strokeWidth="1"
                      strokeDasharray="6 3"
                    />
                    <text
                      x={chartWidth - 5}
                      y={chartHeight - (gpuMemoryGB / maxMemory) * (chartHeight - 20) - 5}
                      fill="#ef4444"
                      fontSize="10"
                      textAnchor="end"
                    >
                      GPU Limit ({gpuMemoryGB} GB)
                    </text>
                  </>
                )}

                {/* Data lines */}
                {analyses.map((analysis) => (
                  <g key={analysis.name}>
                    <path
                      d={toSVGPath(
                        analysis.data.map((d) => ({ seqLength: d.seqLength, value: d.memoryGB })),
                        maxMemory
                      )}
                      fill="none"
                      stroke={analysis.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Glow effect */}
                    <path
                      d={toSVGPath(
                        analysis.data.map((d) => ({ seqLength: d.seqLength, value: d.memoryGB })),
                        maxMemory
                      )}
                      fill="none"
                      stroke={analysis.color}
                      strokeWidth="6"
                      strokeLinecap="round"
                      opacity="0.2"
                    />
                    {/* Data points */}
                    {analysis.data.map((d, i) => {
                      const x = (i / (analysis.data.length - 1)) * chartWidth;
                      const y = chartHeight - (d.memoryGB / maxMemory) * (chartHeight - 20);
                      return (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="3"
                          fill={analysis.color}
                          opacity="0.8"
                        />
                      );
                    })}
                  </g>
                ))}
              </svg>

              {/* X-axis labels */}
              <div className="flex justify-between mt-1 px-1">
                {CONTEXT_LENGTHS.map((len) => (
                  <span key={len} className="text-[8px] text-white/30">{formatNumber(len)}</span>
                ))}
              </div>
            </div>
          </Card>

          {/* FLOPs per Token Chart */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-1">FLOPs per Token</h3>
            <p className="text-[10px] text-white/30 mb-4">
              Compute cost per token at different context lengths
            </p>
            <div className="relative">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-72"
                preserveAspectRatio="none"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <line
                    key={i}
                    x1={0}
                    y1={(i / 4) * chartHeight}
                    x2={chartWidth}
                    y2={(i / 4) * chartHeight}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}

                {analyses.map((analysis) => (
                  <g key={analysis.name}>
                    <path
                      d={toSVGPath(
                        analysis.data.map((d) => ({
                          seqLength: d.seqLength,
                          value: d.flopsPerToken,
                        })),
                        maxFlopsPerToken
                      )}
                      fill="none"
                      stroke={analysis.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={toSVGPath(
                        analysis.data.map((d) => ({
                          seqLength: d.seqLength,
                          value: d.flopsPerToken,
                        })),
                        maxFlopsPerToken
                      )}
                      fill="none"
                      stroke={analysis.color}
                      strokeWidth="6"
                      opacity="0.2"
                    />
                  </g>
                ))}
              </svg>
              <div className="flex justify-between mt-1 px-1">
                {CONTEXT_LENGTHS.map((len) => (
                  <span key={len} className="text-[8px] text-white/30">{formatNumber(len)}</span>
                ))}
              </div>
            </div>
          </Card>

          {/* Throughput Chart */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-1">Estimated Throughput (tokens/sec)</h3>
            <p className="text-[10px] text-white/30 mb-4">
              Processing speed on A100 80GB at different context lengths
            </p>
            <div className="relative">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-72"
                preserveAspectRatio="none"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <line
                    key={i}
                    x1={0}
                    y1={(i / 4) * chartHeight}
                    x2={chartWidth}
                    y2={(i / 4) * chartHeight}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                ))}

                {analyses.map((analysis) => (
                  <g key={analysis.name}>
                    <path
                      d={toSVGPath(
                        analysis.data.map((d) => ({
                          seqLength: d.seqLength,
                          value: d.throughput,
                        })),
                        maxThroughput
                      )}
                      fill="none"
                      stroke={analysis.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={toSVGPath(
                        analysis.data.map((d) => ({
                          seqLength: d.seqLength,
                          value: d.throughput,
                        })),
                        maxThroughput
                      )}
                      fill="none"
                      stroke={analysis.color}
                      strokeWidth="6"
                      opacity="0.2"
                    />
                  </g>
                ))}
              </svg>
              <div className="flex justify-between mt-1 px-1">
                {CONTEXT_LENGTHS.map((len) => (
                  <span key={len} className="text-[8px] text-white/30">{formatNumber(len)}</span>
                ))}
              </div>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex gap-4 justify-center">
            {analyses.map((a) => (
              <div key={a.name} className="flex items-center gap-2">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: a.color }} />
                <span className="text-xs text-white/60">{a.name}</span>
              </div>
            ))}
          </div>

          {/* Data table */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Context Length Data Points</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-white/40">Seq Len</th>
                    {analyses.map((a) => (
                      <th key={a.name} colSpan={3} className="text-center py-2" style={{ color: a.color }}>
                        {a.name}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-white/5">
                    <th className="text-left py-1 text-white/30"></th>
                    {analyses.map((a) => (
                      <React.Fragment key={a.name}>
                        <th className="text-right py-1 text-white/30 px-1">Mem</th>
                        <th className="text-right py-1 text-white/30 px-1">FLOPs/tok</th>
                        <th className="text-right py-1 text-white/30 px-1">tok/s</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CONTEXT_LENGTHS.slice(0, 8).map((len, li) => (
                    <tr key={len} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-1.5 text-white/60 font-mono">{formatNumber(len)}</td>
                      {analyses.map((a) => {
                        const d = a.data[li];
                        return (
                          <React.Fragment key={a.name}>
                            <td className="text-right text-white/50 px-1 font-mono">
                              {d ? `${d.memoryGB.toFixed(1)}G` : "-"}
                            </td>
                            <td className="text-right text-white/50 px-1 font-mono">
                              {d ? formatFlops(d.flopsPerToken) : "-"}
                            </td>
                            <td className="text-right text-white/50 px-1 font-mono">
                              {d ? formatNumber(d.throughput) : "-"}
                            </td>
                          </React.Fragment>
                        );
                      })}
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
