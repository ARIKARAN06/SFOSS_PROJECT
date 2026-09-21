import { prisma } from '../db/client';
import { ENV } from '../config/env';
import { shuffleQuestionsForTeam, RoundStatus, QuestionDTO } from '@sfoss/shared';

export interface QuizSessionParams {
  teamId?: string;
  competitorId?: string;
  roundId: string;
}

export async function getOrCreateParticipantSession({ teamId, competitorId, roundId }: QuizSessionParams) {
  let round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error('Quiz round not found.');
  }

  // Check if participant is disqualified
  if (competitorId) {
    const comp = await prisma.roundCompetitor.findUnique({ where: { id: competitorId } });
    if (comp?.isDisqualified) {
      return {
        status: 'DISQUALIFIED',
        isDisqualified: true,
        disqualificationReason: comp.disqualifiedReason || 'Anti-cheat violation',
        reason: comp.disqualifiedReason || 'Anti-cheat violation',
        competitor: {
          id: comp.id,
          code: comp.competitorCode,
          competitorCode: comp.competitorCode,
          playerName: comp.playerName,
        },
        session: { isCompleted: true },
        round,
        questions: [],
        savedAnswers: {},
      };
    }
  } else if (teamId) {
    const tm = await prisma.team.findUnique({ where: { id: teamId } });
    if (tm?.isDisqualified) {
      return {
        status: 'DISQUALIFIED',
        isDisqualified: true,
        disqualificationReason: tm.disqualifiedReason || 'Anti-cheat violation',
        reason: tm.disqualifiedReason || 'Anti-cheat violation',
        team: {
          id: tm.id,
          teamNumber: tm.teamNumber,
          teamName: tm.teamName,
        },
        session: { isCompleted: true },
        round,
        questions: [],
        savedAnswers: {},
      };
    }
  }

  // Auto-transition PRE_START if scheduled time arrived
  if (
    round.status === RoundStatus.PRE_START &&
    round.scheduledAnswerStartAt &&
    new Date() >= new Date(round.scheduledAnswerStartAt)
  ) {
    round = await prisma.quizRound.update({
      where: { id: round.id },
      data: { status: RoundStatus.ROUND_ACTIVE },
    });
    await prisma.quizRoom.update({
      where: { id: round.roomId },
      data: { status: RoundStatus.ROUND_ACTIVE },
    });
  }

  // If still in PRE_START, return waiting countdown info without revealing questions
  if (round.status === RoundStatus.PRE_START) {
    return {
      isPreStart: true,
      serverTime: new Date().toISOString(),
      serverTimestamp: Date.now(),
      session: {
        id: 'pre-start',
        startedAt: round.startTime,
        submittedAt: null,
        isCompleted: false,
      },
      round: {
        id: round.id,
        roundNumber: round.roundNumber,
        roundName: round.roundName,
        status: round.status,
        durationMinutes: round.durationMinutes,
        preStartDurationMinutes: round.preStartDurationMinutes,
        startTime: round.startTime,
        scheduledAnswerStartAt: round.scheduledAnswerStartAt,
        endTime: round.endTime,
      },
      questions: [],
      savedAnswers: {},
    };
  }

  // Find existing session
  let session = competitorId
    ? await prisma.participantSession.findUnique({
        where: { competitorId_roundId: { competitorId, roundId } },
      })
    : teamId
    ? await prisma.participantSession.findUnique({
        where: { teamId_roundId: { teamId, roundId } },
      })
    : null;

  // Get master questions with options for this round
  const masterQuestions = await prisma.question.findMany({
    where: { roundId },
    orderBy: { questionNumber: 'asc' },
    include: {
      options: {
        orderBy: { optionLetter: 'asc' },
      },
    },
  });

  if (masterQuestions.length === 0) {
    throw new Error('No questions available for this round yet.');
  }

  // Format master questions into DTOs
  const questionDTOs: QuestionDTO[] = masterQuestions.map((q: any) => ({
    id: q.id,
    roundId: q.roundId,
    questionNumber: q.questionNumber,
    questionText: q.questionText,
    codeSnippet: q.codeSnippet || undefined,
    explanation: q.explanation || undefined,
    options: q.options.map((opt: any) => ({
      id: opt.id,
      questionId: opt.questionId,
      optionLetter: opt.optionLetter,
      optionText: opt.optionText,
      isCorrect: false, // Conceal correct answer
    })),
  }));

  const seedId = competitorId || teamId || 'default-seed';

  if (!session) {
    // Deterministic question shuffle, fixed option order
    const shuffleResult = shuffleQuestionsForTeam(
      questionDTOs,
      seedId,
      roundId,
      ENV.SHUFFLE_SALT
    );

    session = await prisma.participantSession.create({
      data: {
        teamId: competitorId ? null : teamId,
        competitorId: competitorId ? competitorId : null,
        roundId,
        questionOrder: shuffleResult.questionOrder,
        optionOrder: shuffleResult.optionOrder,
      },
    });
  }

  // Reconstruct ordered questions
  const questionOrder = session.questionOrder as string[];
  const masterQMap = new Map(questionDTOs.map((q) => [q.id, q]));

  const orderedQuestions: QuestionDTO[] = [];
  for (const qId of questionOrder) {
    const originalQ = masterQMap.get(qId);
    if (!originalQ) continue;

    // Strict fixed Admin order (A, B, C, D) for all participants
    const orderedOpts = [...originalQ.options].sort((a, b) =>
      (a.optionLetter || '').localeCompare(b.optionLetter || '')
    );

    orderedQuestions.push({
      ...originalQ,
      options: orderedOpts,
    });
  }

  // Get saved submissions
  const savedAnswers = competitorId
    ? await prisma.answerSubmission.findMany({ where: { competitorId, roundId } })
    : await prisma.answerSubmission.findMany({ where: { teamId, roundId } });

  const savedAnswerMap: Record<string, string> = {};
  savedAnswers.forEach((ans: any) => {
    if (ans.selectedOptionId) {
      savedAnswerMap[ans.questionId] = ans.selectedOptionId;
    }
  });

  return {
    serverTime: new Date().toISOString(),
    serverTimestamp: Date.now(),
    session: {
      id: session.id,
      startedAt: session.startedAt,
      submittedAt: session.submittedAt,
      isCompleted: session.isCompleted,
    },
    round: {
      id: round.id,
      roundNumber: round.roundNumber,
      roundName: round.roundName,
      status: round.status,
      durationMinutes: round.durationMinutes,
      startTime: round.startTime,
      endTime: round.endTime,
      scheduledAnswerStartAt: round.scheduledAnswerStartAt,
    },
    questions: orderedQuestions,
    savedAnswers: savedAnswerMap,
  };
}

