import { describe, expect, it } from 'vitest';
import {
  MoleWhack,
  MOLE_ARM_DY,
  MOLE_DOUBLE_AT_MS,
  MOLE_HIT_R,
  MOLE_RISE_END_MS,
  MOLE_RISE_START_MS,
  MOLE_SLOTS,
  MOLE_SPREAD,
  MOLE_VISIBLE_END_MS,
  MOLE_VISIBLE_START_MS
} from './mole-whack';
import type { Keypoint, PoseFrame } from '../../pose/types';

function kp(name: string, x: number, y: number): Keypoint {
  return { name, x, y, score: 1 };
}

function frame(kps: Keypoint[], width = 640, height = 480): PoseFrame {
  return { width, height, timestamp: 0, keypoints: kps };
}

// 어깨(양쪽) + 양손목 프레임. 팔꿈치는 생략하면 손바닥=손목 위치가 된다.
function handsFrame(lx: number, ly: number, rx: number, ry: number, cx = 320, sy = 200): PoseFrame {
  return frame([
    kp('left_shoulder', cx - 50, sy),
    kp('right_shoulder', cx + 50, sy),
    kp('left_wrist', lx, ly),
    kp('right_wrist', rx, ry)
  ]);
}

// 양손을 멀리 둬서 판정에 영향이 없게 한다. (0,0)은 왼손을 무장시킬 수 있으나
// 두더지와 멀어 타격은 일어나지 않는다.
function neutral(): PoseFrame {
  return handsFrame(0, 0, 639, 0);
}

function proxyCtx(): CanvasRenderingContext2D {
  const fn = (..._args: unknown[]): undefined => undefined;
  return new Proxy(
    {},
    {
      get: (_t, p) => (p === 'canvas' ? undefined : fn),
      set: (t, p, v) => {
        (t as Record<string | symbol, unknown>)[p] = v;
        return true;
      }
    }
  ) as unknown as CanvasRenderingContext2D;
}

describe('MoleWhack spawning', () => {
  it('hides face mask for readability', () => {
    expect(new MoleWhack().hideFace).toBe(true);
  });
  it('starts with 6 hidden moles and spawns one on the first tick', () => {
    const g = new MoleWhack();
    g.start();
    expect(g.moles).toHaveLength(MOLE_SLOTS);
    expect(g.moles.every((m) => m.phase === 'hidden')).toBe(true);
    g.tick(neutral(), 16);
    expect(g.aliveCount()).toBe(1);
  });
  it('spawns randomly without repeating the last slot immediately', () => {
    const g = new MoleWhack();
    g.start();
    const priv = g as unknown as { spawnRandom(): void };
    const seen: number[] = [];
    for (let i = 0; i < 30; i++) {
      priv.spawnRandom();
      const up = g.moles.filter((m) => m.phase !== 'hidden');
      expect(up).toHaveLength(1);
      seen.push(up[0].slot);
      if (seen.length > 1) expect(seen[seen.length - 1]).not.toBe(seen[seen.length - 2]);
      up[0].phase = 'hidden';
    }
    expect(new Set(seen).size).toBeGreaterThan(1);
  });
  it('emits miss only after a mole fully exits', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(2);
    const types: string[] = [];
    // 올라와 있는 시간(1100ms)이 지나 내려가기 시작해도 아직 놓침이 아니다.
    for (let i = 0; i < 75; i++) types.push(...g.tick(neutral(), 16).map((e) => e.type));
    expect(g.moles[2].phase).toBe('falling');
    expect(types).not.toContain('miss');
    // 완전히 내려가면 그때 놓침.
    for (let i = 0; i < 45; i++) types.push(...g.tick(neutral(), 16).map((e) => e.type));
    expect(types).toContain('miss');
    expect(g.missed).toBe(1);
    expect(g.board.combo).toBe(0);
  });
  it('scores when hitting a mole while it exits', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(2);
    // 내려가는 도중까지 가만히 둔다.
    for (let i = 0; i < 75; i++) g.tick(neutral(), 16);
    expect(g.moles[2].phase).toBe('falling');
    const m = g.moles[2];
    const head = g.headPos(2, 640, 480, g.progressOf(m));
    // 손을 올렸다가 내려치는 중의 머리를 맞히면 득점.
    g.tick(handsFrame(0, 0, head.x, 200 - MOLE_ARM_DY - 10), 16);
    const now = g.headPos(2, 640, 480, g.progressOf(g.moles[2]));
    const events = g.tick(handsFrame(0, 0, now.x, now.y), 16);
    expect(events.map((e) => e.type)).toContain('catch');
    expect(g.caught).toBe(1);
    expect(g.missed).toBe(0);
  });
});

