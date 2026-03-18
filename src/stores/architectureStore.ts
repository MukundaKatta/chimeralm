import { create } from "zustand";
import {
  Architecture,
  LayerConfig,
  LayerType,
  DEFAULT_LAYER_PARAMS,
  DataMixConfig,
  DataComponent,
  CurriculumStage,
  ResearchPaper,
  PaperAnnotation,
} from "@/types/architecture";
import { generateId } from "@/lib/utils";
import { computeLayerParams, computeLayerFlops, computeLayerMemory } from "@/lib/compute";

interface ArchitectureState {
  // Architecture builder
  currentArchitecture: Architecture | null;
  savedArchitectures: Architecture[];
  selectedLayerId: string | null;
  isDragging: boolean;

  // Data mixer
  dataMix: DataMixConfig;

  // Papers
  papers: ResearchPaper[];
  selectedPaperId: string | null;

  // Actions
  createNewArchitecture: (name: string) => void;
  addLayer: (type: LayerType) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<LayerConfig>) => void;
  moveLayer: (layerId: string, newIndex: number) => void;
  selectLayer: (layerId: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  saveArchitecture: () => void;
  loadArchitecture: (id: string) => void;
  duplicateArchitecture: (id: string) => void;
  deleteArchitecture: (id: string) => void;
  recalculateTotals: () => void;

  // Data mixer actions
  updateDataMix: (updates: Partial<DataMixConfig>) => void;
  addDataComponent: (component: DataComponent) => void;
  removeDataComponent: (index: number) => void;
  updateComponentRatio: (index: number, ratio: number) => void;
  addCurriculumStage: (stage: CurriculumStage) => void;

  // Paper actions
  addPaper: (paper: ResearchPaper) => void;
  selectPaper: (paperId: string | null) => void;
  addAnnotation: (paperId: string, annotation: PaperAnnotation) => void;
}

const DEFAULT_DATA_MIX: DataMixConfig = {
  id: generateId(),
  name: "Default Mix",
  totalTokens: 1e12,
  components: [
    { name: "Web (Common Crawl)", ratio: 0.45, color: "#3b82f6", tokens: 4.5e11, quality: "medium" },
    { name: "Books", ratio: 0.15, color: "#10b981", tokens: 1.5e11, quality: "high" },
    { name: "Wikipedia", ratio: 0.05, color: "#f59e0b", tokens: 5e10, quality: "high" },
    { name: "Code (GitHub)", ratio: 0.15, color: "#8b5cf6", tokens: 1.5e11, quality: "medium" },
    { name: "Academic Papers", ratio: 0.10, color: "#ef4444", tokens: 1e11, quality: "high" },
    { name: "Conversations", ratio: 0.10, color: "#ec4899", tokens: 1e11, quality: "low" },
  ],
  curriculumStages: [
    {
      stage: 1,
      startStep: 0,
      endStep: 50000,
      mixRatios: { "Web (Common Crawl)": 0.6, Books: 0.1, Wikipedia: 0.05, "Code (GitHub)": 0.1, "Academic Papers": 0.05, Conversations: 0.1 },
    },
    {
      stage: 2,
      startStep: 50000,
      endStep: 150000,
      mixRatios: { "Web (Common Crawl)": 0.4, Books: 0.15, Wikipedia: 0.05, "Code (GitHub)": 0.2, "Academic Papers": 0.1, Conversations: 0.1 },
    },
    {
      stage: 3,
      startStep: 150000,
      endStep: 300000,
      mixRatios: { "Web (Common Crawl)": 0.3, Books: 0.2, Wikipedia: 0.05, "Code (GitHub)": 0.15, "Academic Papers": 0.15, Conversations: 0.15 },
    },
  ],
};

