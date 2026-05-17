import { deserializeState, serializeState } from "./encoding";

export interface GameExperience {
  states: Float32Array[];
  /** +1 when Black (AI) wins, -1 when Red (human) wins. */
  outcome: number;
}

const STORAGE_KEY = "checkers-ai-experiences";
const MAX_GAMES = 80;

interface StoredExperience {
  states: number[][];
  outcome: number;
}

export function loadExperiences(): GameExperience[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredExperience[];
    return parsed.map((entry) => ({
      states: entry.states.map(deserializeState),
      outcome: entry.outcome,
    }));
  } catch {
    return [];
  }
}

export function saveExperiences(experiences: GameExperience[]): void {
  const trimmed = experiences.slice(-MAX_GAMES);
  const stored: StoredExperience[] = trimmed.map((exp) => ({
    states: exp.states.map(serializeState),
    outcome: exp.outcome,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function loadGamesPlayed(): number {
  const value = localStorage.getItem("checkers-ai-games-played");
  return value ? Number.parseInt(value, 10) : 0;
}

export function incrementGamesPlayed(): number {
  const next = loadGamesPlayed() + 1;
  localStorage.setItem("checkers-ai-games-played", String(next));
  return next;
}
