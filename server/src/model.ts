import * as tf from "@tensorflow/tfjs-node";
import * as fs from "fs";
import * as path from "path";
import { INPUT_SIZE } from "./encoding.js";

const DATA_DIR = path.resolve("data");
const MODEL_DIR = path.join(DATA_DIR, "model");

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
  const modelJsonPath = path.join(MODEL_DIR, "model.json");

  if (fs.existsSync(modelJsonPath)) {
    try {
      const model = await tf.loadLayersModel(`file://${modelJsonPath}`);
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

export async function saveModel(model: tf.LayersModel): Promise<void> {
  await model.save(`file://${MODEL_DIR}`);
}

/** Returns model.json + weight shard contents as a JSON-serialisable object. */
export function getModelFiles(): { modelJson: unknown; weightData: string } {
  const modelJsonPath = path.join(MODEL_DIR, "model.json");
  const weightShardPath = path.join(MODEL_DIR, "weights.bin");

  if (!fs.existsSync(modelJsonPath)) {
    throw new Error("Model not saved yet");
  }

  const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, "utf-8")) as unknown;
  const weightBuffer = fs.existsSync(weightShardPath)
    ? fs.readFileSync(weightShardPath)
    : Buffer.alloc(0);

  return {
    modelJson,
    weightData: weightBuffer.toString("base64"),
  };
}
