import { FEATURE_COUNT } from "./features";

const STORAGE_KEY = "checkers_ai_v1";

export interface AiState {
  weights: number[];
  targetWeights: number[];
  gamesPlayed: number;
}

/**
 * Initial weights lean slightly toward material and king advantage.
 * They are intentionally weak so the learning curve is perceptible.
 * Values increased from original to give AI better initial understanding.
 */
const INITIAL_WEIGHTS: number[] = [
  2.0,  // piece count difference (increased from 1.0)
  1.0,  // king count difference (increased from 0.3)
  0.2,  // advancement (increased from 0.05)
  0.3,  // center control (increased from 0.05)
  0.15, // back-row safety (increased from 0.02)
  0.15, // mobility (increased from 0.02)
  0.4,  // capture threat (increased from 0.1)
  0.1,  // trade bonus (increased from 0.02)
];

export function loadAiState(): AiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as any;
      if (
        Array.isArray(parsed.weights) &&
        parsed.weights.length === FEATURE_COUNT
      ) {
        // Handle backward compatibility: old saves don't have targetWeights
        return {
          weights: parsed.weights,
          targetWeights: parsed.targetWeights || [...parsed.weights],
          gamesPlayed: parsed.gamesPlayed || 0,
        };
      }
    }
  } catch {
    // corrupted storage — start fresh
  }
  const initialWeights = [...INITIAL_WEIGHTS];
  return { weights: initialWeights, targetWeights: [...initialWeights], gamesPlayed: 0 };
}

export function saveAiState(state: AiState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

/**
 * Evaluates a board position using the current weight vector.
 * Returns a score from Black's perspective (higher = better for Black).
 */
export function evaluate(features: Float32Array, weights: number[]): number {
  let score = 0;
  for (let i = 0; i < FEATURE_COUNT; i++) {
    score += weights[i] * features[i];
  }
  return score;
}

/**
 * Updates weights using Temporal Difference learning with target network.
 * The target network (frozen weights) provides stable bootstrap targets,
 * preventing the moving target problem that corrupts learning.
 *
 * @param stateFeatures  Feature vectors recorded at each Black move during the game.
 * @param outcome        +1 if Black won, -1 if Red won.
 * @param weights        Current learning weights (mutated in place).
 * @param targetWeights  Frozen target weights for stable bootstrap predictions.
 * @param gamesPlayed    Used to anneal the learning rate over time.
 * @returns Boolean indicating if target network should be synced.
 */
export function tdUpdate(
  stateFeatures: Float32Array[],
  outcome: number,
  weights: number[],
  targetWeights: number[],
  gamesPlayed: number,
): boolean {
  if (stateFeatures.length === 0) return false;

  // Aggressive learning rate: starts at 0.5, decays to 0.15 by game 50.
  const alpha = Math.max(0.15, 0.5 - gamesPlayed * 0.007);

  // Process all states forward (not backward) for simplicity and stability.
  for (let i = 0; i < stateFeatures.length; i++) {
    const currentFeatures = stateFeatures[i];
    const currentPred = evaluate(currentFeatures, weights);

    // Compute TD target using FROZEN target weights (stable bootstrap).
    let target: number;
    if (i < stateFeatures.length - 1) {
      // Use target network's next state prediction (stable bootstrapping).
      const nextFeatures = stateFeatures[i + 1];
      const nextPred = evaluate(nextFeatures, targetWeights);
      target = nextPred;
    } else {
      // Last state: use game outcome.
      target = outcome;
    }

    const tdError = target - currentPred;

    // Update learning weights based on TD error.
    for (let j = 0; j < FEATURE_COUNT; j++) {
      weights[j] += alpha * tdError * currentFeatures[j];
      // Relaxed clipping: allow larger weight magnitudes for proper scaling.
      weights[j] = Math.max(-50, Math.min(50, weights[j]));
    }
  }

  // Sync target network every 5 games to keep bootstrap targets fresh but stable.
  return gamesPlayed % 5 === 0;
}

/**
 * Syncs target network weights from current learning weights.
 * Called periodically (every 5 games) to update bootstrap targets.
 */
export function syncTargetNetwork(weights: number[], targetWeights: number[]): void {
  for (let i = 0; i < FEATURE_COUNT; i++) {
    targetWeights[i] = weights[i];
  }
}

/**
 * Exploration rate: probability of picking a random move instead of the best one.
 * Aggressive early exploration (60% random in games 1-5), quick decay to 5% by game 20.
 * This allows the AI to experience diverse positions early while learning faster.
 *
 * Games  0-5:  ~55-60% random  (very easy for human, AI sees variety)
 * Games 6-15: ~20-35% random  (medium, AI starting to consolidate)
 * Games 20-30: ~5-10% random  (hard, AI mostly exploits learned weights)
 */
export function explorationRate(gamesPlayed: number): number {
  return Math.max(0.05, 0.6 - gamesPlayed * 0.032);
}
