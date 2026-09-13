export declare enum Role {
    SUPERADMIN = "SUPERADMIN",
    EVENT_ORGANIZER = "EVENT_ORGANIZER",
    PARTICIPANT_TEAM = "PARTICIPANT_TEAM"
}
export declare enum RoundStatus {
    CREATED = "CREATED",
    LOBBY_OPEN = "LOBBY_OPEN",
    LOBBY_LOCKED = "LOBBY_LOCKED",
    ROUND_ACTIVE = "ROUND_ACTIVE",
    ROUND_PAUSED = "ROUND_PAUSED",
    ROUND_ENDED = "ROUND_ENDED",
    SCORING_COMPLETE = "SCORING_COMPLETE",
    RESULTS_PUBLISHED = "RESULTS_PUBLISHED"
}
export declare enum ViolationType {
    TAB_SWITCH = "TAB_SWITCH",
    WINDOW_BLUR = "WINDOW_BLUR",
    FULLSCREEN_EXIT = "FULLSCREEN_EXIT",
    KEYBOARD_SHORTCUT = "KEYBOARD_SHORTCUT",
    CONTEXT_MENU = "CONTEXT_MENU",
    NETWORK_DISCONNECT = "NETWORK_DISCONNECT"
}
export interface UserDTO {
    id: string;
    username: string;
    role: Role;
}
export interface TeamDTO {
    id: string;
    teamName: string;
    member1Name: string;
    member1RegNo: string;
    member2Name: string;
    member2RegNo: string;
    isDisqualified: boolean;
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
    roundName: string;
    durationMinutes: number;
    marksPerCorrect: number;
    penaltyPerWrong: number;
    startTime?: string | null;
    endTime?: string | null;
    status: RoundStatus;
}
export interface OptionDTO {
    id: string;
    questionId: string;
    optionLetter: string;
    optionText: string;
    isCorrect?: boolean;
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
    teamId: string;
    roundId: string;
    startedAt: string;
    submittedAt?: string | null;
    isCompleted: boolean;
}
export interface AnswerSubmissionDTO {
    id: string;
    teamId: string;
    roundId: string;
    questionId: string;
    selectedOptionId?: string | null;
    isCorrect?: boolean | null;
    pointsAwarded?: number | null;
    submittedAt: string;
}
export interface AntiCheatLogDTO {
    id: string;
    teamId: string;
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
    userAnswers: Record<string, string>;
    isCompleted: boolean;
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}
//# sourceMappingURL=index.d.ts.map