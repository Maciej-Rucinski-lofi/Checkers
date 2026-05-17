import * as tf from "@tensorflow/tfjs";
import { INPUT_SIZE } from "./encoding";

const SERVER_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface ModelPayload {
  topology: tf.io.ModelJSON;
  weightValues: number[][];
}

export async function loadOrCreateModel(): Promise<tf.LayersModel> {
  try {
    const res = await fetch(`${SERVER_URL}/model`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const payload = (await res.json()) as ModelPayload;

    const model = await tf.models.modelFromJSON(payload.topology);
    const weightTensors = payload.weightValues.map((w) => tf.tensor(w));
    model.setWeights(weightTensors);
    weightTensors.forEach((t) => t.dispose());

    model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
    console.log("Model loaded from server.");
    return model;
  } catch (err) {
    console.warn("Could not load model from server, using random weights:", err);
    return createFallbackModel();
  }
}

function createFallbackModel(): tf.LayersModel {
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

export async function evaluateBoard(
  model: tf.LayersModel,
  features: Float32Array,
): Promise<number> {
  const input = tf.tensor2d([Array.from(features)]);
  const prediction = model.predict(input) as tf.Tensor;
  const value = (await prediction.data())[0];
  input.dispose();
  prediction.dispose();
  return value;
}
