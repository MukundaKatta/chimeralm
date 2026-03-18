export type LayerType = "transformer" | "mamba" | "ssm" | "moe" | "feedforward" | "normalization" | "embedding" | "output";

export interface LayerConfig {
  id: string;
  type: LayerType;
  name: string;
  params: LayerParams;
  position: { x: number; y: number };
  connections: string[];
}

export interface LayerParams {
  hiddenSize: number;
  numHeads?: number;
  headDim?: number;
  intermediateSize?: number;
  numExperts?: number;
  topK?: number;
  stateSize?: number;
  convSize?: number;
  vocabSize?: number;
  maxSeqLen?: number;
  dropout?: number;
  activation?: string;
  normType?: "layernorm" | "rmsnorm";
}

export interface Architecture {
  id: string;
  name: string;
  description: string;
  layers: LayerConfig[];
  totalParams: number;
  estimatedFlops: number;
  estimatedMemory: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonResult {
  architectureId: string;
  name: string;
  totalParams: number;
  flops: number;
  memoryGB: number;
  throughputTokensPerSec: number;
  latencyMs: number;
  contextScaling: "linear" | "quadratic" | "sublinear";
  layerBreakdown: LayerProfile[];
}

export interface LayerProfile {
  layerId: string;
  layerType: LayerType;
  layerName: string;
  flops: number;
  memoryMB: number;
  percentOfTotal: number;
  paramCount: number;
}

export interface ContextAnalysis {
  seqLength: number;
  memoryGB: number;
  flopsPerToken: number;
  throughput: number;
  attentionPattern: "full" | "sparse" | "linear" | "recurrent";
}

export interface ScalingLawPrediction {
  computeBudgetFlops: number;
  optimalParams: number;
  optimalTokens: number;
  predictedLoss: number;
  confidence: number;
}

export interface DataMixConfig {
  id: string;
  name: string;
  components: DataComponent[];
  totalTokens: number;
  curriculumStages: CurriculumStage[];
}

export interface DataComponent {
  name: string;
  ratio: number;
  color: string;
  tokens: number;
  quality: "high" | "medium" | "low";
}

export interface CurriculumStage {
  stage: number;
  startStep: number;
  endStep: number;
  mixRatios: Record<string, number>;
}

export interface PaperAnnotation {
  id: string;
  paperId: string;
  userId: string;
  text: string;
  highlight: string;
  position: { page: number; x: number; y: number };
  createdAt: string;
  replies: PaperAnnotation[];
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  tags: string[];
  annotations: PaperAnnotation[];
}

export const LAYER_COLORS: Record<LayerType, string> = {
  transformer: "#f59e0b",
  mamba: "#10b981",
  ssm: "#f97316",
  moe: "#8b5cf6",
  feedforward: "#3b82f6",
  normalization: "#6b7280",
  embedding: "#ec4899",
  output: "#ef4444",
};

export const LAYER_DESCRIPTIONS: Record<LayerType, string> = {
  transformer: "Multi-head self-attention with O(n^2) scaling",
  mamba: "Selective state space model with linear scaling",
  ssm: "Structured state space model (S4/S5)",
  moe: "Mixture of Experts with sparse activation",
  feedforward: "Dense feed-forward network (MLP)",
  normalization: "Layer/RMS normalization",
  embedding: "Token + positional embedding",
  output: "Output projection + softmax",
};

export const DEFAULT_LAYER_PARAMS: Record<LayerType, LayerParams> = {
  transformer: { hiddenSize: 4096, numHeads: 32, headDim: 128, intermediateSize: 11008, dropout: 0.0 },
  mamba: { hiddenSize: 4096, stateSize: 16, convSize: 4, intermediateSize: 8192 },
  ssm: { hiddenSize: 4096, stateSize: 64, convSize: 4 },
  moe: { hiddenSize: 4096, numExperts: 8, topK: 2, intermediateSize: 11008 },
  feedforward: { hiddenSize: 4096, intermediateSize: 11008, activation: "silu" },
  normalization: { hiddenSize: 4096, normType: "rmsnorm" },
  embedding: { hiddenSize: 4096, vocabSize: 32000, maxSeqLen: 4096 },
  output: { hiddenSize: 4096, vocabSize: 32000 },
};
