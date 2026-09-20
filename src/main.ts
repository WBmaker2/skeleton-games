import { parseHash } from './ui/router';

export function boot(): void {
  if ((window as any).__skelplay_booted) return;
  (window as any).__skelplay_booted = true;
  const app = document.getElementById('app');
  if (!app) return;
  const render = () => {
    const id = parseHash(window.location.hash);
    const existingCam = document.getElementById('cam') as HTMLVideoElement | null;
    const existingRoute = app.querySelector('[data-testid="route"]');
    if (existingCam && existingRoute) {
      existingRoute.textContent = id;
      return;
    }
    const stream = existingCam?.srcObject as MediaStream | null | undefined;
    app.innerHTML = `<nav><a href="#/fruit">과일</a> <a href="#/squat">스쿼트</a> <a href="#/math">수학</a> <a href="#/abc">ABC</a></nav><p data-testid="route">${id}</p><video id="cam" playsinline muted></video><canvas id="stage" width="640" height="480"></canvas><p>카메라 거부 시 키보드 모드: 스페이스바=액션, ←→=이동</p>`;
    if (stream) {
      const cam = document.getElementById('cam') as HTMLVideoElement | null;
      if (cam) cam.srcObject = stream;
    }
  };
  window.addEventListener('hashchange', render);
  render();
}

export async function openCamera(): Promise<HTMLVideoElement | null> {
  const video = document.getElementById('cam') as HTMLVideoElement | null;
  if (!video) return null;
  const attempts: MediaTrackConstraints[] = [
    { width: 1280, height: 720, facingMode: 'user' },
    { width: 640, height: 480 }
  ];
  for (const vc of attempts) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: vc, audio: false });
      video.srcObject = stream;
      await video.play();
      return video;
    } catch {
      // 다음 해상도로 폴백
    }
  }
  return null;
}

boot();
