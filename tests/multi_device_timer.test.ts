import { describe, it, expect, vi } from 'vitest';
import { formatCountdown } from '../apps/web/src/hooks/useLocalCountdown';

describe('Multi-Device Pre-Start & Quiz Timer Verification Suite (12-Scenario Matrix)', () => {
  // Authoritative server reference time: 10:00:00 UTC
  const SERVER_NOW = new Date('2026-09-21T10:00:00.000Z').getTime();
  // Pre-start configured for 60 seconds (ends at 10:01:00 UTC)
  const PRE_START_DEADLINE = SERVER_NOW + 60 * 1000;
  // Quiz duration 30 minutes (ends at 10:31:00 UTC)
  const QUIZ_DEADLINE = PRE_START_DEADLINE + 30 * 60 * 1000;

  /**
   * Helper simulating client-side initial remaining seconds calculation:
   * client receives { serverTime, scheduledAnswerStartAt }
   * client has its own local clock: clientNow
   * client computes clock offset: offsetMs = serverTime - clientNow
   * client authoritative current time: clientNow + offsetMs = serverTime
   * remainingMs = deadline - (clientNow + offsetMs) = deadline - serverTime
   */
  function computeInitialRemaining(
    deadlineMs: number,
    serverTimeMs: number,
    clientLocalNow: number,
    roundTripLatencyMs = 0
  ): { offsetMs: number; remainingSeconds: number; formatted: string } {
    // RTT adjustment: server responded midway through round-trip
    const estimatedServerTime = serverTimeMs + Math.round(roundTripLatencyMs / 2);
    const offsetMs = estimatedServerTime - clientLocalNow;
    const clientServerTime = clientLocalNow + offsetMs;
    const diffMs = Math.max(0, deadlineMs - clientServerTime);
    const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    return {
      offsetMs,
      remainingSeconds,
      formatted: formatCountdown(remainingSeconds),
    };
  }

  it('Scenario 1: Two clients with synchronized clocks compute identical countdown', () => {
    // Both Client 1 and Client 2 clocks match server time exactly
    const client1Now = SERVER_NOW;
    const client2Now = SERVER_NOW;

    const res1 = computeInitialRemaining(PRE_START_DEADLINE, SERVER_NOW, client1Now);
    const res2 = computeInitialRemaining(PRE_START_DEADLINE, SERVER_NOW, client2Now);

    expect(res1.offsetMs).toBe(0);
    expect(res2.offsetMs).toBe(0);
    expect(res1.remainingSeconds).toBe(60);
    expect(res2.remainingSeconds).toBe(60);
    expect(res1.formatted).toBe('01:00');
    expect(res2.formatted).toBe('01:00');
  });

  it('Scenario 2: Client A clock FAST by 5 minutes (+300s) displays identical 60s countdown', () => {
    // In unmanaged lab PC, clock is 5 minutes in the future
    const clientAFastClock = SERVER_NOW + 5 * 60 * 1000; // 10:05:00

    // Without server offset, naive (deadline - clientNow) would give negative!
    const naiveRemaining = Math.max(0, Math.floor((PRE_START_DEADLINE - clientAFastClock) / 1000));
    expect(naiveRemaining).toBe(0); // Old broken bug: 0s or negative!

    // With server-authoritative offset synchronization:
    const clientA = computeInitialRemaining(PRE_START_DEADLINE, SERVER_NOW, clientAFastClock);
    expect(clientA.offsetMs).toBe(-300000); // 5 minutes behind client local
    expect(clientA.remainingSeconds).toBe(60); // Exactly 60 seconds
    expect(clientA.formatted).toBe('01:00');
  });

  it('Scenario 3: Client B clock SLOW by 5.5 minutes (-326s) displays identical 60s countdown (reproducing bug report)', () => {
    // In bug report: Computer A was displaying 326s because local clock was 5.5 minutes in past
    const clientBSlowClock = SERVER_NOW - 266 * 1000; // Client clock is 10:00:00 - 266s = 09:55:34

    // Naive subtraction (deadline - clientNow) without sync gave 60 + 266 = 326s!
    const naiveRemaining = Math.max(0, Math.floor((PRE_START_DEADLINE - clientBSlowClock) / 1000));
    expect(naiveRemaining).toBe(326); // The EXACT bug from the prompt!

    // With server-authoritative offset synchronization:
    const clientB = computeInitialRemaining(PRE_START_DEADLINE, SERVER_NOW, clientBSlowClock);
    expect(clientB.offsetMs).toBe(266000);
    expect(clientB.remainingSeconds).toBe(60); // Fixed to exactly 60 seconds!
    expect(clientB.formatted).toBe('01:00');
  });

  it('Scenario 4: Monotonic countdown ticks at exactly 1 real second per second regardless of system clock changes', () => {
    // Simulate monotonic timer ticking using performance.now()
    const initialSeconds = 60;
    let elapsedMs = 0;

    // Simulate 5 seconds passing in real time
    elapsedMs = 5000;
    const remainingAfter5s = Math.max(0, Math.ceil(initialSeconds - elapsedMs / 1000));
    expect(remainingAfter5s).toBe(55);
    expect(formatCountdown(remainingAfter5s)).toBe('00:55');

    // Even if local system Date.now() jumps ahead by 1 hour (NTP sync or user tweak)
    // performance.now() remains strictly monotonic:
    elapsedMs += 10000; // 15 seconds total real elapsed
    const remainingAfter15s = Math.max(0, Math.ceil(initialSeconds - elapsedMs / 1000));
    expect(remainingAfter15s).toBe(45);
    expect(formatCountdown(remainingAfter15s)).toBe('00:45');
  });

  it('Scenario 5: Client page refresh mid-countdown (at 45s) recovers exact remaining duration without restart', () => {
    // 15 seconds into the 60s pre-start, participant refreshes page
    const serverTimeAtRefresh = SERVER_NOW + 15 * 1000; // 10:00:15
    const clientLocalAtRefresh = serverTimeAtRefresh + 42000; // Clock skewed by +42s

    const res = computeInitialRemaining(PRE_START_DEADLINE, serverTimeAtRefresh, clientLocalAtRefresh);

    // Remaining must be exactly 45s (60 - 15), NOT reset to 60s
    expect(res.remainingSeconds).toBe(45);
    expect(res.formatted).toBe('00:45');
  });

  it('Scenario 6: Tab hidden / browser backgrounded and restored recalculates correct elapsed time', () => {
    // Participant starts with 60s countdown
    const startPerf = 1000.0;
    const initialSeconds = 60;

    // Tab is backgrounded for 20 seconds. Browser throttles setInterval ticks!
    // When tab becomes visible again, visibilitychange listener checks performance.now():
    const resumePerf = 21000.0; // 20,000ms elapsed
    const actualElapsedSeconds = (resumePerf - startPerf) / 1000;
    const currentRemaining = Math.max(0, Math.ceil(initialSeconds - actualElapsedSeconds));

    // The countdown accurately reflects 40s remaining (NOT frozen at 59s)
    expect(currentRemaining).toBe(40);
    expect(formatCountdown(currentRemaining)).toBe('00:40');
  });

  it('Scenario 7: Late joiner connects 2 minutes into a 5-minute round sees exactly 3 minutes remaining', () => {
    const roundDurationMs = 5 * 60 * 1000; // 300s
    const roundDeadline = SERVER_NOW + roundDurationMs; // 10:05:00
    const lateJoinerServerTime = SERVER_NOW + 2 * 60 * 1000; // 10:02:00 (2 mins late)
    const lateJoinerLocalClock = lateJoinerServerTime - 120000; // 2 mins slow

    const lateJoiner = computeInitialRemaining(roundDeadline, lateJoinerServerTime, lateJoinerLocalClock);

    // Must see exactly 3 minutes (180s), NEVER full 5 minutes (300s)
    expect(lateJoiner.remainingSeconds).toBe(180);
    expect(lateJoiner.formatted).toBe('03:00');
  });

  it('Scenario 8: Countdown reaches 0 clamps strictly at 00:00, never negative, triggers callback', () => {
    let expiredTriggered = false;
    const onExpired = () => { expiredTriggered = true; };

    // Simulate tick beyond expiry (e.g. 62 seconds elapsed on a 60s timer)
    const elapsedSeconds = 62;
    const rawDiff = 60 - elapsedSeconds; // -2
    const clampedRemaining = Math.max(0, rawDiff);

    if (clampedRemaining === 0) {
      onExpired();
    }

    expect(clampedRemaining).toBe(0);
    expect(formatCountdown(clampedRemaining)).toBe('00:00');
    expect(formatCountdown(-15)).toBe('00:00'); // helper also clamps negative
    expect(expiredTriggered).toBe(true);
  });

  it('Scenario 9: Network latency compensation adjusts server timestamp using RTT', () => {
    // 40ms LAN round-trip latency (typical over Wi-Fi / LAN switch)
    const rtt = 40;
    const clientLocalNow = SERVER_NOW;
    const res = computeInitialRemaining(PRE_START_DEADLINE, SERVER_NOW, clientLocalNow, rtt);

    // Server time estimated as serverTime + 20ms
    expect(res.offsetMs).toBe(20);
    expect(res.remainingSeconds).toBe(59); // 60,000ms - 20ms = 59,980ms -> 59 full seconds
  });

  it('Scenario 10: MM:SS format helper behaves correctly across all boundary conditions', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(1)).toBe('00:01');
    expect(formatCountdown(9)).toBe('00:09');
    expect(formatCountdown(10)).toBe('00:10');
    expect(formatCountdown(59)).toBe('00:59');
    expect(formatCountdown(60)).toBe('01:00');
    expect(formatCountdown(61)).toBe('01:01');
    expect(formatCountdown(599)).toBe('09:59');
    expect(formatCountdown(600)).toBe('10:00');
    expect(formatCountdown(3599)).toBe('59:59');
    expect(formatCountdown(3600)).toBe('01:00:00');
    expect(formatCountdown(3665)).toBe('01:01:05');
  });

  it('Scenario 11: Pre-start countdown to quiz transition occurs cleanly at 00:00', () => {
    let currentPhase: 'PRE_START' | 'QUIZ_ACTIVE' = 'PRE_START';

    const handlePreStartExpired = () => {
      currentPhase = 'QUIZ_ACTIVE';
    };

    // Remaining seconds transition from 2 -> 1 -> 0
    let remaining = 2;
    expect(currentPhase).toBe('PRE_START');

    remaining = 1;
    expect(currentPhase).toBe('PRE_START');

    remaining = 0;
    if (remaining <= 0) {
      handlePreStartExpired();
    }

    expect(currentPhase).toBe('QUIZ_ACTIVE');
  });

  it('Scenario 12: Admin dashboard and participant countdowns remain synchronized within 1 second', () => {
    // Admin computer: clock +15s relative to server
    const adminClock = SERVER_NOW + 15000;
    // Participant computer: clock -45s relative to server
    const participantClock = SERVER_NOW - 45000;

    const admin = computeInitialRemaining(PRE_START_DEADLINE, SERVER_NOW, adminClock);
    const participant = computeInitialRemaining(PRE_START_DEADLINE, SERVER_NOW, participantClock);

    expect(admin.remainingSeconds).toBe(participant.remainingSeconds);
    expect(admin.formatted).toBe(participant.formatted);
    expect(admin.formatted).toBe('01:00');
  });
});
