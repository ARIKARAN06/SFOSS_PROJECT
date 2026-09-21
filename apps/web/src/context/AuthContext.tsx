import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchApi } from '../services/api';

export interface UserAuth {
  userId: string;
  username: string;
  role: 'SUPERADMIN' | 'EVENT_ORGANIZER' | 'PARTICIPANT_TEAM';
  teamId?: string;
  teamName?: string;
  competitorId?: string;
  competitorCode?: string;
  playerName?: string;
  originalTeamName?: string;
  originalTeamNumber?: number;
  sessionToken?: string;
}

interface AuthContextType {
  user: UserAuth | null;
  token: string | null;
  sessionToken: string | null;
  login: (token: string, user: UserAuth, sessionToken?: string) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAuth | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sfoss_token'));
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem('sfoss_session_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      // 1. Participant transparent session recovery (Team or Competitor)
      const savedSessionToken = localStorage.getItem('sfoss_session_token');
      if (savedSessionToken) {
        const res = await fetchApi('/participant/restore-session', {
          method: 'POST',
          body: JSON.stringify({ sessionToken: savedSessionToken }),
        });

        if (res.success) {
          localStorage.setItem('sfoss_token', res.token);
          setToken(res.token);
          setSessionToken(savedSessionToken);

          if (res.competitor) {
            setUser({
              userId: res.competitor.id,
              username: `${res.competitor.playerName} (${res.competitor.competitorCode})`,
              role: 'PARTICIPANT_TEAM',
              competitorId: res.competitor.id,
              competitorCode: res.competitor.competitorCode,
              playerName: res.competitor.playerName,
              originalTeamName: res.competitor.originalTeamName,
              originalTeamNumber: res.competitor.originalTeamNumber,
              sessionToken: savedSessionToken,
            });
          } else if (res.team) {
            setUser({
              userId: res.team.id,
              username: res.team.teamName,
              role: 'PARTICIPANT_TEAM',
              teamId: res.team.id,
              teamName: res.team.teamName,
              sessionToken: savedSessionToken,
            });
          }
          setLoading(false);
          return;
        } else {
          localStorage.removeItem('sfoss_session_token');
        }
      }

      // 2. Admin auth verification
      if (token) {
        const res = await fetchApi('/auth/me');
        if (res.success && res.user) {
          setUser(res.user);
        } else {
          localStorage.removeItem('sfoss_token');
          setToken(null);
          setUser(null);
        }
      }

      setLoading(false);
    }

    verifyAuth();
  }, []);

  const login = (newToken: string, newUser: UserAuth, newSessionToken?: string) => {
    localStorage.setItem('sfoss_token', newToken);
    setToken(newToken);
    if (newSessionToken) {
      localStorage.setItem('sfoss_session_token', newSessionToken);
      setSessionToken(newSessionToken);
    }
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('sfoss_token');
    localStorage.removeItem('sfoss_session_token');
    setToken(null);
    setSessionToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, sessionToken, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
