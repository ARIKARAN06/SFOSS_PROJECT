import React, { useEffect, useState } from 'react';
import { fetchApi } from '../services/api';

interface AntiCheatGuardProps {
  teamId?: string;
  competitorId?: string;
  roundId?: string;
  active: boolean;
  onDisqualified?: (reason?: string) => void;
  children: React.ReactNode;
}

export const AntiCheatGuard: React.FC<AntiCheatGuardProps> = ({
  teamId,
  competitorId,
  roundId,
  active,
  onDisqualified,
  children,
}) => {
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);

  const reportViolation = async (type: string, details?: any) => {
    if (!active || (!teamId && !competitorId)) return;

    setViolationCount((prev) => prev + 1);

    const res = await fetchApi('/anticheat/log', {
      method: 'POST',
      body: JSON.stringify({
        teamId,
        competitorId,
        roundId,
        violationType: type,
        metadata: { roundId, timestamp: new Date().toISOString(), ...details },
      }),
    });

    if (res.success) {
      if (res.isDisqualified) {
        onDisqualified?.(res.disqualifiedReason);
        return;
      }
      if (res.violationCount >= 5) {
        setWarningMessage('🚨 CRITICAL VIOLATION: Multiple anti-cheat events detected! Your violations have been logged for organizer review.');
      } else {
        setWarningMessage(
          `⚠️ ANTI-CHEAT WARNING: Event logged (${type.replace('_', ' ')}). Warning ${res.violationCount}/5. Refrain from switching tabs or leaving window.`
        );
      }
    }
  };

  useEffect(() => {
    if (!active || (!teamId && !competitorId)) return;

    // 1. Visibility Change Listener (Tab Switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('TAB_SWITCH', { detail: 'Tab switched or window minimized' });
      }
    };

    // 2. Window Blur Listener (Focus Loss)
    const handleBlur = () => {
      reportViolation('WINDOW_BLUR', { detail: 'Window lost focus' });
    };

    // 3. Fullscreen Exit Listener
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        reportViolation('FULLSCREEN_EXIT', { detail: 'Fullscreen exited' });
      }
    };

    // 4. Refresh / Reload Attempt
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      reportViolation('RELOAD_ATTEMPT', { detail: 'Reload/navigation attempted' });
      e.preventDefault();
      e.returnValue = '';
    };

    // 5. Copy Attempt
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('COPY_ATTEMPT', { detail: 'Copy attempted' });
    };

    // 6. Paste Attempt
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('PASTE_ATTEMPT', { detail: 'Paste attempted' });
    };

    // 7. Right Click Context Menu Disable
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportViolation('CONTEXT_MENU', { detail: 'Right-click context menu attempted' });
    };

    // 8. Restricted Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+C, Ctrl+V, Alt+Tab
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
        (e.ctrlKey && (e.key === 'U' || e.key === 'u')) ||
        (e.ctrlKey && (e.key === 'C' || e.key === 'c' || e.key === 'V' || e.key === 'v'))
      ) {
        e.preventDefault();
        reportViolation('KEYBOARD_SHORTCUT', { key: e.key, ctrlKey: e.ctrlKey, altKey: e.altKey });
      }
    };

    // 9. Network Disconnect
    const handleOffline = () => {
      reportViolation('NETWORK_DISCONNECT', { detail: 'Network disconnected' });
    };

    // 10. Network Reconnect
    const handleOnline = () => {
      reportViolation('NETWORK_RECONNECT', { detail: 'Network reconnected' });
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [active, teamId, competitorId, roundId]);

  return (
    <>
      {children}

      {warningMessage && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box">
            <h2 style={{ color: '#D93838', marginBottom: '1rem', fontSize: '1.4rem' }}>
              🔒 ANTI-CHEAT DETECTION
            </h2>
            <p style={{ fontSize: '1rem', color: '#171717', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {warningMessage}
            </p>
            <button
              className="btn btn-danger"
              style={{ width: '100%' }}
              onClick={() => setWarningMessage(null)}
            >
              I Understand & Resume Quiz
            </button>
          </div>
        </div>
      )}
    </>
  );
};