export async function saveAnswer({
  teamId,
  competitorId,
  roundId,
  questionId,
  selectedOptionId,
}: {
  teamId?: string;
  competitorId?: string;
  roundId: string;
  questionId: string;
  selectedOptionId: string | null;
}) {
  let round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error('Quiz round not found.');
  }

  // Check auto transition if PRE_START
  if (round.status === RoundStatus.PRE_START) {
    if (round.scheduledAnswerStartAt && new Date() >= new Date(round.scheduledAnswerStartAt)) {
      round = await prisma.quizRound.update({
        where: { id: round.id },
        data: { status: RoundStatus.ROUND_ACTIVE },
      });
      await prisma.quizRoom.update({
        where: { id: round.roomId },
        data: { status: RoundStatus.ROUND_ACTIVE },
      });
    } else {
      throw new Error('Round has not started yet.');
    }
  }

  if (round.status !== RoundStatus.ROUND_ACTIVE) {
    throw new Error('Quiz is not active.');
  }

  if (round.endTime && new Date() > new Date(round.endTime)) {
    throw new Error('Quiz time has expired.');
  }

  // Check disqualification & active claim
  if (competitorId) {
    const comp = await prisma.roundCompetitor.findUnique({ where: { id: competitorId } });
    if (!comp || !comp.isClaimed) {
      throw new Error('Your Round 2 claim was reset by the organizer.');
    }
    if (comp.isDisqualified) {
      throw new Error('You have been disqualified from this round. Please contact the organizer.');
    }
  } else if (teamId) {
    const tm = await prisma.team.findUnique({ where: { id: teamId } });
    if (tm?.isDisqualified) {
      throw new Error('Your team has been disqualified from this round. Please contact the organizer.');
    }
  }

  const session = competitorId
    ? await prisma.participantSession.findUnique({
        where: { competitorId_roundId: { competitorId, roundId } },
      })
    : teamId
    ? await prisma.participantSession.findUnique({
        where: { teamId_roundId: { teamId, roundId } },
      })
    : null;

  if (!session || session.isCompleted) {
    throw new Error('Quiz session already submitted.');
  }

  if (selectedOptionId) {
    if (competitorId) {
      return prisma.answerSubmission.upsert({
        where: {
          competitorId_roundId_questionId: { competitorId, roundId, questionId },
        },
        update: {
          selectedOptionId,
          submittedAt: new Date(),
        },
        create: {
          competitorId,
          roundId,
          questionId,
          selectedOptionId,
        },
      });
    } else if (teamId) {
      return prisma.answerSubmission.upsert({
        where: {
          teamId_roundId_questionId: { teamId, roundId, questionId },
        },
        update: {
          selectedOptionId,
          submittedAt: new Date(),
        },
        create: {
          teamId,
          roundId,
          questionId,
          selectedOptionId,
        },
      });
    }
  } else {
    // Deselect option
    if (competitorId) {
      return prisma.answerSubmission.deleteMany({
        where: { competitorId, roundId, questionId },
      });
    } else if (teamId) {
      return prisma.answerSubmission.deleteMany({
        where: { teamId, roundId, questionId },
      });
    }
  }
}

