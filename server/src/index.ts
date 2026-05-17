import cors from "cors";
import express, { type Request, type Response } from "express";
import { getGamesPlayed, insertExperience } from "./db.js";
import { ensureDataDir, getModelPayload, loadOrCreateModel, saveModel } from "./model.js";
import { trainModel } from "./trainer.js";

const app = express();
const PORT = process.env.PORT ?? 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json({ limit: "4mb" }));

ensureDataDir();

let model = await loadOrCreateModel();

// Save a fresh model to disk on first run so GET /model works immediately
try {
  getModelPayload();
} catch {
  saveModel(model);
}

interface ExperienceBody {
  states: number[][];
  outcome: number;
}

/**
 * GET /model
 * Returns the current model weights so the browser can load them into TF.js.
 */
app.get("/model", (_req: Request, res: Response) => {
  try {
    const payload = getModelPayload();
    res.json(payload);
  } catch {
    res.status(503).json({ error: "Model not ready yet" });
  }
});

/**
 * POST /experiences
 * Accepts a finished game's board states and outcome (+1 black win, -1 red win).
 * Persists to SQLite, then kicks off async training.
 */
app.post("/experiences", (req: Request, res: Response) => {
  const body = req.body as ExperienceBody;

  if (
    !Array.isArray(body?.states) ||
    body.states.length === 0 ||
    (body.outcome !== 1 && body.outcome !== -1)
  ) {
    res.status(400).json({ error: "Invalid experience payload" });
    return;
  }

  insertExperience(body.states, body.outcome);
  res.json({ ok: true });

  // Train asynchronously — don't block the response
  void trainModel(model);
});

/**
 * GET /stats
 * Returns basic training stats.
 */
app.get("/stats", (_req: Request, res: Response) => {
  res.json({ gamesPlayed: getGamesPlayed() });
});

app.listen(PORT, () => {
  console.log(`Checkers AI server running on http://localhost:${PORT}`);
  console.log(`Accepting requests from: ${FRONTEND_ORIGIN}`);
});
