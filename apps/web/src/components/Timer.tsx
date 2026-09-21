import React from 'react';
import { useLocalCountdown } from '../hooks/useLocalCountdown';

interface TimerProps {
  endTime: string | Date | null;
  serverTime?: string | Date | number | null;
  onTimeExpired?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ endTime, serverTime, onTimeExpired }) => {
  const { secondsRemaining, formattedTime } = useLocalCountdown({
    targetDeadline: endTime,
    serverTime,
    onExpired: onTimeExpired,
  });

  if (!endTime) {
    return <span style={{ fontWeight: 700 }}>--:--</span>;
  }

  const isWarning = secondsRemaining <= 300; // 5 mins left

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: isWarning ? '#D93838' : '#176B5B',
        color: '#FFFFFF',
        padding: '0.4rem 1rem',
        borderRadius: '6px',
        fontWeight: 800,
        fontSize: '1.1rem',
        letterSpacing: '1px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'background 0.3s',
      }}
    >
      <span>⏱ TIME LEFT:</span>
      <span>{formattedTime}</span>
    </div>
  );
};
