import * as tf from "@tensorflow/tfjs";
import { INPUT_SIZE } from "./encoding";

const SERVER_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

interface ModelPayload {
  modelJson: tf.io.ModelJSON;
  weightData: string;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function loadOrCreateModel(): Promise<tf.LayersModel> {
  try {
    const res = await fetch(`${SERVER_URL}/model`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);

    const payload = (await res.json()) as ModelPayload;
    const weightData = base64ToArrayBuffer(payload.weightData);

    const artifacts: tf.io.ModelArtifacts = {
      ...(payload.modelJson as tf.io.ModelArtifacts),
      weightData,
    };

    const model = await tf.loadLayersModel(tf.io.fromMemory(artifacts));
    model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
    console.log("Model loaded from server.");
    return model;
  } catch (err) {
    console.warn("Could not load model from server, creating local fallback:", err);
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
