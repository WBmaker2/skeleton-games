// src/game/storage.ts
export interface ScoreEntry { name: string; score: number }

export function saveScore(gameId: string, entry: ScoreEntry): void {
  const key = `skelplay:${gameId}`;
  const raw = localStorage.getItem(key);
  let list: ScoreEntry[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ScoreEntry[];
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }
  }
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(key, JSON.stringify(list.slice(0, 5)));
}

export function topScores(gameId: string, limit = 5): ScoreEntry[] {
  const raw = localStorage.getItem(`skelplay:${gameId}`);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as ScoreEntry[];
    return Array.isArray(list) ? list.slice(0, limit) : [];
  } catch {
    return [];
  }
}

export function shareLink(gameId: string): string {
  return `${window.location.origin}${window.location.pathname}#/${gameId}`;
}
