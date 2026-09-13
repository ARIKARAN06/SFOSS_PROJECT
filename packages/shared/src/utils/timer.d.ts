/**
 * Server-Authoritative Timer Utilities
 */
/**
 * Calculates remaining seconds based on server end timestamp and current server time.
 */
export declare function calculateRemainingSeconds(endTimeIso?: string | null): number;
/**
 * Checks if a quiz round has expired based on server end timestamp.
 */
export declare function isRoundExpired(endTimeIso?: string | null): boolean;
/**
 * Formats seconds into MM:SS display string (e.g. 05:42).
 */
export declare function formatTimerDisplay(seconds: number): string;
//# sourceMappingURL=timer.d.ts.map