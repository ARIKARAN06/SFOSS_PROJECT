export enum Role {
  SUPERADMIN = 'SUPERADMIN',
  EVENT_ORGANIZER = 'EVENT_ORGANIZER',
  PARTICIPANT_TEAM = 'PARTICIPANT_TEAM',
}

export enum RoundStatus {
  CREATED = 'CREATED',
  LOBBY_OPEN = 'LOBBY_OPEN',
  LOBBY_LOCKED = 'LOBBY_LOCKED',
  PRE_START = 'PRE_START',
  ROUND_ACTIVE = 'ROUND_ACTIVE',
  ROUND_PAUSED = 'ROUND_PAUSED',
  ROUND_ENDED = 'ROUND_ENDED',
  SCORING_COMPLETE = 'SCORING_COMPLETE',
  RESULTS_PUBLISHED = 'RESULTS_PUBLISHED',
}

export enum ViolationType {
  TAB_SWITCH = 'TAB_SWITCH',
  WINDOW_BLUR = 'WINDOW_BLUR',
  FULLSCREEN_EXIT = 'FULLSCREEN_EXIT',
  KEYBOARD_SHORTCUT = 'KEYBOARD_SHORTCUT',
  CONTEXT_MENU = 'CONTEXT_MENU',
  NETWORK_DISCONNECT = 'NETWORK_DISCONNECT',
  NETWORK_RECONNECT = 'NETWORK_RECONNECT',
  COPY_ATTEMPT = 'COPY_ATTEMPT',
  PASTE_ATTEMPT = 'PASTE_ATTEMPT',
  RELOAD_ATTEMPT = 'RELOAD_ATTEMPT',
}

export interface UserDTO {
  id: string;
  username: string;
  role: Role;
}

export interface TeamDTO {
  id: string;
  teamNumber?: number;
  teamName: string;
  member1Name?: string;
  member1RegNo?: string;
  member2Name?: string;
  member2RegNo?: string;
  isClaimed?: boolean;
  isDisqualified: boolean;
  isQualifiedForRound2?: boolean;
  player1Name?: string | null;
  player2Name?: string | null;
}

export interface RoundCompetitorDTO {
  id: string;
  roundId: string;
  originalTeamId: string;
  originalTeamNumber?: number;
  originalTeamName?: string;
  playerName: string;
  playerPosition: 'A' | 'B';
  competitorCode: string; // e.g. "01-A"
  isClaimed: boolean;
  isDisqualified: boolean;
  status: string;
}

export interface QuizRoomDTO {
  id: string;
  roomCode: string;
  title: string;
  status: RoundStatus;
  createdAt: string;
}

export interface QuizRoundDTO {
  id: string;
  roomId: string;
  roundNumber: number;
  roundName: string; // "SYNTRACE" | "DEBUGNOVA"
  durationMinutes: number;
  preStartDurationMinutes?: number;
  scheduledAnswerStartAt?: string | null;
  marksPerCorrect: number;
  penaltyPerWrong: number;
  startTime?: string | null;
  endTime?: string | null;
  status: RoundStatus;
}

export interface OptionDTO {
  id: string;
  questionId: string;
  optionLetter: string; // "A", "B", "C", "D"
  optionText: string;
  isCorrect?: boolean; // Concealed from participants
}

export interface QuestionDTO {
  id: string;
  roundId: string;
  questionNumber: number;
  questionText: string;
  codeSnippet?: string | null;
  explanation?: string | null;
  options: OptionDTO[];
}

export interface ParticipantSessionDTO {
  id: string;
  teamId?: string | null;
  competitorId?: string | null;
  roundId: string;
  startedAt: string;
  submittedAt?: string | null;
  isCompleted: boolean;
}

export interface AnswerSubmissionDTO {
  id: string;
  teamId?: string | null;
  competitorId?: string | null;
  roundId: string;
  questionId: string;
  selectedOptionId?: string | null;
  isCorrect?: boolean | null;
  pointsAwarded?: number | null;
  submittedAt: string;
}

export interface AntiCheatLogDTO {
  id: string;
  teamId?: string | null;
  competitorId?: string | null;
  roundId?: string | null;
  violationType: ViolationType;
  timestamp: string;
  metadata?: Record<string, unknown> | null;
}

export interface FinalResultDTO {
  id: string;
  teamId: string;
  teamName: string;
  roundId: string;
  roundName: string;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  score: number;
  rank?: number | null;
  antiCheatViolationCount?: number;
  lastSubmittedAt?: string | null;
}

export interface QuizStatePayload {
  roomCode: string;
  roundStatus: RoundStatus;
  roundName: string;
  durationMinutes: number;
  serverTime: string;
  startTime?: string | null;
  endTime?: string | null;
  remainingSeconds: number;
  questions: QuestionDTO[];
  userAnswers: Record<string, string>; // questionId -> selectedOptionId
  isCompleted: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
