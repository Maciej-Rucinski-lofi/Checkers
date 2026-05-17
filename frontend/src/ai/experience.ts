import { serializeState } from "./encoding";

export interface GameExperience {
  states: Float32Array[];
  /** +1 when Black (AI) wins, -1 when Red (human) wins. */
  outcome: number;
}

const SERVER_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function postExperience(experience: GameExperience): Promise<void> {
  const body = {
    states: experience.states.map(serializeState),
    outcome: experience.outcome,
  };

  try {
    const res = await fetch(`${SERVER_URL}/experiences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn("Failed to post experience to server:", res.status);
    }
  } catch (err) {
    console.warn("Could not reach server to post experience:", err);
  }
}

export async function loadGamesPlayed(): Promise<number> {
  try {
    const res = await fetch(`${SERVER_URL}/stats`);
    if (!res.ok) return 0;
    const data = (await res.json()) as { gamesPlayed: number };
    return data.gamesPlayed;
  } catch {
    return 0;
  }
}
