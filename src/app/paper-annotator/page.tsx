"use client";

import { useState } from "react";
import { useArchitectureStore } from "@/stores/architectureStore";
import { PaperAnnotation } from "@/types/architecture";
import { generateId } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function PaperAnnotatorPage() {
  const { papers, selectedPaperId, selectPaper, addAnnotation } = useArchitectureStore();
  const [newAnnotation, setNewAnnotation] = useState("");
  const [highlightText, setHighlightText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedPaper = papers.find((p) => p.id === selectedPaperId);

  const filteredPapers = papers.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddAnnotation = () => {
    if (!selectedPaperId || !newAnnotation.trim()) return;
    const annotation: PaperAnnotation = {
      id: generateId(),
      paperId: selectedPaperId,
      userId: "user-1",
      text: newAnnotation,
      highlight: highlightText,
      position: { page: 1, x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      replies: [],
    };
    addAnnotation(selectedPaperId, annotation);
    setNewAnnotation("");
    setHighlightText("");
  };

  const tagColors: Record<string, string> = {
    SSM: "#10b981",
    Mamba: "#10b981",
    Transformer: "#f59e0b",
    MoE: "#8b5cf6",
    hybrid: "#3b82f6",
    sparse: "#f97316",
    routing: "#ec4899",
    "linear-time": "#06b6d4",
    convolution: "#f97316",
    hyena: "#ef4444",
  };

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Research Paper Annotator</h1>
        <p className="text-sm text-white/40 mt-1">
          Highlight and discuss hybrid architecture research papers collaboratively
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Paper list */}
        <div className="col-span-4 space-y-4">
          <Card>
            <Input
              placeholder="Search papers or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-3"
            />

            <div className="space-y-2">
              {filteredPapers.map((paper) => (
                <button
                  key={paper.id}
                  onClick={() => selectPaper(paper.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedPaperId === paper.id
                      ? "bg-chimera-600/20 border border-chimera-500/30"
                      : "bg-white/5 hover:bg-white/10 border border-transparent"
                  }`}
                >
                  <div className="text-sm font-medium text-white leading-snug mb-1">
                    {paper.title}
                  </div>
                  <div className="text-[10px] text-white/40 mb-2">
                    {paper.authors.join(", ")}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {paper.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                        style={{
                          backgroundColor: `${tagColors[tag] || "#6b7280"}20`,
                          color: tagColors[tag] || "#9ca3af",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {paper.annotations.length > 0 && (
                    <div className="text-[10px] text-chimera-400 mt-1.5">
                      {paper.annotations.length} annotation{paper.annotations.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Paper detail + annotations */}
        <div className="col-span-8 space-y-4">
          {selectedPaper ? (
            <>
              {/* Paper header */}
              <Card variant="glow">
                <h2 className="text-lg font-semibold text-white mb-2">{selectedPaper.title}</h2>
                <div className="text-xs text-white/50 mb-3">
                  {selectedPaper.authors.join(", ")}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selectedPaper.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: `${tagColors[tag] || "#6b7280"}20`,
                        color: tagColors[tag] || "#9ca3af",
                        border: `1px solid ${tagColors[tag] || "#6b7280"}40`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="bg-white/5 rounded-lg p-4 text-sm text-white/70 leading-relaxed mb-3">
                  <span className="text-xs text-white/30 uppercase block mb-2">Abstract</span>
                  {selectedPaper.abstract}
                </div>

                <a
                  href={selectedPaper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-chimera-400 hover:text-chimera-300 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  View on arXiv
                </a>
              </Card>

              {/* Simulated paper content with highlightable sections */}
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">Key Findings</h3>
                <div className="space-y-3">
                  {selectedPaper.id === "mamba" && (
                    <>
                      <HighlightableSection
                        text="Mamba achieves 5x higher throughput than Transformers at inference time while maintaining competitive performance on language modeling benchmarks."
                        onHighlight={setHighlightText}
                      />
                      <HighlightableSection
                        text="The selective scan mechanism allows the model to filter irrelevant information from the context, achieving input-dependent dynamics similar to attention but with linear complexity."
                        onHighlight={setHighlightText}
                      />
                      <HighlightableSection
                        text="State dimension of 16 provides a good balance between expressiveness and computational efficiency. Increasing beyond 64 shows diminishing returns."
                        onHighlight={setHighlightText}
                      />
                    </>
                  )}
                  {selectedPaper.id === "jamba" && (
                    <>
                      <HighlightableSection
                        text="Jamba interleaves Transformer and Mamba layers with occasional MoE layers, achieving strong performance with 256K context length while fitting in a single 80GB GPU."
                        onHighlight={setHighlightText}
                      />
                      <HighlightableSection
                        text="The hybrid architecture achieves 3x throughput of a pure Transformer at 256K context with only marginal quality loss."
                        onHighlight={setHighlightText}
                      />
                      <HighlightableSection
                        text="Ratio of 1:7 Transformer-to-Mamba layers was found optimal for maintaining recall abilities while maximizing efficiency."
                        onHighlight={setHighlightText}
                      />
                    </>
                  )}
                  {selectedPaper.id === "mixtral" && (
                    <>
                      <HighlightableSection
                        text="Mixtral 8x7B matches or exceeds Llama 2 70B on most benchmarks while using only 13B active parameters per token."
                        onHighlight={setHighlightText}
                      />
                      <HighlightableSection
                        text="Top-2 routing with load balancing loss achieves good expert utilization without significant computational overhead."
                        onHighlight={setHighlightText}
                      />
                    </>
                  )}
                  {selectedPaper.id === "striped-hyena" && (
                    <>
                      <HighlightableSection
                        text="StripedHyena alternates between gated convolutions and attention, achieving 50% memory reduction compared to pure Transformers at 128K context length."
                        onHighlight={setHighlightText}
                      />
                      <HighlightableSection
                        text="Hybrid signal processing approach handles both local and global patterns effectively with improved hardware utilization."
                        onHighlight={setHighlightText}
                      />
                    </>
                  )}
                </div>
              </Card>

              {/* Annotations */}
              <Card>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Annotations ({selectedPaper.annotations.length})
                </h3>

                {selectedPaper.annotations.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {selectedPaper.annotations.map((ann) => (
                      <div key={ann.id} className="bg-white/5 rounded-lg p-3 border-l-2 border-chimera-500">
                        {ann.highlight && (
                          <div className="text-xs text-yellow-400/80 italic mb-1.5 bg-yellow-500/10 rounded px-2 py-1">
                            &quot;{ann.highlight}&quot;
                          </div>
                        )}
                        <div className="text-sm text-white/80">{ann.text}</div>
                        <div className="text-[10px] text-white/30 mt-1.5">
                          {new Date(ann.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/30 mb-4">No annotations yet. Be the first to comment.</p>
                )}

                {/* Add annotation */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  {highlightText && (
                    <div className="text-xs bg-yellow-500/10 text-yellow-400/80 rounded-lg p-2 italic">
                      Highlighting: &quot;{highlightText}&quot;
                      <button
                        onClick={() => setHighlightText("")}
                        className="ml-2 text-white/40 hover:text-white/60"
                      >
                        (clear)
                      </button>
                    </div>
                  )}
                  <textarea
                    value={newAnnotation}
                    onChange={(e) => setNewAnnotation(e.target.value)}
                    placeholder="Add your annotation or discussion..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-chimera-500/50 h-20 resize-none"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleAddAnnotation} disabled={!newAnnotation.trim()}>
                      Add Annotation
                    </Button>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="flex items-center justify-center h-96">
              <div className="text-center text-white/30">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <p className="text-sm">Select a paper to read and annotate</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function HighlightableSection({
  text,
  onHighlight,
}: {
  text: string;
  onHighlight: (text: string) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`p-3 rounded-lg text-sm text-white/70 leading-relaxed transition-all cursor-pointer ${
        isHovered ? "bg-yellow-500/10 text-white/90" : "bg-white/5 hover:bg-white/8"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onHighlight(text)}
      title="Click to highlight and annotate"
    >
      {text}
      {isHovered && (
        <span className="text-[10px] text-yellow-400/60 block mt-1">
          Click to highlight for annotation
        </span>
      )}
    </div>
  );
}
