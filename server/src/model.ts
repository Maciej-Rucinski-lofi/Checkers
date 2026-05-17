import * as tf from "@tensorflow/tfjs";
import * as fs from "fs";
import * as path from "path";
import { INPUT_SIZE } from "./encoding.js";

const DATA_DIR = path.resolve("data");
const MODEL_DIR = path.join(DATA_DIR, "model");
const TOPOLOGY_PATH = path.join(MODEL_DIR, "topology.json");
const WEIGHTS_PATH = path.join(MODEL_DIR, "weights.json");

export function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });
}

export function createModel(): tf.LayersModel {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({ inputShape: [INPUT_SIZE], units: 64, activation: "relu" }),
      tf.layers.dense({ units: 32, activation: "relu" }),
      tf.layers.dense({ units: 1, activation: "tanh" }),
    ],
  });
  model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
  return model;
}

export async function loadOrCreateModel(): Promise<tf.LayersModel> {
  if (fs.existsSync(TOPOLOGY_PATH) && fs.existsSync(WEIGHTS_PATH)) {
    try {
      const topology = JSON.parse(fs.readFileSync(TOPOLOGY_PATH, "utf-8")) as tf.io.ModelJSON;
      const weightValues = JSON.parse(fs.readFileSync(WEIGHTS_PATH, "utf-8")) as number[][];

      const model = await tf.models.modelFromJSON(topology);
      const weightTensors = weightValues.map((w) => tf.tensor(w));
      model.setWeights(weightTensors);
      weightTensors.forEach((t) => t.dispose());

      model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
      console.log("Loaded existing model from disk.");
      return model;
    } catch (err) {
      console.warn("Failed to load model, creating new one:", err);
    }
  }

  console.log("Creating new model.");
  return createModel();
}

export function saveModel(model: tf.LayersModel): void {
  ensureDataDir();

  const topology = model.toJSON(null, false) as unknown as tf.io.ModelJSON;
  fs.writeFileSync(TOPOLOGY_PATH, JSON.stringify(topology));

  const weights = model.getWeights();
  const weightValues = weights.map((w) => Array.from(w.dataSync()));
  weights.forEach((w) => w.dispose());
  fs.writeFileSync(WEIGHTS_PATH, JSON.stringify(weightValues));
}

/** Returns model topology + weights as a JSON-serialisable object for the browser. */
export function getModelPayload(): { topology: tf.io.ModelJSON; weightValues: number[][] } {
  if (!fs.existsSync(TOPOLOGY_PATH) || !fs.existsSync(WEIGHTS_PATH)) {
    throw new Error("Model not saved yet");
  }

  return {
    topology: JSON.parse(fs.readFileSync(TOPOLOGY_PATH, "utf-8")) as tf.io.ModelJSON,
    weightValues: JSON.parse(fs.readFileSync(WEIGHTS_PATH, "utf-8")) as number[][],
  };
}
