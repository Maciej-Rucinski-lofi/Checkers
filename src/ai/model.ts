import * as tf from "@tensorflow/tfjs";
import { INPUT_SIZE } from "./encoding";

const MODEL_STORAGE_KEY = "localstorage://checkers-ai-model";

export async function loadOrCreateModel(): Promise<tf.LayersModel> {
  try {
    const model = await tf.loadLayersModel(MODEL_STORAGE_KEY);
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: "meanSquaredError",
    });
    return model;
  } catch {
    return createModel();
  }
}

export function createModel(): tf.LayersModel {
  const model = tf.sequential({
    layers: [
      tf.layers.dense({
        inputShape: [INPUT_SIZE],
        units: 64,
        activation: "relu",
      }),
      tf.layers.dense({ units: 32, activation: "relu" }),
      tf.layers.dense({ units: 1, activation: "tanh" }),
    ],
  });

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "meanSquaredError",
  });

  return model;
}

export async function saveModel(model: tf.LayersModel): Promise<void> {
  await model.save(MODEL_STORAGE_KEY);
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
