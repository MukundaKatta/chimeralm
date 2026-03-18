"use client";

import { LayerConfig, LAYER_COLORS } from "@/types/architecture";
import { computeLayerParams, computeLayerFlops, computeLayerMemory } from "@/lib/compute";
import { formatNumber, formatFlops, formatBytes } from "@/lib/utils";
import Slider from "@/components/ui/Slider";
import Input from "@/components/ui/Input";

interface LayerEditorProps {
  layer: LayerConfig;
  onUpdate: (updates: Partial<LayerConfig>) => void;
}

export default function LayerEditor({ layer, onUpdate }: LayerEditorProps) {
  const color = LAYER_COLORS[layer.type];
  const params = computeLayerParams(layer);
  const flops = computeLayerFlops(layer, 2048);
  const memory = computeLayerMemory(layer, 2048);

  const updateParam = (key: string, value: number | string) => {
    onUpdate({ params: { ...layer.params, [key]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}30`, border: `1px solid ${color}60` }}
        >
          <span className="text-white text-xs font-bold">
            {layer.type.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <Input
            value={layer.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="!bg-transparent !border-none !p-0 font-semibold text-white"
          />
          <div className="text-[10px] text-white/40 capitalize">{layer.type} layer</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-[10px] text-white/40">Params</div>
          <div className="text-sm font-bold text-white">{formatNumber(params)}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-[10px] text-white/40">FLOPs</div>
          <div className="text-sm font-bold text-white">{formatFlops(flops)}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-2 text-center">
          <div className="text-[10px] text-white/40">Memory</div>
          <div className="text-sm font-bold text-white">{formatBytes(memory)}</div>
        </div>
      </div>

      {/* Common params */}
      <Slider
        label="Hidden Size"
        value={layer.params.hiddenSize}
        onChange={(v) => updateParam("hiddenSize", v)}
        min={256}
        max={16384}
        step={256}
        formatValue={(v) => v.toString()}
        color={color}
      />

      {/* Type-specific params */}
      {layer.type === "transformer" && (
        <>
          <Slider
            label="Num Heads"
            value={layer.params.numHeads || 32}
            onChange={(v) => updateParam("numHeads", v)}
            min={1}
            max={128}
            step={1}
            color={color}
          />
          <Slider
            label="Head Dim"
            value={layer.params.headDim || 128}
            onChange={(v) => updateParam("headDim", v)}
            min={32}
            max={256}
            step={32}
            color={color}
          />
          <Slider
            label="Intermediate Size"
            value={layer.params.intermediateSize || 11008}
            onChange={(v) => updateParam("intermediateSize", v)}
            min={1024}
            max={32768}
            step={512}
            formatValue={formatNumber}
            color={color}
          />
        </>
      )}

      {(layer.type === "mamba" || layer.type === "ssm") && (
        <>
          <Slider
            label="State Size"
            value={layer.params.stateSize || 16}
            onChange={(v) => updateParam("stateSize", v)}
            min={4}
            max={128}
            step={4}
            color={color}
          />
          <Slider
            label="Conv Size"
            value={layer.params.convSize || 4}
            onChange={(v) => updateParam("convSize", v)}
            min={2}
            max={16}
            step={1}
            color={color}
          />
          <Slider
            label="Intermediate Size"
            value={layer.params.intermediateSize || 8192}
            onChange={(v) => updateParam("intermediateSize", v)}
            min={1024}
            max={32768}
            step={512}
            formatValue={formatNumber}
            color={color}
          />
        </>
      )}

      {layer.type === "moe" && (
        <>
          <Slider
            label="Num Experts"
            value={layer.params.numExperts || 8}
            onChange={(v) => updateParam("numExperts", v)}
            min={2}
            max={64}
            step={1}
            color={color}
          />
          <Slider
            label="Top-K"
            value={layer.params.topK || 2}
            onChange={(v) => updateParam("topK", v)}
            min={1}
            max={8}
            step={1}
            color={color}
          />
          <Slider
            label="Expert Intermediate Size"
            value={layer.params.intermediateSize || 11008}
            onChange={(v) => updateParam("intermediateSize", v)}
            min={1024}
            max={32768}
            step={512}
            formatValue={formatNumber}
            color={color}
          />
        </>
      )}

      {layer.type === "feedforward" && (
        <Slider
          label="Intermediate Size"
          value={layer.params.intermediateSize || 11008}
          onChange={(v) => updateParam("intermediateSize", v)}
          min={1024}
          max={32768}
          step={512}
          formatValue={formatNumber}
          color={color}
        />
      )}

      {(layer.type === "embedding" || layer.type === "output") && (
        <Slider
          label="Vocab Size"
          value={layer.params.vocabSize || 32000}
          onChange={(v) => updateParam("vocabSize", v)}
          min={1000}
          max={256000}
          step={1000}
          formatValue={formatNumber}
          color={color}
        />
      )}
    </div>
  );
}
