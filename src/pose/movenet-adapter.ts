// src/pose/movenet-adapter.ts
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs';
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

const NAMES = ['nose','left_eye','right_eye','left_ear','right_ear','left_shoulder','right_shoulder','left_elbow','right_elbow','left_wrist','right_wrist','left_hip','right_hip','left_knee','right_knee','left_ankle','right_ankle'] as const;

// Self-hosted model (public/models/movenet/). Relative path so it works
// under any base (localhost, gh-pages project path). Served + precached
// with the app, so TFHub outages or school firewalls can't break loading.
export const MOVENET_LOCAL_URL = 'models/movenet/model.json';

export class MoveNetAdapter implements PoseEngine {
  name = 'movenet-lightning';
  private detector: poseDetection.PoseDetector | null = null;

  async load(): Promise<void> {
    try {
      this.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        modelUrl: MOVENET_LOCAL_URL
      });
      return;
    } catch (err) {
      console.warn('[pose] local MoveNet failed, falling back to TFHub', err);
    }
    // Fallback: default TFHub CDN (keeps old behavior when local copy is missing).
    this.detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
      modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    });
  }

  async estimate(video: HTMLVideoElement): Promise<PoseFrame> {
    if (!this.detector) throw new Error('MoveNet not loaded. Call load() first.');
    const poses = await this.detector.estimatePoses(video, { flipHorizontal: true });
    const kp = poses[0]?.keypoints ?? [];
    return {
      width: video.videoWidth || 640,
      height: video.videoHeight || 480,
      timestamp: performance.now(),
      keypoints: kp.map((k, i) => ({
        name: k.name ?? NAMES[i] ?? `p${i}`,
        x: k.x,
        y: k.y,
        score: k.score ?? 0
      }))
    };
  }

  async dispose(): Promise<void> {
    await this.detector?.dispose();
    this.detector = null;
  }
}
