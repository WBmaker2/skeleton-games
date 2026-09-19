// src/pose/mediapipe-adapter.ts
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame } from './types';
import type { PoseEngine } from './pose-engine';

export class MediaPipeAdapter implements PoseEngine {
  name = 'mediapipe-pose';
  private landmarker: PoseLandmarker | null = null;

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );
    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1
    });
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
        name: `lm${i}`,
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
