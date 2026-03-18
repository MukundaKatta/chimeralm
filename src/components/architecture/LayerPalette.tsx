"use client";

import { LayerType, LAYER_COLORS, LAYER_DESCRIPTIONS } from "@/types/architecture";
import { cn } from "@/lib/utils";

const layerTypes: { type: LayerType; label: string; shortLabel: string }[] = [
  { type: "embedding", label: "Embedding", shortLabel: "EM" },
  { type: "transformer", label: "Transformer", shortLabel: "TF" },
  { type: "mamba", label: "Mamba (SSM)", shortLabel: "MB" },
  { type: "ssm", label: "S4/S5 SSM", shortLabel: "S4" },
  { type: "moe", label: "Mixture of Experts", shortLabel: "MoE" },
  { type: "feedforward", label: "Feed-Forward", shortLabel: "FF" },
  { type: "normalization", label: "Normalization", shortLabel: "LN" },
  { type: "output", label: "Output Head", shortLabel: "OUT" },
];

interface LayerPaletteProps {
  onAddLayer: (type: LayerType) => void;
}

export default function LayerPalette({ onAddLayer }: LayerPaletteProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1">
        Layer Palette
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {layerTypes.map(({ type, label, shortLabel }) => {
          const color = LAYER_COLORS[type];
          return (
            <button
              key={type}
              onClick={() => onAddLayer(type)}
              className={cn(
                "group relative p-3 rounded-lg border border-white/10 bg-white/5",
                "hover:bg-white/10 hover:border-white/20 transition-all duration-200",
                "active:scale-95"
              )}
              title={LAYER_DESCRIPTIONS[type]}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: `${color}30`, border: `1px solid ${color}50` }}
                >
                  {shortLabel}
                </div>
                <div className="text-left">
                  <div className="text-xs font-medium text-white/80 leading-tight">{label}</div>
                  <div className="text-[9px] text-white/30 leading-tight mt-0.5 line-clamp-1">
                    {LAYER_DESCRIPTIONS[type]}
                  </div>
                </div>
              </div>

              {/* Hover glow */}
              <div
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ boxShadow: `inset 0 0 20px ${color}15` }}
              />
            </button>
          );
        })}
      </div>

      {/* Quick presets */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider px-1 mb-2">
          Quick Presets
        </h3>
        <div className="space-y-1.5">
          {[
            { name: "Jamba-style (T+M+MoE)", layers: ["embedding", "transformer", "mamba", "transformer", "moe", "mamba", "transformer", "output"] },
            { name: "Pure Transformer (7B)", layers: ["embedding", ...Array(32).fill("transformer"), "output"] },
            { name: "Pure Mamba", layers: ["embedding", ...Array(32).fill("mamba"), "output"] },
            { name: "StripedHyena", layers: ["embedding", "transformer", "ssm", "transformer", "ssm", "transformer", "ssm", "output"] },
            { name: "MoE Sparse (Mixtral)", layers: ["embedding", ...Array(8).fill("moe"), "output"] },
          ].map((preset) => (
            <button
              key={preset.name}
              onClick={() => preset.layers.forEach((t) => onAddLayer(t as LayerType))}
              className="w-full text-left px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
            >
              {preset.name}
              <span className="text-white/20 ml-1">({preset.layers.length}L)</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
