import React, { useState, useEffect } from 'react';

interface TimerProps {
  endTime: string | Date | null;
  onTimeExpired?: () => void;
}

export const Timer: React.FC<TimerProps> = ({ endTime, onTimeExpired }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!endTime) {
      setSecondsRemaining(null);
      return;
    }

    const targetTime = new Date(endTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setSecondsRemaining(diff);

      if (diff === 0 && onTimeExpired) {
        onTimeExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime, onTimeExpired]);

  if (secondsRemaining === null) {
    return <span style={{ fontWeight: 700 }}>--:--</span>;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

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
      <span>{formatted}</span>
    </div>
  );
};
