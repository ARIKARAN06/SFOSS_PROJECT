/**
 * Server-Authoritative Timer Utilities
 */

/**
 * Calculates remaining seconds based on server end timestamp and current server time.
 */
export function calculateRemainingSeconds(endTimeIso?: string | null): number {
  if (!endTimeIso) return 0;
  const endMs = new Date(endTimeIso).getTime();
  const nowMs = Date.now();
  const remainingMs = endMs - nowMs;
  return Math.max(0, Math.floor(remainingMs / 1000));
}

/**
 * Checks if a quiz round has expired based on server end timestamp.
 */
export function isRoundExpired(endTimeIso?: string | null): boolean {
  if (!endTimeIso) return false;
  return Date.now() >= new Date(endTimeIso).getTime();
}

/**
 * Formats seconds into MM:SS display string (e.g. 05:42).
 */
export function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const padMins = String(mins).padStart(2, '0');
  const padSecs = String(secs).padStart(2, '0');
  return `${padMins}:${padSecs}`;
}
