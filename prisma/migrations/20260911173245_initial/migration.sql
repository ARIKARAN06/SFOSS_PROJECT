-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'EVENT_ORGANIZER', 'PARTICIPANT_TEAM');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('CREATED', 'LOBBY_OPEN', 'LOBBY_LOCKED', 'ROUND_ACTIVE', 'ROUND_PAUSED', 'ROUND_ENDED', 'SCORING_COMPLETE', 'RESULTS_PUBLISHED');

-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'KEYBOARD_SHORTCUT', 'CONTEXT_MENU', 'NETWORK_DISCONNECT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PARTICIPANT_TEAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "passcode" TEXT NOT NULL,
    "member1Name" TEXT NOT NULL,
    "member1RegNo" TEXT NOT NULL,
    "member2Name" TEXT NOT NULL,
    "member2RegNo" TEXT NOT NULL,
    "isDisqualified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizRoom" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizRound" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "roundName" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "marksPerCorrect" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "penaltyPerWrong" DOUBLE PRECISION NOT NULL DEFAULT -1.0,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "status" "RoundStatus" NOT NULL DEFAULT 'CREATED',

    CONSTRAINT "QuizRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "codeSnippet" TEXT,
    "explanation" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionLetter" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSession" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionOrder" JSONB NOT NULL,
    "optionOrder" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerSubmission" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN,
    "pointsAwarded" DOUBLE PRECISION,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AntiCheatLog" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "violationType" "ViolationType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "AntiCheatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinalResult" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "totalCorrect" INTEGER NOT NULL DEFAULT 0,
    "totalWrong" INTEGER NOT NULL DEFAULT 0,
    "totalUnanswered" INTEGER NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinalResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Team_userId_key" ON "Team"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_teamName_key" ON "Team"("teamName");

-- CreateIndex
CREATE UNIQUE INDEX "QuizRoom_roomCode_key" ON "QuizRoom"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSession_teamId_roundId_key" ON "ParticipantSession"("teamId", "roundId");

-- CreateIndex
CREATE INDEX "AnswerSubmission_teamId_roundId_idx" ON "AnswerSubmission"("teamId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerSubmission_teamId_roundId_questionId_key" ON "AnswerSubmission"("teamId", "roundId", "questionId");

-- CreateIndex
CREATE INDEX "AntiCheatLog_teamId_timestamp_idx" ON "AntiCheatLog"("teamId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "FinalResult_teamId_roundId_key" ON "FinalResult"("teamId", "roundId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizRound" ADD CONSTRAINT "QuizRound_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "QuizRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "QuizRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "QuizRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSubmission" ADD CONSTRAINT "AnswerSubmission_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSubmission" ADD CONSTRAINT "AnswerSubmission_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "QuizRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSubmission" ADD CONSTRAINT "AnswerSubmission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerSubmission" ADD CONSTRAINT "AnswerSubmission_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntiCheatLog" ADD CONSTRAINT "AntiCheatLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalResult" ADD CONSTRAINT "FinalResult_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalResult" ADD CONSTRAINT "FinalResult_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "QuizRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
