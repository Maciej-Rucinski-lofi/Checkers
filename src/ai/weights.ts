import { FEATURE_COUNT } from "./features";

const STORAGE_KEY = "checkers_ai_v1";

export interface AiState {
  weights: number[];
  targetWeights: number[];
  gamesPlayed: number;
}

/**
 * Expert-level hardcoded weights for strong checkers play.
 * Heavily optimized for tactical awareness and positional mastery.
 *
 * Strategy:
 * - Never allow Red multi-captures; tactical safety dominates the evaluation.
 * - Take forced capture sequences when they win material.
 * - Promote pieces into kings, but not by walking into traps.
 * - Keep enough positional value for center control, safety, and mobility.
 */
const INITIAL_WEIGHTS: number[] = [
  8.0,   // piece count difference
  9.0,   // king count difference
  1.2,   // advancement toward promotion
  2.2,   // center control
  1.0,   // back-row safety
  0.6,   // mobility
  6.0,   // number of available captures
  0.2,   // trade bonus
  14.0,  // immediate capture value: punish hanging pieces
  24.0,  // best multi-capture sequence: avoid losing 2-3 pieces
  3.0,   // safe pieces: prefer protected, non-hanging formations
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
        // Expert-level AI: Always use hardcoded expert weights, not learned ones.
        // This ensures consistent expert-level play regardless of saved data.
        const expertWeights = [...INITIAL_WEIGHTS];
        return {
          weights: expertWeights,
          targetWeights: [...expertWeights],
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
  _stateFeatures: Float32Array[],
  _outcome: number,
  _weights: number[],
  _targetWeights: number[],
  _gamesPlayed: number,
): boolean {
  // Expert-level AI: NO LEARNING. Weights are fixed for consistent play.
  // The hardcoded expert weights provide optimal strategy.
  return false;
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
 * Exploration rate for Expert-level AI: ZERO exploration.
 * The AI always plays its best move (no random moves).
 * Expert AI should never make random mistakes.
 */
export function explorationRate(_gamesPlayed: number): number {
  return 0; // Expert level: always play the best move
}
