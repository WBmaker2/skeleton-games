// src/game/storage.ts
export interface ScoreEntry { name: string; score: number }

export function saveScore(gameId: string, entry: ScoreEntry): void {
  const key = `skelplay:${gameId}`;
  const raw = localStorage.getItem(key);
  const list: ScoreEntry[] = raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(key, JSON.stringify(list.slice(0, 5)));
}

export function topScores(gameId: string, limit = 5): ScoreEntry[] {
  const raw = localStorage.getItem(`skelplay:${gameId}`);
  const list: ScoreEntry[] = raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  return list.slice(0, limit);
}

export function shareLink(gameId: string): string {
  return `${window.location.origin}${window.location.pathname}#/${gameId}`;
}
