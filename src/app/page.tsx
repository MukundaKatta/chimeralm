"use client";

import Link from "next/link";
import { useArchitectureStore } from "@/stores/architectureStore";
import { formatNumber, formatFlops } from "@/lib/utils";

const features = [
  {
    title: "Architecture Builder",
    description: "Drag-and-drop Transformer, Mamba, SSM, and MoE layers to design custom hybrid architectures",
    href: "/architecture-builder",
    gradient: "from-transformer to-amber-600",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "Comparison Simulator",
    description: "Estimate FLOPs, memory, and throughput side-by-side for different architecture designs",
    href: "/comparison-simulator",
    gradient: "from-blue-500 to-blue-700",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: "Context Length Analyzer",
    description: "Visualize how different architectures handle long sequences with memory scaling curves",
    href: "/context-analyzer",
    gradient: "from-mamba to-emerald-700",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
      </svg>
    ),
  },
  {
    title: "Layer-by-Layer Profiler",
    description: "Visualize compute and memory allocation per layer with interactive breakdown charts",
    href: "/layer-profiler",
    gradient: "from-cyan-500 to-cyan-700",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25" />
      </svg>
    ),
  },
  {
    title: "Paper Annotator",
    description: "Highlight and discuss hybrid architecture research papers collaboratively",
    href: "/paper-annotator",
    gradient: "from-moe to-purple-800",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "Efficiency Calculator",
    description: "Compare parameters vs. effective compute for hybrid vs. pure Transformer architectures",
    href: "/efficiency-calculator",
    gradient: "from-pink-500 to-pink-700",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5z" />
      </svg>
    ),
  },
  {
    title: "Inference Visualizer",
    description: "Animate data flow through the architecture to understand inference pipeline behavior",
    href: "/inference-visualizer",
    gradient: "from-orange-500 to-red-600",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25" />
      </svg>
    ),
  },
  {
    title: "Data Mixer",
    description: "Configure data blend ratios with curriculum learning schedules for pre-training",
    href: "/data-mixer",
    gradient: "from-teal-500 to-teal-700",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5" />
      </svg>
    ),
  },
  {
    title: "Loss Predictor",
    description: "Use scaling laws to predict final training loss given compute budget and model size",
    href: "/loss-predictor",
    gradient: "from-rose-500 to-rose-700",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const { savedArchitectures } = useArchitectureStore();

  return (
    <div className="min-h-screen p-8">
      {/* Hero */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-transformer via-mamba to-moe flex items-center justify-center animated-border">
            <span className="text-2xl font-black text-white">CL</span>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">
              Chimera<span className="text-gradient">LM</span>
            </h1>
            <p className="text-white/50 text-sm">Hybrid Architecture Experimentation Platform</p>
          </div>
        </div>
        <p className="text-white/60 max-w-2xl text-lg leading-relaxed">
          Design and analyze hybrid neural network architectures combining Transformers, Mamba/SSM,
          and Mixture of Experts. Experiment with novel layer combinations, predict performance,
          and explore the frontier of efficient LLM architectures.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Saved Architectures", value: savedArchitectures.length.toString(), color: "text-transformer" },
          { label: "Layer Types", value: "8", color: "text-mamba" },
          { label: "Presets Available", value: "5", color: "text-moe" },
          { label: "Research Papers", value: "4", color: "text-chimera-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass-card flex items-center gap-4">
            <span className={`text-3xl font-black ${stat.color}`}>{stat.value}</span>
            <span className="text-sm text-white/50">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((feature) => (
          <Link
            key={feature.href}
            href={feature.href}
            className="group glass-hover p-6 block"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform duration-300`}>
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-chimera-300 transition-colors">
              {feature.title}
            </h3>
            <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors leading-relaxed">
              {feature.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Architecture Diagram Preview */}
      <div className="mt-12 glass-card overflow-hidden">
        <h2 className="text-lg font-semibold text-white mb-4">Hybrid Architecture Concept</h2>
        <div className="relative h-48 grid-bg rounded-lg overflow-hidden flex items-center justify-center gap-3">
          {/* Animated architecture blocks */}
          {[
            { label: "Embed", color: "bg-pink-500/80", delay: "0s" },
            { label: "Transformer", color: "bg-transformer/80", delay: "0.1s" },
            { label: "Mamba", color: "bg-mamba/80", delay: "0.2s" },
            { label: "Transformer", color: "bg-transformer/80", delay: "0.3s" },
            { label: "MoE", color: "bg-moe/80", delay: "0.4s" },
            { label: "Mamba", color: "bg-mamba/80", delay: "0.5s" },
            { label: "Transformer", color: "bg-transformer/80", delay: "0.6s" },
            { label: "Output", color: "bg-red-500/80", delay: "0.7s" },
          ].map((block, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={`${block.color} w-20 h-20 rounded-xl flex items-center justify-center text-white text-xs font-bold animate-flow backdrop-blur-sm border border-white/20`}
                style={{ animationDelay: block.delay }}
              >
                {block.label}
              </div>
              {i < 7 && (
                <svg className="absolute" style={{ left: `${12 + i * 12.5}%`, top: "50%", width: "30px", height: "2px" }}>
                  <line x1="0" y1="1" x2="30" y2="1" stroke="rgba(255,255,255,0.3)" strokeWidth="2" className="flow-line" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