describe('MoleWhack chop judgement', () => {
  it('does not hit when the hand only moves from below (never raised)', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(2);
    const head = g.headPos(2, 640, 480, 1);
    const types: string[] = [];
    // 어깨(200)보다 아래에서만: 손을 두더지 머리 바로 위에 대고 비벼도 무장 안 됨.
    for (let i = 0; i < 5; i++) {
      types.push(...g.tick(handsFrame(0, 0, head.x, head.y - 10 + i), 16).map((e) => e.type));
    }
    expect(types).not.toContain('catch');
    expect(g.caught).toBe(0);
    expect(g.hands.right.armed).toBe(false);
  });
  it('hits when the hand is raised above the shoulder and chopped down', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(2);
    const head = g.headPos(2, 640, 480, 1);
    // 1) 손을 어깨 위로 올리면 무장 래치.
    g.tick(handsFrame(0, 0, head.x, 200 - MOLE_ARM_DY - 10), 16);
    expect(g.hands.right.armed).toBe(true);
    // 2) 두더지 머리로 내려치면 타격.
    const events = g.tick(handsFrame(0, 0, head.x, head.y), 16);
    expect(events.map((e) => e.type)).toContain('catch');
    expect(g.caught).toBe(1);
    expect(g.moles[2].phase).toBe('hit');
    // 타격 후 무장은 소모되어 다시 올려야 한다.
    expect(g.hands.right.armed).toBe(false);
  });
  it('does not hit when an armed hand slides in sideways without moving down', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(2);
    const head = g.headPos(2, 640, 480, 1);
    // 무장 후 두더지 옆(반경 밖)까지 내려간다: 아래로 움직이지만 닿지 않아 타격 없음.
    g.tick(handsFrame(0, 0, head.x, 200 - MOLE_ARM_DY - 10), 16);
    g.tick(handsFrame(0, 0, head.x + MOLE_HIT_R + 12, head.y), 16);
    expect(g.caught).toBe(0);
    // 같은 높이로 옆에서 미끄러지듯 들어오면(하강 속도≈0) 반경 안이어도 타격 없음.
    const events = g.tick(handsFrame(0, 0, head.x + MOLE_HIT_R - 4, head.y), 16);
    expect(events.map((e) => e.type)).not.toContain('catch');
    expect(g.caught).toBe(0);
  });
  it('hits generously near the face (beyond the old strict radius)', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(2);
    const head = g.headPos(2, 640, 480, 1);
    expect(g.moleSize(640)).toBeGreaterThanOrEqual(44);
    expect(g.moleSize(640)).toBeLessThanOrEqual(72);
    g.tick(handsFrame(0, 0, head.x, 200 - MOLE_ARM_DY - 10), 16);
    // 얼굴 중심에서 64px 옆: 예전 기준(56px)으로는 빗나가지만 지금은 맞는다.
    const events = g.tick(handsFrame(0, 0, head.x + 64, head.y), 16);
    expect(events.map((e) => e.type)).toContain('catch');
    expect(g.caught).toBe(1);
  });
  it('hits even with a slow chop', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(2);
    const head = g.headPos(2, 640, 480, 1);
    g.tick(handsFrame(0, 0, head.x, 200 - MOLE_ARM_DY - 10), 16);
    // 반경 바로 밖까지 내려간다 (아직 안 맞음).
    g.tick(handsFrame(0, 0, head.x, head.y - (MOLE_HIT_R + 1)), 16);
    expect(g.caught).toBe(0);
    // 이후 1px씩 천천히 내려도 (하강 속도 62.5px/s) 반경에 들어오면 맞는다.
    let hit = false;
    for (let i = 0; i < 5; i++) {
      const y = head.y - MOLE_HIT_R + i;
      const ev = g.tick(handsFrame(0, 0, head.x, y), 16);
      if (ev.some((e) => e.type === 'catch')) hit = true;
    }
    expect(hit).toBe(true);
    expect(g.caught).toBe(1);
  });
  it('needs re-arming for the next mole after a hit', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(2);
    const head = g.headPos(2, 640, 480, 1);
    g.tick(handsFrame(0, 0, head.x, 200 - MOLE_ARM_DY - 10), 16);
    g.tick(handsFrame(0, 0, head.x, head.y), 16);
    expect(g.caught).toBe(1);
    // 무장 없이 다음 두더지를 내려쳐도 안 잡힌다.
    g.forceSpawn(4);
    const head2 = g.headPos(4, 640, 480, 1);
    const events = g.tick(handsFrame(0, 0, head2.x, head2.y), 16);
    expect(events.map((e) => e.type)).not.toContain('catch');
    expect(g.caught).toBe(1);
  });
  it('does not crash when hands are lost', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(1);
    expect(() => g.tick(frame([]), 16)).not.toThrow();
    expect(g.caught).toBe(0);
  });
});

