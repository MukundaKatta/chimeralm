# ChimeraLM

Interactive research platform for designing and analyzing hybrid LLM architectures combining Transformer, Mamba, SSM, and MoE layers.

<!-- Add screenshot here -->

## Features

- **Architecture Builder** — Drag-and-drop designer for custom hybrid architectures
- **Comparison Simulator** — Side-by-side FLOPs, memory, and throughput estimation
- **Layer-by-Layer Profiler** — Visualize compute and memory allocation per layer
- **Paper Annotator** — Annotate and reference AI research papers
- **Efficiency Calculator** — Estimate training and inference costs for architectures
- **Inference Visualizer** — Watch token generation flow through architecture layers
- **Data Mixer** — Configure and balance training data mixtures
- **Loss Predictor** — Predict training loss curves for architecture configurations
- **Context Length Analyzer** — Analyze memory scaling with sequence length

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Drag-and-Drop:** dnd-kit (core, sortable, utilities)
- **Charts:** Recharts
- **Animation:** Framer Motion
- **Database:** Supabase
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project

### Installation

```bash
git clone <repo-url>
cd chimeralm
npm install
```

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── architecture-builder/    # Drag-and-drop architecture designer
│   ├── comparison-simulator/    # Side-by-side comparisons
│   ├── layer-profiler/          # Per-layer profiling
│   ├── paper-annotator/         # Research paper annotations
│   ├── efficiency-calculator/   # Cost estimation
│   ├── inference-visualizer/    # Token flow visualization
│   ├── data-mixer/              # Training data configuration
│   ├── loss-predictor/          # Loss curve prediction
│   └── context-analyzer/        # Context length analysis
├── components/                  # Shared UI components
├── stores/                      # Zustand stores
└── lib/                         # Utilities
```

## License

MIT
