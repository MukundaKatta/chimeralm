"use client";

import { useState, useMemo } from "react";
import {
  LayerConfig,
  LayerType,
  DEFAULT_LAYER_PARAMS,
  LAYER_COLORS,
} from "@/types/architecture";
import { profileArchitecture, computeLayerParams } from "@/lib/compute";
import { formatNumber, formatFlops, generateId } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Slider from "@/components/ui/Slider";
import Button from "@/components/ui/Button";
import { useArchitectureStore } from "@/stores/architectureStore";

function makeLayers(types: LayerType[], hiddenSize: number): LayerConfig[] {
  return types.map((type, i) => ({
    id: generateId(),
    type,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}`,
    params: { ...DEFAULT_LAYER_PARAMS[type], hiddenSize },
    position: { x: 0, y: 0 },
    connections: [],
  }));
}

export default function LayerProfilerPage() {
  const { currentArchitecture } = useArchitectureStore();
  const [seqLen, setSeqLen] = useState(2048);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [presetIdx, setPresetIdx] = useState(0);

  const presets = [
    { name: "Jamba Hybrid", layers: makeLayers(["embedding", "transformer", "mamba", "transformer", "moe", "mamba", "transformer", "mamba", "moe", "transformer", "output"], 4096) },
    { name: "Transformer 7B (8L sample)", layers: makeLayers(["embedding", ...Array(8).fill("transformer"), "output"], 4096) },
    { name: "Mamba + MoE", layers: makeLayers(["embedding", "mamba", "moe", "mamba", "moe", "mamba", "moe", "mamba", "output"], 4096) },
  ];

  const activeLayers = currentArchitecture?.layers.length
    ? currentArchitecture.layers
    : presets[presetIdx].layers;

  const profiles = useMemo(
    () => profileArchitecture(activeLayers, seqLen),
    [activeLayers, seqLen]
  );

  const totalFlops = profiles.reduce((s, p) => s + p.flops, 0);
  const totalMemory = profiles.reduce((s, p) => s + p.memoryMB, 0);
  const totalParams = profiles.reduce((s, p) => s + p.paramCount, 0);

  const maxFlops = Math.max(...profiles.map((p) => p.flops), 1);
  const maxMemory = Math.max(...profiles.map((p) => p.memoryMB), 1);

  const selected = profiles.find((p) => p.layerId === selectedProfile);

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Layer-by-Layer Profiler</h1>
        <p className="text-sm text-white/40 mt-1">
          Visualize compute and memory allocation per layer type
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Controls */}
        <div className="col-span-3 space-y-4">
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Architecture Source
            </h3>
            {currentArchitecture?.layers.length ? (
              <div className="text-xs text-mamba">
                Using: {currentArchitecture.name} ({currentArchitecture.layers.length} layers)
              </div>
            ) : (
              <div className="space-y-1.5">
                {presets.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setPresetIdx(i)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                      presetIdx === i
                        ? "bg-chimera-600/20 text-chimera-300 border border-chimera-500/30"
                        : "text-white/50 hover:bg-white/5"
                    }`}
                  >
                    {p.name} ({p.layers.length}L)
                  </button>
                ))}
                <p className="text-[10px] text-white/30 mt-2">
                  Or build an architecture in the Architecture Builder
                </p>
              </div>
            )}
          </Card>

          <Card>
            <Slider
              label="Sequence Length"
              value={seqLen}
              onChange={setSeqLen}
              min={128}
              max={32768}
              step={128}
              formatValue={formatNumber}
            />
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Total Params</span>
                <span className="font-mono text-white">{formatNumber(totalParams)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Total FLOPs</span>
                <span className="font-mono text-white">{formatFlops(totalFlops)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Total Memory</span>
                <span className="font-mono text-white">{totalMemory.toFixed(1)} MB</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Layers</span>
                <span className="font-mono text-white">{profiles.length}</span>
              </div>
            </div>
          </Card>

          {/* Selected layer detail */}
          {selected && (
            <Card className="animated-border">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                Layer Detail
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: `${LAYER_COLORS[selected.layerType]}40` }}
                  >
                    {selected.layerType.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{selected.layerName}</div>
                    <div className="text-[10px] text-white/40 capitalize">{selected.layerType}</div>
                  </div>
                </div>
                {[
                  { label: "FLOPs", value: formatFlops(selected.flops) },
                  { label: "Memory", value: `${selected.memoryMB.toFixed(1)} MB` },
                  { label: "Parameters", value: formatNumber(selected.paramCount) },
                  { label: "% of Total FLOPs", value: `${selected.percentOfTotal.toFixed(1)}%` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-xs">
                    <span className="text-white/40">{item.label}</span>
                    <span className="font-mono text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Profiler visualizations */}
        <div className="col-span-9 space-y-4">
          {/* FLOPs per layer - horizontal bars */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">FLOPs per Layer</h3>
            <div className="space-y-1.5">
              {profiles.map((profile) => {
                const color = LAYER_COLORS[profile.layerType];
                const width = (profile.flops / maxFlops) * 100;
                return (
                  <button
                    key={profile.layerId}
                    onClick={() => setSelectedProfile(profile.layerId)}
                    className={`w-full flex items-center gap-3 py-1.5 px-2 rounded-lg transition-all ${
                      selectedProfile === profile.layerId ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: `${color}40` }}
                    >
                      {profile.layerType.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] text-white/60 truncate">{profile.layerName}</span>
                        <span className="text-[10px] font-mono text-white/40 ml-2">
                          {formatFlops(profile.flops)} ({profile.percentOfTotal.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${width}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Memory per layer */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Memory per Layer (MB)</h3>
            <div className="space-y-1.5">
              {profiles.map((profile) => {
                const color = LAYER_COLORS[profile.layerType];
                const width = (profile.memoryMB / maxMemory) * 100;
                return (
                  <button
                    key={profile.layerId}
                    onClick={() => setSelectedProfile(profile.layerId)}
                    className={`w-full flex items-center gap-3 py-1.5 px-2 rounded-lg transition-all ${
                      selectedProfile === profile.layerId ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                      style={{ backgroundColor: `${color}40` }}
                    >
                      {profile.layerType.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] text-white/60 truncate">{profile.layerName}</span>
                        <span className="text-[10px] font-mono text-white/40 ml-2">
                          {profile.memoryMB.toFixed(1)} MB
                        </span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${width}%`, backgroundColor: color, opacity: 0.7 }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Treemap-style breakdown */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Compute Distribution (Treemap)</h3>
            <div className="flex flex-wrap gap-1 h-40">
              {profiles
                .sort((a, b) => b.flops - a.flops)
                .map((profile) => {
                  const pct = (profile.flops / totalFlops) * 100;
                  const color = LAYER_COLORS[profile.layerType];
                  return (
                    <div
                      key={profile.layerId}
                      className="rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        height: "100%",
                        backgroundColor: `${color}40`,
                        border: `1px solid ${color}60`,
                        flexGrow: pct,
                      }}
                      onClick={() => setSelectedProfile(profile.layerId)}
                      title={`${profile.layerName}: ${profile.percentOfTotal.toFixed(1)}%`}
                    >
                      {pct > 5 && (
                        <div className="text-center">
                          <div className="text-[10px] font-bold text-white/80">
                            {profile.layerType.slice(0, 3).toUpperCase()}
                          </div>
                          <div className="text-[8px] text-white/50">
                            {profile.percentOfTotal.toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </Card>

          {/* Type aggregation */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Aggregated by Layer Type</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(
                profiles.reduce(
                  (acc, p) => {
                    if (!acc[p.layerType]) acc[p.layerType] = { flops: 0, memory: 0, params: 0, count: 0 };
                    acc[p.layerType].flops += p.flops;
                    acc[p.layerType].memory += p.memoryMB;
                    acc[p.layerType].params += p.paramCount;
                    acc[p.layerType].count += 1;
                    return acc;
                  },
                  {} as Record<string, { flops: number; memory: number; params: number; count: number }>
                )
              ).map(([type, data]) => (
                <div
                  key={type}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                  style={{ borderColor: `${LAYER_COLORS[type as LayerType]}40` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: LAYER_COLORS[type as LayerType] }}
                    />
                    <span className="text-xs font-semibold text-white capitalize">{type}</span>
                    <span className="text-[10px] text-white/30 ml-auto">{data.count} layers</span>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-white/40">FLOPs</span>
                      <span className="font-mono text-white/60">{formatFlops(data.flops)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Memory</span>
                      <span className="font-mono text-white/60">{data.memory.toFixed(1)} MB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">Params</span>
                      <span className="font-mono text-white/60">{formatNumber(data.params)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">% FLOPs</span>
                      <span className="font-mono text-white/60">
                        {((data.flops / totalFlops) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
