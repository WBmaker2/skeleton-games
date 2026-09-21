// src/game/storage.ts
export interface ScoreEntry {
  name: string;
  score: number;
  // 저장 시각(ms). 구버전 항목에는 없을 수 있다.
  date?: number;
}

function readList(gameId: string): ScoreEntry[] {
  const raw = localStorage.getItem(`skelplay:${gameId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(gameId: string, list: ScoreEntry[]): void {
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(`skelplay:${gameId}`, JSON.stringify(list.slice(0, 5)));
}

export function saveScore(gameId: string, entry: ScoreEntry): void {
  const list = readList(gameId);
  list.push({ ...entry, date: entry.date ?? Date.now() });
  writeList(gameId, list);
}

export function updateScore(gameId: string, index: number, entry: ScoreEntry): void {
  const list = readList(gameId);
  if (index < 0 || index >= list.length) return;
  list[index] = { ...entry, date: entry.date ?? list[index].date ?? Date.now() };
  writeList(gameId, list);
}

export function removeScore(gameId: string, index: number): void {
  const list = readList(gameId);
  if (index < 0 || index >= list.length) return;
  list.splice(index, 1);
  writeList(gameId, list);
}

export function topScores(gameId: string, limit = 5): ScoreEntry[] {
  return readList(gameId).slice(0, limit);
}

export function shareLink(gameId: string): string {
  return `${window.location.origin}${window.location.pathname}#/${gameId}`;
}