const SAMPLE_PAPERS: ResearchPaper[] = [
  {
    id: "mamba",
    title: "Mamba: Linear-Time Sequence Modeling with Selective State Spaces",
    authors: ["Albert Gu", "Tri Dao"],
    abstract: "Foundation models for sequences (language, audio, genomics) are almost universally based on the Transformer and its core attention module. We identify key limitations of Transformers including their inability to model anything outside of a finite window and quadratic scaling.",
    url: "https://arxiv.org/abs/2312.00752",
    tags: ["SSM", "Mamba", "linear-time"],
    annotations: [],
  },
  {
    id: "jamba",
    title: "Jamba: A Hybrid Transformer-Mamba Language Model",
    authors: ["Opher Lieber", "Barak Lenz", "et al."],
    abstract: "We present Jamba, a large language model based on a novel hybrid Transformer-Mamba mixture of experts architecture. Jamba provides high throughput and small memory footprint.",
    url: "https://arxiv.org/abs/2403.19887",
    tags: ["hybrid", "Transformer", "Mamba", "MoE"],
    annotations: [],
  },
  {
    id: "mixtral",
    title: "Mixtral of Experts",
    authors: ["Mistral AI"],
    abstract: "We introduce Mixtral 8x7B, a Sparse Mixture of Experts language model. Mixtral uses 8 expert networks with top-2 routing, achieving strong performance while using only 2 experts per token.",
    url: "https://arxiv.org/abs/2401.04088",
    tags: ["MoE", "sparse", "routing"],
    annotations: [],
  },
  {
    id: "striped-hyena",
    title: "StripedHyena: Moving Beyond Transformers with Hybrid Signal Processing Models",
    authors: ["Together AI"],
    abstract: "StripedHyena is a hybrid architecture that combines gated convolutions, attention, and hyena operators for efficient long-range sequence modeling.",
    url: "https://arxiv.org/abs/2401.00000",
    tags: ["hybrid", "hyena", "convolution"],
    annotations: [],
  },
];