export async function submitQuiz({
  teamId,
  competitorId,
  roundId,
}: {
  teamId?: string;
  competitorId?: string;
  roundId: string;
}) {
  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error('Quiz round not found.');
  }

  if (round.status === RoundStatus.PRE_START) {
    throw new Error('Round has not started yet.');
  }

  if (competitorId) {
    const comp = await prisma.roundCompetitor.findUnique({ where: { id: competitorId } });
    if (!comp || !comp.isClaimed) {
      throw new Error('Your Round 2 claim was reset by the organizer.');
    }
    if (comp.isDisqualified) {
      throw new Error('You have been disqualified from this round.');
    }
  } else if (teamId) {
    const tm = await prisma.team.findUnique({ where: { id: teamId } });
    if (tm?.isDisqualified) {
      throw new Error('Your team has been disqualified from this round.');
    }
  }

  const session = competitorId
    ? await prisma.participantSession.findUnique({
        where: { competitorId_roundId: { competitorId, roundId } },
      })
    : teamId
    ? await prisma.participantSession.findUnique({
        where: { teamId_roundId: { teamId, roundId } },
      })
    : null;

  if (!session) {
    throw new Error('Quiz session not found.');
  }

  if (session.isCompleted) {
    return session;
  }

  const now = new Date();
  const effectiveSubmittedAt = round.endTime && now > new Date(round.endTime) ? new Date(round.endTime) : now;

  if (competitorId) {
    await prisma.roundCompetitor.update({
      where: { id: competitorId },
      data: { status: 'SUBMITTED' },
    });
  }

  return prisma.participantSession.update({
    where: { id: session.id },
    data: {
      isCompleted: true,
      submittedAt: effectiveSubmittedAt,
    },
  });
}
