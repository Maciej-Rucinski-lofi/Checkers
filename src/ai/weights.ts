import { FEATURE_COUNT } from "./features";

const STORAGE_KEY = "checkers_ai_v1";

export interface AiState {
  weights: number[];
  gamesPlayed: number;
}

/**
 * Initial weights lean slightly toward material and king advantage.
 * They are intentionally weak so the learning curve is perceptible.
 */
const INITIAL_WEIGHTS: number[] = [
  1.0,  // piece count difference
  0.3,  // king count difference
  0.05, // advancement
  0.05, // center control
  0.02, // back-row safety
  0.02, // mobility
  0.1,  // capture threat
  0.02, // trade bonus
];

export function loadAiState(): AiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AiState;
      if (
        Array.isArray(parsed.weights) &&
        parsed.weights.length === FEATURE_COUNT
      ) {
        return parsed;
      }
    }
  } catch {
    // corrupted storage — start fresh
  }
  return { weights: [...INITIAL_WEIGHTS], gamesPlayed: 0 };
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
 * Updates weights using Temporal Difference learning after a completed game.
 *
 * @param stateFeatures  Feature vectors recorded at each Black move during the game.
 * @param outcome        +1 if Black won, -1 if Red won.
 * @param weights        Current weight vector (mutated in place).
 * @param gamesPlayed    Used to anneal the learning rate over time.
 */
export function tdUpdate(
  stateFeatures: Float32Array[],
  outcome: number,
  weights: number[],
  gamesPlayed: number,
): void {
  if (stateFeatures.length === 0) return;

  // Learning rate decays slowly: starts at 0.18, reaches ~0.05 by game 50.
  const alpha = Math.max(0.05, 0.18 - gamesPlayed * 0.0026);

  for (const features of stateFeatures) {
    const predicted = evaluate(features, weights);
    const error = outcome - predicted;
    for (let i = 0; i < FEATURE_COUNT; i++) {
      weights[i] += alpha * error * features[i];
    }
  }
}

/**
 * Exploration rate: probability of picking a random move instead of the best one.
 * Starts high so early games feel weak; decays toward a small floor.
 *
 * Games  0-5:  ~38-48% random  (easy)
 * Games 10-15: ~22-32% random  (medium)
 * Games 25-30: ~5-10%  random  (intermediate)
 */
export function explorationRate(gamesPlayed: number): number {
  return Math.max(0.05, 0.48 - gamesPlayed * 0.014);
}
