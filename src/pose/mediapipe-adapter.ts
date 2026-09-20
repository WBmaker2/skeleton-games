// src/pose/mediapipe-adapter.ts
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

const LANDMARK_NAMES: Record<number, string> = {
  0: 'nose',
  11: 'left_shoulder',
  12: 'right_shoulder',
  13: 'left_elbow',
  14: 'right_elbow',
  15: 'left_wrist',
  16: 'right_wrist',
  23: 'left_hip',
  24: 'right_hip',
  25: 'left_knee',
  26: 'right_knee',
  27: 'left_ankle',
  28: 'right_ankle'
};

export function landmarkName(i: number): string {
  return LANDMARK_NAMES[i] ?? `lm${i}`;
}

// Self-hosted task bundle (public/models/). Falls back to the Google CDN
// when the local copy is missing, so ABC keeps working either way.
export const POSE_TASK_LOCAL_URL = 'models/pose_landmarker_lite.task';
const POSE_TASK_CDN_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

async function createLandmarker(vision: unknown, modelAssetPath: string): Promise<PoseLandmarker> {
  return PoseLandmarker.createFromOptions(vision as Parameters<typeof PoseLandmarker.createFromOptions>[0], {
    baseOptions: { modelAssetPath, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numPoses: 1
  });
}

export class MediaPipeAdapter implements PoseEngine {
  name = 'mediapipe-pose';
  private landmarker: PoseLandmarker | null = null;

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    try {
      this.landmarker = await createLandmarker(vision, POSE_TASK_LOCAL_URL);
      return;
    } catch (err) {
      console.warn('[pose] local task bundle failed, falling back to CDN', err);
    }
    this.landmarker = await createLandmarker(vision, POSE_TASK_CDN_URL);
  }

  async estimate(video: HTMLVideoElement): Promise<PoseFrame> {
    if (!this.landmarker) throw new Error('MediaPipe not loaded. Call load() first.');
    const res = this.landmarker.detectForVideo(video, performance.now());
    const pts = res.landmarks[0] ?? [];
    return {
      width: video.videoWidth || 640,
      height: video.videoHeight || 480,
      timestamp: performance.now(),
      keypoints: pts.map((p, i) => ({
        name: landmarkName(i),
        x: p.x * (video.videoWidth || 640),
        y: p.y * (video.videoHeight || 480),
        score: 1
      }))
    };
  }

  async dispose(): Promise<void> {
    await this.landmarker?.close();
    this.landmarker = null;
  }
}
