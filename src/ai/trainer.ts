import * as tf from "@tensorflow/tfjs";
import type { GameExperience } from "./experience";
import { saveModel } from "./model";

export async function trainOnExperiences(
  model: tf.LayersModel,
  experiences: GameExperience[],
): Promise<void> {
  const inputs: number[][] = [];
  const targets: number[][] = [];

  for (const { states, outcome } of experiences) {
    for (const state of states) {
      inputs.push(Array.from(state));
      targets.push([outcome]);
    }
  }

  if (inputs.length === 0) return;

  const xs = tf.tensor2d(inputs);
  const ys = tf.tensor2d(targets);

  await model.fit(xs, ys, {
    epochs: Math.min(20, 4 + Math.floor(inputs.length / 8)),
    batchSize: Math.min(32, inputs.length),
    shuffle: true,
  });

  xs.dispose();
  ys.dispose();
  await saveModel(model);
}
