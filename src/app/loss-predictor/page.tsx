"use client";

import { useState, useMemo } from "react";
import { predictScalingLaw } from "@/lib/compute";
import { formatNumber, formatFlops } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Slider from "@/components/ui/Slider";

export default function LossPredictorPage() {
  const [modelSizeB, setModelSizeB] = useState(7);
  const [computeBudgetExp, setComputeBudgetExp] = useState(22); // 10^22
  const [numDatapoints, setNumDatapoints] = useState(20);
  const [showChinchilla, setShowChinchilla] = useState(true);
  const [showCustom, setShowCustom] = useState(true);

  // Generate compute budget range
  const budgets = useMemo(() => {
    return Array.from({ length: numDatapoints }, (_, i) => {
      const exp = 18 + (i / (numDatapoints - 1)) * 8; // 10^18 to 10^26
      return Math.pow(10, exp);
    });
  }, [numDatapoints]);

  // Chinchilla-optimal predictions
  const chinchillaPredictions = useMemo(
    () => predictScalingLaw(budgets),
    [budgets]
  );

  // Custom model size predictions
  const customPredictions = useMemo(
    () => predictScalingLaw(budgets, modelSizeB * 1e9),
    [budgets, modelSizeB]
  );

  // Current point
  const currentCompute = Math.pow(10, computeBudgetExp);
  const currentChinchilla = predictScalingLaw([currentCompute])[0];
  const currentCustom = predictScalingLaw([currentCompute], modelSizeB * 1e9)[0];

  // Chart dimensions
  const chartW = 700;
  const chartH = 300;

  const allLosses = [
    ...(showChinchilla ? chinchillaPredictions.map((p) => p.predictedLoss) : []),
    ...(showCustom ? customPredictions.map((p) => p.predictedLoss) : []),
  ];
  const minLoss = Math.min(...allLosses) * 0.95;
  const maxLoss = Math.max(...allLosses) * 1.05;
  const minBudget = budgets[0];
  const maxBudget = budgets[budgets.length - 1];

  const toX = (compute: number) => {
    const logMin = Math.log10(minBudget);
    const logMax = Math.log10(maxBudget);
    return ((Math.log10(compute) - logMin) / (logMax - logMin)) * chartW;
  };

  const toY = (loss: number) => {
    return chartH - ((loss - minLoss) / (maxLoss - minLoss)) * (chartH - 20);
  };

  const toPath = (predictions: typeof chinchillaPredictions) => {
    const points = predictions.map(
      (p) => `${toX(p.computeBudgetFlops)},${toY(p.predictedLoss)}`
    );
    return `M ${points.join(" L ")}`;
  };

  // Known model reference points
  const referenceModels = [
    { name: "GPT-3 175B", compute: 3.14e23, loss: 2.0, color: "#f59e0b" },
    { name: "Chinchilla 70B", compute: 5.76e23, loss: 1.94, color: "#10b981" },
    { name: "LLaMA 65B", compute: 1e24, loss: 1.87, color: "#3b82f6" },
    { name: "LLaMA 2 70B", compute: 1.7e24, loss: 1.82, color: "#8b5cf6" },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Training Loss Predictor</h1>
        <p className="text-sm text-white/40 mt-1">
          Use scaling laws to predict final training loss given compute budget and model size
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Controls */}
        <div className="col-span-3 space-y-4">
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Model Configuration
            </h3>
            <div className="space-y-3">
              <Slider
                label="Model Size"
                value={modelSizeB}
                onChange={setModelSizeB}
                min={0.1}
                max={200}
                step={0.1}
                formatValue={(v) => `${v}B params`}
                color="#ec4899"
              />
              <Slider
                label="Compute Budget (log10 FLOPs)"
                value={computeBudgetExp}
                onChange={setComputeBudgetExp}
                min={18}
                max={26}
                step={0.1}
                formatValue={(v) => `10^${v.toFixed(1)}`}
                color="#5c7cfa"
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Display Options
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showChinchilla}
                  onChange={(e) => setShowChinchilla(e.target.checked)}
                  className="rounded"
                />
                Chinchilla-Optimal Curve
              </label>
              <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCustom}
                  onChange={(e) => setShowCustom(e.target.checked)}
                  className="rounded"
                />
                Custom Model Size Curve
              </label>
              <Slider
                label="Curve Resolution"
                value={numDatapoints}
                onChange={setNumDatapoints}
                min={10}
                max={50}
                step={1}
              />
            </div>
          </Card>

          {/* Current prediction */}
          <Card variant="glow">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Current Prediction
            </h3>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-white/40">Compute Budget</div>
                <div className="text-lg font-bold text-white">{formatFlops(currentCompute)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-green-400">Chinchilla Optimal</div>
                  <div className="text-sm font-bold text-white">
                    {currentChinchilla.predictedLoss.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-white/30">
                    N*: {formatNumber(currentChinchilla.optimalParams)}
                  </div>
                  <div className="text-[10px] text-white/30">
                    D*: {formatNumber(currentChinchilla.optimalTokens)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-[10px] text-pink-400">{modelSizeB}B Model</div>
                  <div className="text-sm font-bold text-white">
                    {currentCustom.predictedLoss.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-white/30">
                    D: {formatNumber(currentCustom.optimalTokens)}
                  </div>
                  <div className="text-[10px] text-white/30">
                    Conf: {(currentCustom.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              {currentCustom.predictedLoss > currentChinchilla.predictedLoss * 1.02 && (
                <div className="text-[10px] text-yellow-400 bg-yellow-400/10 rounded p-2">
                  Your model is {((currentCustom.predictedLoss / currentChinchilla.predictedLoss - 1) * 100).toFixed(1)}%
                  above Chinchilla-optimal. Consider using{" "}
                  {formatNumber(currentChinchilla.optimalParams)} params instead.
                </div>
              )}
            </div>
          </Card>

          {/* Scaling law info */}
          <Card>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Scaling Law
            </h3>
            <div className="text-[10px] text-white/40 space-y-1.5 font-mono">
              <p>L(N,D) = E + A/N^a + B/D^b</p>
              <p>E = 1.69 (irreducible)</p>
              <p>A = 406.4, a = 0.34</p>
              <p>B = 410.7, b = 0.28</p>
              <p className="text-white/20 mt-2">C = 6ND (compute-optimal)</p>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="col-span-9 space-y-4">
          {/* Main scaling curve */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-1">Loss vs. Compute Budget</h3>
            <p className="text-[10px] text-white/30 mb-4">
              Predicted training loss using Chinchilla scaling laws (log scale compute)
            </p>

            <svg viewBox={`0 0 ${chartW} ${chartH + 30}`} className="w-full h-80" preserveAspectRatio="xMidYMid meet">
              {/* Grid */}
              {Array.from({ length: 6 }, (_, i) => {
                const y = (i / 5) * chartH;
                const loss = maxLoss - (i / 5) * (maxLoss - minLoss);
                return (
                  <g key={`grid-h-${i}`}>
                    <line x1={0} y1={y} x2={chartW} y2={y} stroke="rgba(255,255,255,0.05)" />
                    <text x={-5} y={y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end">
                      {loss.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              {Array.from({ length: 9 }, (_, i) => {
                const exp = 18 + i;
                const x = toX(Math.pow(10, exp));
                return (
                  <g key={`grid-v-${i}`}>
                    <line x1={x} y1={0} x2={x} y2={chartH} stroke="rgba(255,255,255,0.05)" />
                    <text x={x} y={chartH + 15} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle">
                      10^{exp}
                    </text>
                  </g>
                );
              })}

              {/* Chinchilla curve */}
              {showChinchilla && (
                <g>
                  <path
                    d={toPath(chinchillaPredictions)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d={toPath(chinchillaPredictions)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="8"
                    opacity="0.15"
                  />
                </g>
              )}

              {/* Custom model curve */}
              {showCustom && (
                <g>
                  <path
                    d={toPath(customPredictions)}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="6 3"
                  />
                  <path
                    d={toPath(customPredictions)}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="8"
                    opacity="0.15"
                  />
                </g>
              )}

              {/* Current compute line */}
              <line
                x1={toX(currentCompute)}
                y1={0}
                x2={toX(currentCompute)}
                y2={chartH}
                stroke="rgba(92,124,250,0.5)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={toX(currentCompute)}
                y={chartH + 25}
                fill="#5c7cfa"
                fontSize="9"
                textAnchor="middle"
              >
                Your budget
              </text>

              {/* Current prediction points */}
              {showChinchilla && (
                <circle
                  cx={toX(currentCompute)}
                  cy={toY(currentChinchilla.predictedLoss)}
                  r="5"
                  fill="#10b981"
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
              {showCustom && (
                <circle
                  cx={toX(currentCompute)}
                  cy={toY(currentCustom.predictedLoss)}
                  r="5"
                  fill="#ec4899"
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}

              {/* Reference models */}
              {referenceModels.map((model) => {
                if (model.compute < minBudget || model.compute > maxBudget) return null;
                if (model.loss < minLoss || model.loss > maxLoss) return null;
                return (
                  <g key={model.name}>
                    <circle
                      cx={toX(model.compute)}
                      cy={toY(model.loss)}
                      r="4"
                      fill={model.color}
                      opacity="0.8"
                    />
                    <text
                      x={toX(model.compute) + 8}
                      y={toY(model.loss) + 3}
                      fill={model.color}
                      fontSize="8"
                    >
                      {model.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="flex gap-6 mt-3 justify-center">
              {showChinchilla && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-green-500 rounded" />
                  <span className="text-xs text-white/50">Chinchilla-Optimal</span>
                </div>
              )}
              {showCustom && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-pink-500 rounded" style={{ borderBottom: "1px dashed" }} />
                  <span className="text-xs text-white/50">{modelSizeB}B Model</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-chimera-500" />
                <span className="text-xs text-white/50">Reference Models</span>
              </div>
            </div>
          </Card>

          {/* Optimal allocation */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Compute-Optimal Allocation</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/40">Optimal Model Size</span>
                    <span className="font-mono text-mamba">{formatNumber(currentChinchilla.optimalParams)}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-mamba rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (currentChinchilla.optimalParams / 1e11) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/40">Optimal Tokens</span>
                    <span className="font-mono text-transformer">{formatNumber(currentChinchilla.optimalTokens)}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-transformer rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (currentChinchilla.optimalTokens / 1e13) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-white/30 bg-white/5 rounded p-2">
                  Chinchilla ratio: {(currentChinchilla.optimalTokens / currentChinchilla.optimalParams).toFixed(1)} tokens per parameter
                </div>
              </div>
            </Card>

            <Card>
              <h3 className="text-sm font-semibold text-white mb-3">Your Model ({modelSizeB}B) Allocation</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/40">Model Size (fixed)</span>
                    <span className="font-mono text-pink-400">{formatNumber(modelSizeB * 1e9)}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 rounded-full"
                      style={{ width: `${Math.min(100, (modelSizeB / 100) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/40">Training Tokens</span>
                    <span className="font-mono text-pink-400">{formatNumber(currentCustom.optimalTokens)}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500/70 rounded-full"
                      style={{ width: `${Math.min(100, (currentCustom.optimalTokens / 1e13) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-[10px] text-white/30 bg-white/5 rounded p-2">
                  Tokens/param ratio: {(currentCustom.optimalTokens / (modelSizeB * 1e9)).toFixed(1)}
                  {modelSizeB * 1e9 > currentChinchilla.optimalParams * 1.5 && (
                    <span className="text-yellow-400 block mt-1">
                      Model is over-parameterized for this compute budget
                    </span>
                  )}
                  {modelSizeB * 1e9 < currentChinchilla.optimalParams * 0.5 && (
                    <span className="text-yellow-400 block mt-1">
                      Model is under-parameterized; consider scaling up
                    </span>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Prediction table */}
          <Card>
            <h3 className="text-sm font-semibold text-white mb-3">Scaling Predictions Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-white/40">Compute (FLOPs)</th>
                    <th className="text-right py-2 text-green-400">Optimal N</th>
                    <th className="text-right py-2 text-green-400">Optimal D</th>
                    <th className="text-right py-2 text-green-400">Optimal Loss</th>
                    <th className="text-right py-2 text-pink-400">{modelSizeB}B Loss</th>
                    <th className="text-right py-2 text-white/40">Gap</th>
                    <th className="text-right py-2 text-white/40">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {[19, 20, 21, 22, 23, 24, 25].map((exp) => {
                    const c = Math.pow(10, exp);
                    const chin = predictScalingLaw([c])[0];
                    const custom = predictScalingLaw([c], modelSizeB * 1e9)[0];
                    const gap = ((custom.predictedLoss / chin.predictedLoss - 1) * 100);
                    return (
                      <tr key={exp} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 font-mono text-white/60">10^{exp}</td>
                        <td className="text-right font-mono text-white/60">{formatNumber(chin.optimalParams)}</td>
                        <td className="text-right font-mono text-white/60">{formatNumber(chin.optimalTokens)}</td>
                        <td className="text-right font-mono text-green-400/80">{chin.predictedLoss.toFixed(3)}</td>
                        <td className="text-right font-mono text-pink-400/80">{custom.predictedLoss.toFixed(3)}</td>
                        <td className={`text-right font-mono ${gap > 5 ? "text-yellow-400" : "text-white/40"}`}>
                          +{gap.toFixed(1)}%
                        </td>
                        <td className="text-right font-mono text-white/40">
                          {(chin.confidence * 100).toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
