import { parseHash } from './ui/router';

export function boot(): void {
  const app = document.getElementById('app');
  if (!app) return;
  const render = () => {
    const id = parseHash(window.location.hash);
    app.innerHTML = `<nav><a href="#/fruit">과일</a> <a href="#/squat">스쿼트</a> <a href="#/math">수학</a> <a href="#/abc">ABC</a></nav><p data-testid="route">${id}</p><video id="cam" playsinline muted></video><canvas id="stage" width="640" height="480"></canvas>`;
  };
  window.addEventListener('hashchange', render);
  render();
}

boot();
