import { useState, useEffect, useRef } from 'react';

export interface UseLocalCountdownOptions {
  targetDeadline?: string | Date | number | null;
  serverTime?: string | Date | number | null;
  initialSeconds?: number | null;
  onExpired?: () => void;
}

export interface UseLocalCountdownResult {
  secondsRemaining: number;
  formattedTime: string;
  isExpired: boolean;
  minutes: number;
  seconds: number;
}

export function formatCountdown(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) {
    return '00:00';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * useLocalCountdown provides a client-local monotonic countdown.
 * It establishes remaining seconds based on server-provided target and current time,
 * then counts down strictly using performance.now() to prevent local system clock tampering
 * or interval drift from compromising the timer.
 */
export function useLocalCountdown({
  targetDeadline,
  serverTime,
  initialSeconds,
  onExpired,
}: UseLocalCountdownOptions): UseLocalCountdownResult {
  const calculateInitialSeconds = (): number => {
    if (typeof initialSeconds === 'number') {
      return Math.max(0, initialSeconds);
    }
    if (!targetDeadline) return 0;
    const targetMs = new Date(targetDeadline).getTime();
    if (isNaN(targetMs)) return 0;

    // Use server-authoritative time if available; otherwise fallback safely
    const currentMs = serverTime ? new Date(serverTime).getTime() : Date.now();
    if (isNaN(currentMs)) return 0;

    return Math.max(0, Math.floor((targetMs - currentMs) / 1000));
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateInitialSeconds);

  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  const hasExpiredRef = useRef(false);

  useEffect(() => {
    hasExpiredRef.current = false;
    const initialDuration = calculateInitialSeconds();
    setSecondsRemaining(initialDuration);

    if (initialDuration <= 0) {
      if (!hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpiredRef.current?.();
      }
      return;
    }

    // Capture baseline monotonic timestamp
    const startPerfTime = performance.now();

    const updateRemaining = () => {
      const elapsedMs = performance.now() - startPerfTime;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const remaining = Math.max(0, initialDuration - elapsedSec);

      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        if (!hasExpiredRef.current) {
          hasExpiredRef.current = true;
          onExpiredRef.current?.();
        }
      }
    };

    const interval = setInterval(updateRemaining, 250);

    // Instant recovery on tab switch / wake from sleep
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateRemaining();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', updateRemaining);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', updateRemaining);
    };
  }, [
    targetDeadline ? new Date(targetDeadline).getTime() : null,
    serverTime ? new Date(serverTime).getTime() : null,
    initialSeconds,
  ]);

  const isExpired = secondsRemaining <= 0;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = formatCountdown(secondsRemaining);

  return {
    secondsRemaining,
    formattedTime,
    isExpired,
    minutes,
    seconds,
  };
}
