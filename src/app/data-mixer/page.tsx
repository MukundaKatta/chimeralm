"use client";

import { useState } from "react";
import { useArchitectureStore } from "@/stores/architectureStore";
import { DataComponent } from "@/types/architecture";
import { formatNumber, generateId } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Slider from "@/components/ui/Slider";
import Input from "@/components/ui/Input";

const COMPONENT_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function DataMixerPage() {
  const { dataMix, updateComponentRatio, addDataComponent, removeDataComponent, updateDataMix } =
    useArchitectureStore();
  const [newName, setNewName] = useState("");
  const [totalTokens, setTotalTokens] = useState(dataMix.totalTokens);
  const [showCurriculum, setShowCurriculum] = useState(true);

  const totalRatio = dataMix.components.reduce((s, c) => s + c.ratio, 0);

  const handleAddComponent = () => {
    if (!newName.trim()) return;
    const component: DataComponent = {
      name: newName,
      ratio: 0.05,
      color: COMPONENT_COLORS[dataMix.components.length % COMPONENT_COLORS.length],
      tokens: totalTokens * 0.05,
      quality: "medium",
    };
    addDataComponent(component);
    setNewName("");
  };

  const normalizeRatios = () => {
    dataMix.components.forEach((_, i) => {
      updateComponentRatio(i, dataMix.components[i].ratio / totalRatio);
    });
  };

  // Pie chart rendering
  const pieRadius = 120;
  const pieCenter = { x: 150, y: 150 };

  let cumAngle = -Math.PI / 2;
  const pieSlices = dataMix.components.map((comp) => {
    const angle = (comp.ratio / (totalRatio || 1)) * Math.PI * 2;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = pieCenter.x + pieRadius * Math.cos(startAngle);
    const y1 = pieCenter.y + pieRadius * Math.sin(startAngle);
    const x2 = pieCenter.x + pieRadius * Math.cos(endAngle);
    const y2 = pieCenter.y + pieRadius * Math.sin(endAngle);

    const midAngle = startAngle + angle / 2;
    const labelR = pieRadius * 0.65;
    const labelX = pieCenter.x + labelR * Math.cos(midAngle);
    const labelY = pieCenter.y + labelR * Math.sin(midAngle);

    return {
      ...comp,
      path: `M ${pieCenter.x} ${pieCenter.y} L ${x1} ${y1} A ${pieRadius} ${pieRadius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      labelX,
      labelY,
      pct: ((comp.ratio / (totalRatio || 1)) * 100).toFixed(1),
    };
  });

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pre-training Data Mixer</h1>
        <p className="text-sm text-white/40 mt-1">
          Configure data blend ratios with curriculum learning schedules
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Controls */}
        <div className="col-span-4 space-y-4">
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Total Training Tokens
            </h3>
            <Slider
              value={totalTokens / 1e12}
              onChange={(v) => {
                setTotalTokens(v * 1e12);
                updateDataMix({ totalTokens: v * 1e12 });
              }}
              min={0.1}
              max={10}
              step={0.1}
              formatValue={(v) => `${v}T tokens`}
            />
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Data Sources ({dataMix.components.length})
              </h3>
              {Math.abs(totalRatio - 1) > 0.01 && (
                <button
                  onClick={normalizeRatios}
                  className="text-[10px] text-yellow-400 hover:text-yellow-300"
                >
                  Normalize to 100%
                </button>
              )}
            </div>

            <div className="space-y-3">
              {dataMix.components.map((comp, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: comp.color }}
                    />
                    <span className="text-xs text-white/70 flex-1 truncate">{comp.name}</span>
                    <span className="text-[10px] font-mono text-white/40">
                      {(comp.ratio * 100).toFixed(1)}%
                    </span>
                    <button
                      onClick={() => removeDataComponent(i)}
                      className="text-white/20 hover:text-red-400 text-xs"
                    >
                      x
                    </button>
                  </div>
                  <Slider
                    value={comp.ratio}
                    onChange={(v) => updateComponentRatio(i, v)}
                    min={0}
                    max={1}
                    step={0.01}
                    color={comp.color}
                  />
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span>{formatNumber(comp.ratio * totalTokens)} tokens</span>
                    <span className="capitalize">Quality: {comp.quality}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="mt-4 pt-3 border-t border-white/10 flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New data source..."
                className="flex-1 !py-1.5"
              />
              <Button size="sm" onClick={handleAddComponent} disabled={!newName.trim()}>
                Add
              </Button>
            </div>
          </Card>

          {/* Summary */}
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Mix Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Total Ratio</span>
                <span className={`font-mono ${Math.abs(totalRatio - 1) > 0.01 ? "text-yellow-400" : "text-mamba"}`}>
                  {(totalRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Sources</span>
                <span className="font-mono text-white">{dataMix.components.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Total Tokens</span>
                <span className="font-mono text-white">{formatNumber(totalTokens)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">High Quality</span>
                <span className="font-mono text-white">
                  {(dataMix.components.filter((c) => c.quality === "high").reduce((s, c) => s + c.ratio, 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Visualization */}
        <div className="col-span-8 space-y-4">
          {/* Pie chart */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Data Blend Visualization</h3>
            <div className="flex items-center gap-8">
              <svg width={300} height={300} className="shrink-0">
                {pieSlices.map((slice, i) => (
                  <g key={i}>
                    <path
                      d={slice.path}
                      fill={slice.color}
                      stroke="rgba(0,0,0,0.3)"
                      strokeWidth="1"
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                    {Number(slice.pct) > 5 && (
                      <text
                        x={slice.labelX}
                        y={slice.labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {slice.pct}%
                      </text>
                    )}
                  </g>
                ))}
                {/* Center hole */}
                <circle cx={pieCenter.x} cy={pieCenter.y} r={40} fill="rgba(10,10,20,0.9)" />
                <text x={pieCenter.x} y={pieCenter.y - 6} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                  {formatNumber(totalTokens)}
                </text>
                <text x={pieCenter.x} y={pieCenter.y + 8} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
                  tokens
                </text>
              </svg>

              <div className="space-y-1.5 flex-1">
                {dataMix.components.map((comp, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: comp.color }} />
                    <span className="text-xs text-white/70 flex-1">{comp.name}</span>
                    <div className="text-right">
                      <div className="text-xs font-mono text-white/80">
                        {(comp.ratio / (totalRatio || 1) * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-white/30">
                        {formatNumber(comp.ratio * totalTokens)} tok
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Stacked bar */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-4">Blend Ratio Bar</h3>
            <div className="h-12 flex rounded-xl overflow-hidden mb-3">
              {dataMix.components.map((comp, i) => (
                <div
                  key={i}
                  className="h-full flex items-center justify-center text-[9px] font-bold text-white/80 transition-all duration-500 hover:opacity-80"
                  style={{
                    width: `${(comp.ratio / (totalRatio || 1)) * 100}%`,
                    backgroundColor: comp.color,
                    minWidth: comp.ratio > 0 ? "2px" : "0",
                  }}
                  title={`${comp.name}: ${(comp.ratio * 100).toFixed(1)}%`}
                >
                  {(comp.ratio / (totalRatio || 1)) > 0.08 ? comp.name.split(" ")[0] : ""}
                </div>
              ))}
            </div>
          </Card>

          {/* Curriculum Learning Schedule */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-white">Curriculum Learning Schedule</h3>
              <button
                onClick={() => setShowCurriculum(!showCurriculum)}
                className="text-xs text-chimera-400 hover:text-chimera-300"
              >
                {showCurriculum ? "Hide" : "Show"} Details
              </button>
            </div>

            {showCurriculum && (
              <div className="space-y-4">
                {dataMix.curriculumStages.map((stage, si) => (
                  <div key={si} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-chimera-600/30 flex items-center justify-center text-[10px] font-bold text-chimera-300">
                        {stage.stage}
                      </div>
                      <span className="text-xs text-white/70">
                        Stage {stage.stage}: Steps {formatNumber(stage.startStep)} - {formatNumber(stage.endStep)}
                      </span>
                    </div>

                    {/* Stage mix bar */}
                    <div className="h-6 flex rounded-lg overflow-hidden">
                      {Object.entries(stage.mixRatios).map(([name, ratio]) => {
                        const comp = dataMix.components.find((c) => c.name === name);
                        return (
                          <div
                            key={name}
                            className="h-full flex items-center justify-center text-[8px] font-bold text-white/70 transition-all duration-500"
                            style={{
                              width: `${ratio * 100}%`,
                              backgroundColor: comp?.color || "#6b7280",
                              minWidth: ratio > 0 ? "1px" : "0",
                            }}
                          >
                            {ratio > 0.1 ? `${(ratio * 100).toFixed(0)}%` : ""}
                          </div>
                        );
                      })}
                    </div>

                    {/* Stage description */}
                    <div className="text-[10px] text-white/30 pl-8">
                      {si === 0 && "Initial phase: Heavy web data, broad knowledge acquisition"}
                      {si === 1 && "Mid training: Increase code and academic data"}
                      {si === 2 && "Final phase: Balance toward high-quality sources"}
                    </div>
                  </div>
                ))}

                {/* Timeline visualization */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h4 className="text-xs text-white/40 mb-2">Training Timeline</h4>
                  <div className="relative h-8 bg-white/5 rounded-full overflow-hidden flex">
                    {dataMix.curriculumStages.map((stage, si) => {
                      const totalSteps = dataMix.curriculumStages[dataMix.curriculumStages.length - 1].endStep;
                      const width = ((stage.endStep - stage.startStep) / totalSteps) * 100;
                      const colors = ["#3b82f6", "#8b5cf6", "#10b981"];
                      return (
                        <div
                          key={si}
                          className="h-full flex items-center justify-center text-[9px] font-bold text-white/80"
                          style={{
                            width: `${width}%`,
                            backgroundColor: `${colors[si]}40`,
                            borderRight: si < 2 ? "1px solid rgba(255,255,255,0.2)" : "none",
                          }}
                        >
                          Stage {stage.stage}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-white/30">
                    <span>Step 0</span>
                    <span>Step {formatNumber(dataMix.curriculumStages[dataMix.curriculumStages.length - 1].endStep)}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Data quality overview */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Data Quality Breakdown</h3>
            <div className="grid grid-cols-3 gap-3">
              {(["high", "medium", "low"] as const).map((quality) => {
                const comps = dataMix.components.filter((c) => c.quality === quality);
                const totalRat = comps.reduce((s, c) => s + c.ratio, 0);
                const qColor = quality === "high" ? "#10b981" : quality === "medium" ? "#f59e0b" : "#ef4444";
                return (
                  <div key={quality} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: qColor }} />
                      <span className="text-xs text-white/60 capitalize">{quality} Quality</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {(totalRat / (totalRatio || 1) * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-white/30">
                      {comps.length} source{comps.length !== 1 ? "s" : ""} | {formatNumber(totalRat * totalTokens)} tok
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
