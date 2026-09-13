import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { TeamLogin } from './pages/TeamLogin';
import { AdminLogin } from './pages/AdminLogin';
import { TeamLobby } from './pages/TeamLobby';
import { QuizView } from './pages/QuizView';
import { SubmissionSuccess } from './pages/SubmissionSuccess';
import { TeamResults } from './pages/TeamResults';
import { AdminDashboard } from './pages/AdminDashboard';

const MainContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [viewState, setViewState] = useState<
    'team_login' | 'admin_login' | 'lobby' | 'quiz' | 'submitted' | 'results'
  >('team_login');
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);

  if (loading) {
    return <div style={{ color: '#FFFFFF', textAlign: 'center', padding: '4rem' }}>Initializing Platform...</div>;
  }

  // Not authenticated
  if (!user) {
    if (viewState === 'admin_login') {
      return <AdminLogin onSwitchToTeam={() => setViewState('team_login')} />;
    }
    return <TeamLogin onSwitchToAdmin={() => setViewState('admin_login')} />;
  }

  // Admin user
  if (user.role === 'SUPERADMIN' || user.role === 'EVENT_ORGANIZER') {
    return <AdminDashboard />;
  }

  // Participant team user
  if (viewState === 'quiz' && activeRoundId) {
    return (
      <QuizView
        roundId={activeRoundId}
        onSubmitted={() => setViewState('submitted')}
      />
    );
  }

  if (viewState === 'submitted') {
    return <SubmissionSuccess onReturnToLobby={() => setViewState('lobby')} />;
  }

  if (viewState === 'results' && activeRoundId) {
    return <TeamResults roundId={activeRoundId} />;
  }

  return (
    <TeamLobby
      onStartQuiz={(roundId) => {
        setActiveRoundId(roundId);
        setViewState('quiz');
      }}
    />
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="app-container">
        <Header />
        <main>
          <MainContent />
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;
