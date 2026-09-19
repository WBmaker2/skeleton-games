import { parseHash } from './ui/router';

export function boot(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const render = () => {
    const id = parseHash(window.location.hash);
    app.innerHTML = `<nav><a href="#/fruit">과일</a> <a href="#/squat">스쿼트</a> <a href="#/math">수학</a> <a href="#/abc">ABC</a></nav><p data-testid="route">${id}</p><video id="cam" playsinline muted></video><canvas id="stage" width="640" height="480"></canvas><p>카메라 거부 시 키보드 모드: 스페이스바=액션, ←→=이동</p>`;
  };
  window.addEventListener('hashchange', render);
  render();
}

export async function openCamera(): Promise<HTMLVideoElement | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
    const video = document.getElementById('cam') as HTMLVideoElement | null;
    if (!video) return null;
    video.srcObject = stream;
    await video.play();
    return video;
  } catch {
    return null;
  }
}

boot();
