import * as tf from "@tensorflow/tfjs-node";
import { getRecentExperiences } from "./db.js";
import { saveModel } from "./model.js";

let trainingInProgress = false;
const pendingTrainingRequest = { queued: false };

export async function trainModel(model: tf.LayersModel): Promise<void> {
  if (trainingInProgress) {
    pendingTrainingRequest.queued = true;
    return;
  }

  trainingInProgress = true;

  try {
    const experiences = getRecentExperiences();
    if (experiences.length === 0) return;

    const inputs: number[][] = [];
    const targets: number[][] = [];

    for (const { states, outcome } of experiences) {
      for (const state of states) {
        inputs.push(state);
        targets.push([outcome]);
      }
    }

    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor2d(targets);

    const epochs = Math.min(20, 4 + Math.floor(inputs.length / 8));

    console.log(`Training on ${inputs.length} positions (${experiences.length} games), ${epochs} epochs…`);

    await model.fit(xs, ys, {
      epochs,
      batchSize: Math.min(32, inputs.length),
      shuffle: true,
    });

    xs.dispose();
    ys.dispose();

    await saveModel(model);
    console.log("Training complete, model saved.");
  } finally {
    trainingInProgress = false;

    if (pendingTrainingRequest.queued) {
      pendingTrainingRequest.queued = false;
      void trainModel(model);
    }
  }
}