describe('MoleWhack difficulty ramp', () => {
  it('gets faster over time', () => {
    const g = new MoleWhack();
    expect(g.visibleMsAt(0)).toBe(MOLE_VISIBLE_START_MS);
    expect(g.visibleMsAt(60000)).toBe(MOLE_VISIBLE_END_MS);
    expect(g.visibleMsAt(50000)).toBeLessThan(g.visibleMsAt(0));
    expect(g.spawnMsAt(50000)).toBeLessThan(g.spawnMsAt(0));
    expect(g.riseMsAt(50000)).toBeLessThan(g.riseMsAt(0));
  });
  it('allows 1 mole early and 2 moles late', () => {
    const g = new MoleWhack();
    expect(g.maxAliveAt(0)).toBe(1);
    expect(g.maxAliveAt(MOLE_DOUBLE_AT_MS - 1)).toBe(1);
    expect(g.maxAliveAt(MOLE_DOUBLE_AT_MS)).toBe(2);
  });
  it('rises and falls slowly (easier than before)', () => {
    const g = new MoleWhack();
    expect(g.riseMsAt(0)).toBe(MOLE_RISE_START_MS);
    expect(g.riseMsAt(60000)).toBe(MOLE_RISE_END_MS);
    expect(MOLE_RISE_START_MS).toBeGreaterThanOrEqual(400);
  });
  it('rises from below and sinks back down (not the reverse)', () => {
    const g = new MoleWhack();
    const hy = g.holeY(480);
    const size = g.moleSize(640);
    // 완전히 올라오면 구멍선에 앉는다.
    expect(g.moleBaseY(hy, size, 1)).toBe(hy + 4);
    // 숨은 상태에서는 몸 전체가 구멍선 클립 아래에 묻힌다.
    expect(g.moleBaseY(hy, size, 0) - size * 1.5).toBeGreaterThan(hy + 2);
    // 올라올수록(=p가 클수록) 몸통 바닥선이 위로 이동한다 (아래→위 등장, 위→아래 퇴장).
    const y0 = g.moleBaseY(hy, size, 0);
    const yHalf = g.moleBaseY(hy, size, 0.5);
    const y1 = g.moleBaseY(hy, size, 1);
    expect(yHalf).toBeLessThan(y0);
    expect(y1).toBeLessThan(yHalf);
  });
  it('narrows hole spacing toward the center symmetrically', () => {
    const g = new MoleWhack();
    const xs = [0, 1, 2, 3, 4, 5].map((s) => g.slotX(s, 640));
    // 가운데(320) 대칭.
    for (let i = 0; i < 6; i++) expect(xs[i] + xs[5 - i]).toBeCloseTo(640, 6);
    // 균등 6분할보다 안쪽으로 모여 있다.
    expect(xs[0]).toBeGreaterThan(640 / 12);
    expect(xs[5]).toBeLessThan(640 - 640 / 12);
    // 간격이 균등하다 (0.85배로 좁혀진 등간격).
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    for (const gap of gaps) expect(gap).toBeCloseTo((640 / 6) * MOLE_SPREAD, 6);
  });
});

describe('MoleWhack drawing', () => {
  it('draws holes, moles and badges without throwing', () => {
    const g = new MoleWhack();
    g.start();
    g.forceSpawn(0);
    g.forceSpawn(3);
    expect(() => g.draw(proxyCtx(), 640, 480)).not.toThrow();
  });
});
