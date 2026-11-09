export interface Readiness {
  // 모델 파일 도달 가능 여부 (null = 확인 전/브라우저 미지원)
  modelOk: boolean | null;
  // WebGL 사용 가능 여부 (false면 CPU 모드로 실행)
  webgl: boolean;
  // Service Worker에 모델이 캐시되어 있는지 (오프라인 실행 가능)
  cached: boolean;
}

export const MODEL_URL = 'models/movenet/model.json';
// 주 엔진(MediaPipe) 모델. readiness는 둘 중 하나라도 있으면 준비됨으로 본다.
export const POSE_TASK_URL = 'models/pose_landmarker_lite.task';

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2') || !!canvas.getContext('webgl');
  } catch {
    return false;
  }
}

async function isCached(): Promise<boolean> {
  try {
    if (!('caches' in window)) return false;
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      for (const url of [POSE_TASK_URL, MODEL_URL]) {
        const match = await cache.match(url);
        if (match) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

async function fetchOk(fetchFn: typeof fetch, url: string, timeoutMs: number): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchFn(url, { signal: ctrl.signal });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

// 인식 모델 준비 상태를 가볍게 확인한다 (모델 전체를 로드하지 않음).
// 주 엔진 pose task와 폴백 movenet 중 하나라도 닿으면 준비됨으로 본다.
export async function checkReadiness(
  fetchFn: typeof fetch = fetch,
  timeoutMs = 8000
): Promise<Readiness> {
  const webgl = hasWebGL();
  const cached = await isCached();
  const perUrl = Math.max(1000, Math.floor(timeoutMs / 2));
  const taskOk = await fetchOk(fetchFn, POSE_TASK_URL, perUrl);
  if (taskOk) return { modelOk: true, webgl, cached };
  const moveOk = await fetchOk(fetchFn, MODEL_URL, perUrl);
  return { modelOk: taskOk || moveOk, webgl, cached };
}

export function readinessMessage(r: Readiness): string {
  if (r.modelOk === false) return '인식 모델을 내려받지 못했어요. 인터넷 연결을 확인해주세요.';
  if (r.modelOk === null) return '인식 모델 확인 중…';
  const gpu = r.webgl ? '고속 모드' : '절전 모드(CPU)';
  const off = r.cached ? ' · 오프라인 실행 가능' : '';
  return `인식 모델 준비됨 (${gpu}${off})`;
}
