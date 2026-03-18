"use client";

import { LayerConfig, LAYER_COLORS, LAYER_DESCRIPTIONS } from "@/types/architecture";
import { formatNumber } from "@/lib/utils";
import { computeLayerParams } from "@/lib/compute";
import { cn } from "@/lib/utils";

interface LayerBlockProps {
  layer: LayerConfig;
  isSelected: boolean;
  index: number;
  onSelect: () => void;
  onRemove: () => void;
  isDragging?: boolean;
}

export default function LayerBlock({
  layer,
  isSelected,
  index,
  onSelect,
  onRemove,
  isDragging,
}: LayerBlockProps) {
  const color = LAYER_COLORS[layer.type];
  const paramCount = computeLayerParams(layer);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative group rounded-xl border p-4 transition-all duration-300 cursor-pointer",
        isSelected
          ? "bg-white/10 border-white/30 scale-[1.02]"
          : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20",
        isDragging && "opacity-50 scale-95"
      )}
      style={{
        boxShadow: isSelected ? `0 0 20px ${color}40, inset 0 0 20px ${color}10` : undefined,
      }}
    >
      {/* Layer index */}
      <div
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {index + 1}
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-400"
      >
        x
      </button>

      <div className="flex items-center gap-3">
        {/* Type indicator */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
          style={{ backgroundColor: `${color}30`, border: `1px solid ${color}50` }}
        >
          {layer.type === "transformer" && "TF"}
          {layer.type === "mamba" && "MB"}
          {layer.type === "ssm" && "S4"}
          {layer.type === "moe" && "MoE"}
          {layer.type === "feedforward" && "FF"}
          {layer.type === "normalization" && "LN"}
          {layer.type === "embedding" && "EM"}
          {layer.type === "output" && "OUT"}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{layer.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[10px] text-white/40">
              {formatNumber(paramCount)} params
            </span>
            <span className="text-[10px] text-white/40">
              d={layer.params.hiddenSize}
            </span>
            {layer.type === "transformer" && (
              <span className="text-[10px] text-white/40">
                h={layer.params.numHeads}
              </span>
            )}
            {layer.type === "moe" && (
              <span className="text-[10px] text-white/40">
                E={layer.params.numExperts} top-{layer.params.topK}
              </span>
            )}
            {(layer.type === "mamba" || layer.type === "ssm") && (
              <span className="text-[10px] text-white/40">
                state={layer.params.stateSize}
              </span>
            )}
          </div>
        </div>

        {/* Visual compute bar */}
        <div className="w-16 h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (paramCount / 1e8) * 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>

      {/* Connection line to next layer */}
      <div className="absolute left-1/2 -bottom-4 w-px h-4 bg-gradient-to-b from-white/20 to-transparent" />
    </div>
  );
}