export const useArchitectureStore = create<ArchitectureState>((set, get) => ({
  currentArchitecture: null,
  savedArchitectures: [],
  selectedLayerId: null,
  isDragging: false,
  dataMix: DEFAULT_DATA_MIX,
  papers: SAMPLE_PAPERS,
  selectedPaperId: null,

  createNewArchitecture: (name: string) => {
    const arch: Architecture = {
      id: generateId(),
      name,
      description: "",
      layers: [],
      totalParams: 0,
      estimatedFlops: 0,
      estimatedMemory: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ currentArchitecture: arch, selectedLayerId: null });
  },

  addLayer: (type: LayerType) => {
    const state = get();
    if (!state.currentArchitecture) return;

    const layer: LayerConfig = {
      id: generateId(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer ${state.currentArchitecture.layers.length + 1}`,
      params: { ...DEFAULT_LAYER_PARAMS[type] },
      position: { x: 0, y: state.currentArchitecture.layers.length * 80 },
      connections: [],
    };

    const layers = [...state.currentArchitecture.layers, layer];
    set({
      currentArchitecture: {
        ...state.currentArchitecture,
        layers,
        updatedAt: new Date().toISOString(),
      },
    });
    get().recalculateTotals();
  },

  removeLayer: (layerId: string) => {
    const state = get();
    if (!state.currentArchitecture) return;

    const layers = state.currentArchitecture.layers.filter((l) => l.id !== layerId);
    set({
      currentArchitecture: {
        ...state.currentArchitecture,
        layers,
        updatedAt: new Date().toISOString(),
      },
      selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
    });
    get().recalculateTotals();
  },

  updateLayer: (layerId: string, updates: Partial<LayerConfig>) => {
    const state = get();
    if (!state.currentArchitecture) return;

    const layers = state.currentArchitecture.layers.map((l) =>
      l.id === layerId ? { ...l, ...updates } : l
    );
    set({
      currentArchitecture: {
        ...state.currentArchitecture,
        layers,
        updatedAt: new Date().toISOString(),
      },
    });
    get().recalculateTotals();
  },

  moveLayer: (layerId: string, newIndex: number) => {
    const state = get();
    if (!state.currentArchitecture) return;

    const layers = [...state.currentArchitecture.layers];
    const oldIndex = layers.findIndex((l) => l.id === layerId);
    if (oldIndex === -1) return;

    const [removed] = layers.splice(oldIndex, 1);
    layers.splice(newIndex, 0, removed);

    set({
      currentArchitecture: {
        ...state.currentArchitecture,
        layers,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  selectLayer: (layerId: string | null) => set({ selectedLayerId: layerId }),
  setDragging: (isDragging: boolean) => set({ isDragging }),

  saveArchitecture: () => {
    const state = get();
    if (!state.currentArchitecture) return;

    const existing = state.savedArchitectures.findIndex(
      (a) => a.id === state.currentArchitecture!.id
    );
    const saved = [...state.savedArchitectures];
    if (existing >= 0) {
      saved[existing] = state.currentArchitecture;
    } else {
      saved.push(state.currentArchitecture);
    }
    set({ savedArchitectures: saved });
  },

  loadArchitecture: (id: string) => {
    const arch = get().savedArchitectures.find((a) => a.id === id);
    if (arch) set({ currentArchitecture: { ...arch }, selectedLayerId: null });
  },

  duplicateArchitecture: (id: string) => {
    const arch = get().savedArchitectures.find((a) => a.id === id);
    if (!arch) return;
    const dup: Architecture = {
      ...arch,
      id: generateId(),
      name: `${arch.name} (copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ savedArchitectures: [...get().savedArchitectures, dup] });
  },

  deleteArchitecture: (id: string) => {
    set({
      savedArchitectures: get().savedArchitectures.filter((a) => a.id !== id),
    });
  },

  recalculateTotals: () => {
    const state = get();
    if (!state.currentArchitecture) return;

    const totalParams = state.currentArchitecture.layers.reduce(
      (sum, l) => sum + computeLayerParams(l),
      0
    );
    const estimatedFlops = state.currentArchitecture.layers.reduce(
      (sum, l) => sum + computeLayerFlops(l, 2048),
      0
    );
    const estimatedMemory = state.currentArchitecture.layers.reduce(
      (sum, l) => sum + computeLayerMemory(l, 2048),
      0
    );

    set({
      currentArchitecture: {
        ...state.currentArchitecture,
        totalParams,
        estimatedFlops,
        estimatedMemory,
      },
    });
  },

  updateDataMix: (updates: Partial<DataMixConfig>) => {
    set({ dataMix: { ...get().dataMix, ...updates } });
  },

  addDataComponent: (component: DataComponent) => {
    const mix = get().dataMix;
    set({ dataMix: { ...mix, components: [...mix.components, component] } });
  },

  removeDataComponent: (index: number) => {
    const mix = get().dataMix;
    const components = mix.components.filter((_, i) => i !== index);
    set({ dataMix: { ...mix, components } });
  },

  updateComponentRatio: (index: number, ratio: number) => {
    const mix = get().dataMix;
    const components = [...mix.components];
    components[index] = { ...components[index], ratio, tokens: mix.totalTokens * ratio };
    set({ dataMix: { ...mix, components } });
  },

  addCurriculumStage: (stage: CurriculumStage) => {
    const mix = get().dataMix;
    set({
      dataMix: { ...mix, curriculumStages: [...mix.curriculumStages, stage] },
    });
  },

  addPaper: (paper: ResearchPaper) => {
    set({ papers: [...get().papers, paper] });
  },

  selectPaper: (paperId: string | null) => set({ selectedPaperId: paperId }),

  addAnnotation: (paperId: string, annotation: PaperAnnotation) => {
    const papers = get().papers.map((p) =>
      p.id === paperId
        ? { ...p, annotations: [...p.annotations, annotation] }
        : p
    );
    set({ papers });
  },
}));
