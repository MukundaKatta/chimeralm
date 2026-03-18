"use client";

import { useState, useCallback } from "react";
import { useArchitectureStore } from "@/stores/architectureStore";
import { LayerType, LAYER_COLORS } from "@/types/architecture";
import { formatNumber, formatFlops, formatBytes } from "@/lib/utils";
import LayerBlock from "@/components/architecture/LayerBlock";
import LayerPalette from "@/components/architecture/LayerPalette";
import LayerEditor from "@/components/architecture/LayerEditor";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function ArchitectureBuilderPage() {
  const {
    currentArchitecture,
    selectedLayerId,
    savedArchitectures,
    createNewArchitecture,
    addLayer,
    removeLayer,
    updateLayer,
    selectLayer,
    saveArchitecture,
    loadArchitecture,
    deleteArchitecture,
    moveLayer,
  } = useArchitectureStore();

  const [archName, setArchName] = useState("My Hybrid Architecture");

  const selectedLayer = currentArchitecture?.layers.find(
    (l) => l.id === selectedLayerId
  );

  const handleAddLayer = useCallback(
    (type: LayerType) => {
      if (!currentArchitecture) {
        createNewArchitecture(archName);
        // Need a small delay for state to update
        setTimeout(() => addLayer(type), 10);
      } else {
        addLayer(type);
      }
    },
    [currentArchitecture, addLayer, createNewArchitecture, archName]
  );

  const handleMoveUp = (index: number) => {
    if (index === 0 || !currentArchitecture) return;
    const layer = currentArchitecture.layers[index];
    moveLayer(layer.id, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (!currentArchitecture || index >= currentArchitecture.layers.length - 1) return;
    const layer = currentArchitecture.layers[index];
    moveLayer(layer.id, index + 1);
  };

  // Count layer types
  const layerCounts = currentArchitecture?.layers.reduce(
    (acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Architecture Builder</h1>
        <p className="text-sm text-white/40 mt-1">
          Drag and drop layers to design custom hybrid architectures
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Layer Palette */}
        <div className="col-span-3">
          <Card>
            <LayerPalette onAddLayer={handleAddLayer} />
          </Card>

          {/* Saved architectures */}
          <Card className="mt-4">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Saved Architectures
            </h3>
            {savedArchitectures.length === 0 ? (
              <p className="text-xs text-white/30">No saved architectures yet</p>
            ) : (
              <div className="space-y-2">
                {savedArchitectures.map((arch) => (
                  <div
                    key={arch.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <button
                      onClick={() => loadArchitecture(arch.id)}
                      className="text-xs text-white/70 hover:text-white truncate flex-1 text-left"
                    >
                      {arch.name}
                      <span className="text-white/30 ml-1">
                        ({arch.layers.length}L)
                      </span>
                    </button>
                    <button
                      onClick={() => deleteArchitecture(arch.id)}
                      className="text-white/30 hover:text-red-400 text-xs ml-2"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Center: Architecture Canvas */}
        <div className="col-span-6">
          {/* Top bar */}
          <div className="flex items-center gap-3 mb-4">
            <input
              value={currentArchitecture?.name || archName}
              onChange={(e) => {
                setArchName(e.target.value);
                if (currentArchitecture) {
                  // Update in store
                }
              }}
              className="bg-transparent border-none text-lg font-semibold text-white focus:outline-none flex-1"
              placeholder="Architecture name..."
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!currentArchitecture) createNewArchitecture(archName);
              }}
            >
              New
            </Button>
            <Button
              size="sm"
              onClick={saveArchitecture}
              disabled={!currentArchitecture || currentArchitecture.layers.length === 0}
            >
              Save
            </Button>
          </div>

          {/* Stats summary */}
          {currentArchitecture && currentArchitecture.layers.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-[10px] text-white/40 mb-1">Total Params</div>
                <div className="text-lg font-black text-white">
                  {formatNumber(currentArchitecture.totalParams)}
                </div>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-[10px] text-white/40 mb-1">Est. FLOPs</div>
                <div className="text-lg font-black text-white">
                  {formatFlops(currentArchitecture.estimatedFlops)}
                </div>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-[10px] text-white/40 mb-1">Est. Memory</div>
                <div className="text-lg font-black text-white">
                  {formatBytes(currentArchitecture.estimatedMemory)}
                </div>
              </div>
              <div className="glass rounded-lg p-3 text-center">
                <div className="text-[10px] text-white/40 mb-1">Layers</div>
                <div className="text-lg font-black text-white">
                  {currentArchitecture.layers.length}
                </div>
              </div>
            </div>
          )}

          {/* Layer composition bar */}
          {currentArchitecture && currentArchitecture.layers.length > 0 && (
            <div className="mb-4">
              <div className="flex rounded-full overflow-hidden h-3 bg-white/5">
                {Object.entries(layerCounts).map(([type, count]) => (
                  <div
                    key={type}
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${(count / currentArchitecture.layers.length) * 100}%`,
                      backgroundColor: LAYER_COLORS[type as LayerType],
                    }}
                    title={`${type}: ${count} layers`}
                  />
                ))}
              </div>
              <div className="flex gap-3 mt-2">
                {Object.entries(layerCounts).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: LAYER_COLORS[type as LayerType] }}
                    />
                    <span className="text-[10px] text-white/40 capitalize">
                      {type} ({count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Architecture stack */}
          <Card className="min-h-[500px] grid-bg">
            {!currentArchitecture || currentArchitecture.layers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-white/30">
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <p className="text-sm">Click layers from the palette to start building</p>
                <p className="text-xs mt-1 text-white/20">Or select a preset to begin</p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {/* Input indicator */}
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Input Tokens</span>
                  <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                </div>

                {currentArchitecture.layers.map((layer, index) => (
                  <div key={layer.id} className="relative pl-6">
                    {/* Move buttons */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        className="text-white/20 hover:text-white/60 transition-colors"
                        disabled={index === 0}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        className="text-white/20 hover:text-white/60 transition-colors"
                        disabled={index === currentArchitecture.layers.length - 1}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                    </div>

                    <LayerBlock
                      layer={layer}
                      isSelected={selectedLayerId === layer.id}
                      index={index}
                      onSelect={() => selectLayer(layer.id)}
                      onRemove={() => removeLayer(layer.id)}
                    />
                  </div>
                ))}

                {/* Output indicator */}
                <div className="flex items-center justify-center gap-2 py-2">
                  <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider">Output Logits</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right: Layer Editor */}
        <div className="col-span-3">
          <Card>
            {selectedLayer ? (
              <LayerEditor
                layer={selectedLayer}
                onUpdate={(updates) => updateLayer(selectedLayer.id, updates)}
              />
            ) : (
              <div className="text-center py-12 text-white/30">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm">Select a layer to edit</p>
                <p className="text-xs mt-1 text-white/20">Click on any layer in the stack</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
