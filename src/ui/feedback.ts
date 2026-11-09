// src/ui/feedback.ts
let ctx: AudioContext | null = null;

const MUTE_KEY = 'skelplay:muted';

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // 저장 실패는 무시 (이번 세션만 적용)
  }
}

export function toggleMuted(): boolean {
  const next = !isMuted();
  setMuted(next);
  return next;
}

export function beep(kind: 'hit' | 'miss' | 'win'): void {
  try {
    if (isMuted()) return;
    ctx ??= new AudioContext();
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = kind === 'hit' ? 660 : kind === 'win' ? 880 : 180;
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    osc.start();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // 오디오 차단 환경에서는 조용히 무시 (자막으로 대체)
  }
}
