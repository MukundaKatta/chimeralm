"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { LayerType, LAYER_COLORS, DEFAULT_LAYER_PARAMS } from "@/types/architecture";
import { generateId } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface PipelineNode {
  id: string;
  type: LayerType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DataPacket {
  id: string;
  progress: number; // 0-1 along the path
  currentNode: number;
  speed: number;
  color: string;
}

const PIPELINE_CONFIGS = {
  "Jamba Hybrid": [
    { type: "embedding" as LayerType, label: "Embed" },
    { type: "transformer" as LayerType, label: "Attention" },
    { type: "normalization" as LayerType, label: "RMSNorm" },
    { type: "mamba" as LayerType, label: "Mamba SSM" },
    { type: "normalization" as LayerType, label: "RMSNorm" },
    { type: "transformer" as LayerType, label: "Attention" },
    { type: "normalization" as LayerType, label: "RMSNorm" },
    { type: "moe" as LayerType, label: "MoE (8 Exp)" },
    { type: "normalization" as LayerType, label: "RMSNorm" },
    { type: "mamba" as LayerType, label: "Mamba SSM" },
    { type: "output" as LayerType, label: "Output" },
  ],
  "Pure Transformer": [
    { type: "embedding" as LayerType, label: "Embed" },
    { type: "transformer" as LayerType, label: "Attn + FFN" },
    { type: "normalization" as LayerType, label: "LayerNorm" },
    { type: "transformer" as LayerType, label: "Attn + FFN" },
    { type: "normalization" as LayerType, label: "LayerNorm" },
    { type: "transformer" as LayerType, label: "Attn + FFN" },
    { type: "normalization" as LayerType, label: "LayerNorm" },
    { type: "transformer" as LayerType, label: "Attn + FFN" },
    { type: "output" as LayerType, label: "Output" },
  ],
  "Mamba Pipeline": [
    { type: "embedding" as LayerType, label: "Embed" },
    { type: "mamba" as LayerType, label: "Mamba" },
    { type: "normalization" as LayerType, label: "Norm" },
    { type: "mamba" as LayerType, label: "Mamba" },
    { type: "normalization" as LayerType, label: "Norm" },
    { type: "mamba" as LayerType, label: "Mamba" },
    { type: "normalization" as LayerType, label: "Norm" },
    { type: "mamba" as LayerType, label: "Mamba" },
    { type: "output" as LayerType, label: "Output" },
  ],
};

export default function InferenceVisualizerPage() {
  const [pipeline, setPipeline] = useState<keyof typeof PIPELINE_CONFIGS>("Jamba Hybrid");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [packets, setPackets] = useState<DataPacket[]>([]);
  const [activeNode, setActiveNode] = useState(-1);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const config = PIPELINE_CONFIGS[pipeline];
  const nodeWidth = 120;
  const nodeHeight = 60;
  const nodeGap = 20;
  const startX = 60;
  const startY = 80;

  const nodes: PipelineNode[] = config.map((c, i) => ({
    id: `node-${i}`,
    type: c.type,
    label: c.label,
    x: startX,
    y: startY + i * (nodeHeight + nodeGap),
    width: nodeWidth,
    height: nodeHeight,
  }));

  const totalHeight = nodes.length * (nodeHeight + nodeGap) + startY + 40;

  const spawnPacket = useCallback(() => {
    const colors = ["#5c7cfa", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];
    setPackets((prev) => [
      ...prev,
      {
        id: generateId(),
        progress: 0,
        currentNode: 0,
        speed: 0.3 + Math.random() * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
      },
    ]);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    const spawnInterval = setInterval(spawnPacket, 1200 / speed);
    return () => clearInterval(spawnInterval);
  }, [isPlaying, speed, spawnPacket]);

  useEffect(() => {
    if (!isPlaying && packets.length === 0) return;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setPackets((prev) => {
        const updated = prev
          .map((p) => {
            const newProgress = p.progress + dt * p.speed * speed;
            const newNode = Math.min(Math.floor(newProgress), nodes.length - 1);
            return { ...p, progress: newProgress, currentNode: newNode };
          })
          .filter((p) => p.progress < nodes.length);
        return updated;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, speed, nodes.length, packets.length]);

  // Update active node based on most advanced packet
  useEffect(() => {
    if (packets.length > 0) {
      const maxNode = Math.max(...packets.map((p) => p.currentNode));
      setActiveNode(maxNode);
    } else {
      setActiveNode(-1);
    }
  }, [packets]);

  const getPacketPosition = (packet: DataPacket) => {
    const nodeIdx = Math.floor(packet.progress);
    const frac = packet.progress - nodeIdx;
    if (nodeIdx >= nodes.length - 1) {
      const node = nodes[nodes.length - 1];
      return { x: node.x + node.width + 30, y: node.y + node.height / 2 };
    }
    const from = nodes[nodeIdx];
    const to = nodes[nodeIdx + 1];
    return {
      x: from.x + from.width + 30 + (Math.sin(frac * Math.PI) * 20),
      y: from.y + from.height / 2 + (to.y - from.y) * frac,
    };
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Inference Pipeline Visualizer</h1>
        <p className="text-sm text-white/40 mt-1">
          Animate data flow through the architecture to understand inference behavior
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Controls */}
        <div className="col-span-3 space-y-4">
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Pipeline
            </h3>
            {Object.keys(PIPELINE_CONFIGS).map((name) => (
              <button
                key={name}
                onClick={() => {
                  setPipeline(name as keyof typeof PIPELINE_CONFIGS);
                  setPackets([]);
                  setActiveNode(-1);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-all ${
                  pipeline === name
                    ? "bg-chimera-600/20 text-chimera-300 border border-chimera-500/30"
                    : "text-white/50 hover:bg-white/5"
                }`}
              >
                {name}
              </button>
            ))}
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Controls
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={isPlaying ? "danger" : "primary"}
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-1"
                >
                  {isPlaying ? "Stop" : "Start"} Flow
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={spawnPacket}
                >
                  +1
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setPackets([]); setActiveNode(-1); }}
                className="w-full"
              >
                Clear All
              </Button>

              <div>
                <label className="text-xs text-white/40 block mb-1">Speed</label>
                <div className="flex gap-1">
                  {[0.5, 1, 2, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`flex-1 px-2 py-1 rounded text-[10px] transition-all ${
                        speed === s
                          ? "bg-chimera-600/30 text-chimera-300"
                          : "bg-white/5 text-white/40 hover:bg-white/10"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Pipeline Stats
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Active Packets</span>
                <span className="font-mono text-white">{packets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Pipeline Depth</span>
                <span className="font-mono text-white">{config.length} stages</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Current Stage</span>
                <span className="font-mono text-white">
                  {activeNode >= 0 ? config[activeNode]?.label : "Idle"}
                </span>
              </div>
            </div>
          </Card>

          {/* Layer type info for active node */}
          {activeNode >= 0 && (
            <Card className="animated-border">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: `${LAYER_COLORS[config[activeNode].type]}40` }}
                >
                  {config[activeNode].type.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-white">{config[activeNode].label}</span>
              </div>
              <div className="text-[10px] text-white/50 space-y-1">
                {config[activeNode].type === "transformer" && (
                  <>
                    <p>Computing Q, K, V projections...</p>
                    <p>Multi-head attention (O(n^2))</p>
                    <p>Feed-forward network</p>
                  </>
                )}
                {config[activeNode].type === "mamba" && (
                  <>
                    <p>Selective scan (linear time)</p>
                    <p>State space recurrence</p>
                    <p>Output gating</p>
                  </>
                )}
                {config[activeNode].type === "moe" && (
                  <>
                    <p>Router selecting top-K experts</p>
                    <p>Parallel expert computation</p>
                    <p>Weighted output combination</p>
                  </>
                )}
                {config[activeNode].type === "embedding" && <p>Token + position encoding</p>}
                {config[activeNode].type === "normalization" && <p>RMS normalization</p>}
                {config[activeNode].type === "output" && <p>Projection to vocab + softmax</p>}
              </div>
            </Card>
          )}
        </div>

        {/* Visualization */}
        <div className="col-span-9">
          <Card className="overflow-hidden">
            <div className="relative grid-bg" style={{ minHeight: `${totalHeight}px` }}>
              <svg
                width="100%"
                height={totalHeight}
                className="absolute inset-0"
              >
                {/* Connection lines */}
                {nodes.slice(0, -1).map((node, i) => {
                  const next = nodes[i + 1];
                  const isActive = i === activeNode || i + 1 === activeNode;
                  return (
                    <g key={`conn-${i}`}>
                      <line
                        x1={node.x + node.width / 2}
                        y1={node.y + node.height}
                        x2={next.x + next.width / 2}
                        y2={next.y}
                        stroke={isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}
                        strokeWidth={isActive ? 2 : 1}
                        strokeDasharray={isActive ? "none" : "4 4"}
                      />
                      {/* Arrow */}
                      <polygon
                        points={`${next.x + next.width / 2 - 4},${next.y - 2} ${next.x + next.width / 2 + 4},${next.y - 2} ${next.x + next.width / 2},${next.y + 2}`}
                        fill={isActive ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)"}
                      />
                    </g>
                  );
                })}

                {/* Data flow animation lines */}
                {nodes.slice(0, -1).map((node, i) => {
                  const next = nodes[i + 1];
                  const hasPacketHere = packets.some((p) => Math.floor(p.progress) === i);
                  if (!hasPacketHere) return null;
                  return (
                    <line
                      key={`flow-${i}`}
                      x1={node.x + node.width / 2}
                      y1={node.y + node.height}
                      x2={next.x + next.width / 2}
                      y2={next.y}
                      stroke="rgba(92,124,250,0.4)"
                      strokeWidth="3"
                      className="flow-line"
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {nodes.map((node, i) => {
                const color = LAYER_COLORS[node.type];
                const isActive = i === activeNode;
                const hasPacket = packets.some((p) => Math.floor(p.progress) === i);

                return (
                  <div
                    key={node.id}
                    className={`absolute rounded-xl border-2 flex items-center gap-3 px-4 transition-all duration-300 ${
                      isActive ? "scale-105" : ""
                    } ${hasPacket ? "node-active" : ""}`}
                    style={{
                      left: node.x,
                      top: node.y,
                      width: node.width,
                      height: node.height,
                      backgroundColor: `${color}15`,
                      borderColor: isActive ? `${color}80` : `${color}30`,
                      boxShadow: isActive
                        ? `0 0 25px ${color}40, inset 0 0 15px ${color}10`
                        : "none",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: `${color}40` }}
                    >
                      {node.type.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">{node.label}</div>
                      <div className="text-[9px] text-white/40">Stage {i + 1}</div>
                    </div>

                    {/* Processing indicator */}
                    {hasPacket && (
                      <div className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-green-500 animate-ping" />
                    )}
                  </div>
                );
              })}

              {/* Data packets */}
              {packets.map((packet) => {
                const pos = getPacketPosition(packet);
                return (
                  <div
                    key={packet.id}
                    className="absolute w-4 h-4 rounded-full transition-none"
                    style={{
                      left: pos.x - 8,
                      top: pos.y - 8,
                      backgroundColor: packet.color,
                      boxShadow: `0 0 12px ${packet.color}80`,
                    }}
                  />
                );
              })}

              {/* Input label */}
              <div className="absolute flex items-center gap-2" style={{ left: startX, top: 20 }}>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-white/50 uppercase tracking-wider">Input Tokens</span>
              </div>

              {/* Output label */}
              <div
                className="absolute flex items-center gap-2"
                style={{ left: startX, top: totalHeight - 30 }}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] text-white/50 uppercase tracking-wider">Output Logits</span>
              </div>

              {/* Timing annotations on right side */}
              <div className="absolute right-8 top-20 space-y-3">
                {[
                  { label: "Embed", time: "0.1ms", color: LAYER_COLORS.embedding },
                  { label: "Attention", time: "2.4ms", color: LAYER_COLORS.transformer },
                  { label: "SSM Scan", time: "0.8ms", color: LAYER_COLORS.mamba },
                  { label: "MoE Route", time: "1.2ms", color: LAYER_COLORS.moe },
                  { label: "Output", time: "0.5ms", color: LAYER_COLORS.output },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-white/40">{item.label}</span>
                    <span className="text-[10px] font-mono text-white/60">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
