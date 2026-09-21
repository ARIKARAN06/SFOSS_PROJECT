import { prisma } from '../db/client';
import { RoundStatus } from '@sfoss/shared';

export async function calculateRoundScores(roundId: string) {
  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
    include: {
      questions: {
        include: {
          options: {
            orderBy: { optionLetter: 'asc' },
          },
        },
      },
    },
  });

  if (!round) {
    throw new Error('Round not found.');
  }

  const marksPerCorrect = round.marksPerCorrect;
  const penaltyPerWrong = round.penaltyPerWrong;

  // Build question -> correct option ID map
  const questionCorrectMap = new Map<string, string>();
  round.questions.forEach((q: any) => {
    const correctOpt = q.options.find((opt: any) => opt.isCorrect);
    if (correctOpt) {
      questionCorrectMap.set(q.id, correctOpt.id);
    }
  });

  const totalQuestions = round.questions.length;

  if (round.roundNumber === 2) {
    // ==========================================
    // ROUND 2: INDIVIDUAL COMPETITORS
    // ==========================================
    const sessions = await prisma.participantSession.findMany({
      where: { roundId, competitorId: { not: null } },
      include: {
        competitor: {
          include: { originalTeam: true },
        },
      },
    });

    const resultsToSave: Array<{
      competitorId: string;
      competitorCode: string;
      playerName: string;
      originalTeamNumber: number;
      originalTeamName: string;
      totalCorrect: number;
      totalWrong: number;
      totalUnanswered: number;
      score: number;
      submittedAt: Date | null;
      isDisqualified: boolean;
    }> = [];

    for (const session of sessions) {
      const competitor = session.competitor;
      if (!competitor) continue;

      if (competitor.isDisqualified) {
        resultsToSave.push({
          competitorId: competitor.id,
          competitorCode: competitor.competitorCode,
          playerName: competitor.playerName,
          originalTeamNumber: competitor.originalTeam.teamNumber,
          originalTeamName: competitor.originalTeam.teamName || `Team ${String(competitor.originalTeam.teamNumber).padStart(2, '0')}`,
          totalCorrect: 0,
          totalWrong: 0,
          totalUnanswered: totalQuestions,
          score: -999.0,
          submittedAt: session.submittedAt,
          isDisqualified: true,
        });
        continue;
      }

      const submissions = await prisma.answerSubmission.findMany({
        where: { competitorId: competitor.id, roundId },
      });

      let totalCorrect = 0;
      let totalWrong = 0;
      let latestSubmissionTime = session.submittedAt;

      for (const sub of submissions) {
        if (sub.submittedAt && (!latestSubmissionTime || sub.submittedAt > latestSubmissionTime)) {
          latestSubmissionTime = sub.submittedAt;
        }

        const correctOptionId = questionCorrectMap.get(sub.questionId);
        if (sub.selectedOptionId && sub.selectedOptionId === correctOptionId) {
          totalCorrect += 1;
          await prisma.answerSubmission.update({
            where: { id: sub.id },
            data: { isCorrect: true, pointsAwarded: marksPerCorrect },
          });
        } else if (sub.selectedOptionId) {
          totalWrong += 1;
          await prisma.answerSubmission.update({
            where: { id: sub.id },
            data: { isCorrect: false, pointsAwarded: penaltyPerWrong },
          });
        }
      }

      const totalUnanswered = totalQuestions - (totalCorrect + totalWrong);
      const score = totalCorrect * marksPerCorrect + totalWrong * penaltyPerWrong;

      resultsToSave.push({
        competitorId: competitor.id,
        competitorCode: competitor.competitorCode,
        playerName: competitor.playerName,
        originalTeamNumber: competitor.originalTeam.teamNumber,
        originalTeamName: competitor.originalTeam.teamName || `Team ${String(competitor.originalTeam.teamNumber).padStart(2, '0')}`,
        totalCorrect,
        totalWrong,
        totalUnanswered,
        score,
        submittedAt: latestSubmissionTime,
        isDisqualified: false,
      });
    }

    // ROUND 2 RANKING:
    // 1st: Eligible competitors first (score DESC, submittedAt ASC, competitorCode ASC)
    // 2nd: Disqualified competitors last (no rank)
    resultsToSave.sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      if (b.score !== a.score) return b.score - a.score;
      if (a.submittedAt && b.submittedAt) {
        const diff = a.submittedAt.getTime() - b.submittedAt.getTime();
        if (diff !== 0) return diff;
      }
      return a.competitorCode.localeCompare(b.competitorCode);
    });

    let currentRank = 1;

    return prisma.$transaction(async (tx) => {
      for (let i = 0; i < resultsToSave.length; i++) {
        const res = resultsToSave[i];
        const rank = res.isDisqualified || res.score === -999.0 ? null : currentRank++;

        await tx.finalResult.upsert({
          where: { competitorId_roundId: { competitorId: res.competitorId, roundId } },
          update: {
            totalCorrect: res.totalCorrect,
            totalWrong: res.totalWrong,
            totalUnanswered: res.totalUnanswered,
            score: res.score === -999.0 ? 0 : res.score,
            rank,
            submittedAt: res.submittedAt,
          },
          create: {
            competitorId: res.competitorId,
            roundId,
            totalCorrect: res.totalCorrect,
            totalWrong: res.totalWrong,
            totalUnanswered: res.totalUnanswered,
            score: res.score === -999.0 ? 0 : res.score,
            rank,
            submittedAt: res.submittedAt,
          },
        });
      }

      await tx.quizRound.update({
        where: { id: roundId },
        data: { status: RoundStatus.SCORING_COMPLETE },
      });
    });
  } else {
    // ==========================================
    // ROUND 1: TEAMS
    // ==========================================
    const sessions = await prisma.participantSession.findMany({
      where: { roundId, teamId: { not: null } },
      include: { team: true },
    });

    const resultsToSave: Array<{
      teamId: string;
      teamNumber: number;
      totalCorrect: number;
      totalWrong: number;
      totalUnanswered: number;
      score: number;
      submittedAt: Date | null;
      isDisqualified: boolean;
    }> = [];

    for (const session of sessions) {
      const team = session.team;
      if (!team) continue;

      if (team.isDisqualified) {
        resultsToSave.push({
          teamId: team.id,
          teamNumber: team.teamNumber,
          totalCorrect: 0,
          totalWrong: 0,
          totalUnanswered: totalQuestions,
          score: -999.0,
          submittedAt: session.submittedAt,
          isDisqualified: true,
        });
        continue;
      }

      const submissions = await prisma.answerSubmission.findMany({
        where: { teamId: team.id, roundId },
      });

      let totalCorrect = 0;
      let totalWrong = 0;
      let latestSubmissionTime = session.submittedAt;

      for (const sub of submissions) {
        if (sub.submittedAt && (!latestSubmissionTime || sub.submittedAt > latestSubmissionTime)) {
          latestSubmissionTime = sub.submittedAt;
        }

        const correctOptionId = questionCorrectMap.get(sub.questionId);
        if (sub.selectedOptionId && sub.selectedOptionId === correctOptionId) {
          totalCorrect += 1;
          await prisma.answerSubmission.update({
            where: { id: sub.id },
            data: { isCorrect: true, pointsAwarded: marksPerCorrect },
          });
        } else if (sub.selectedOptionId) {
          totalWrong += 1;
          await prisma.answerSubmission.update({
            where: { id: sub.id },
            data: { isCorrect: false, pointsAwarded: penaltyPerWrong },
          });
        }
      }

      const totalUnanswered = totalQuestions - (totalCorrect + totalWrong);
      const score = totalCorrect * marksPerCorrect + totalWrong * penaltyPerWrong;

      resultsToSave.push({
        teamId: team.id,
        teamNumber: team.teamNumber,
        totalCorrect,
        totalWrong,
        totalUnanswered,
        score,
        submittedAt: latestSubmissionTime,
        isDisqualified: false,
      });
    }

    // ROUND 1 RANKING:
    // 1st: score DESC
    // 2nd: submittedAt ASC
    // 3rd: teamNumber ASC
    resultsToSave.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.submittedAt && b.submittedAt) {
        const diff = a.submittedAt.getTime() - b.submittedAt.getTime();
        if (diff !== 0) return diff;
      }
      return a.teamNumber - b.teamNumber;
    });

    return prisma.$transaction(async (tx) => {
      for (let i = 0; i < resultsToSave.length; i++) {
        const res = resultsToSave[i];
        const rank = res.score === -999.0 ? null : i + 1;

        await tx.finalResult.upsert({
          where: { teamId_roundId: { teamId: res.teamId, roundId } },
          update: {
            totalCorrect: res.totalCorrect,
            totalWrong: res.totalWrong,
            totalUnanswered: res.totalUnanswered,
            score: res.score === -999.0 ? 0 : res.score,
            rank,
            submittedAt: res.submittedAt,
          },
          create: {
            teamId: res.teamId,
            roundId,
            totalCorrect: res.totalCorrect,
            totalWrong: res.totalWrong,
            totalUnanswered: res.totalUnanswered,
            score: res.score === -999.0 ? 0 : res.score,
            rank,
            submittedAt: res.submittedAt,
          },
        });
      }

      await tx.quizRound.update({
        where: { id: roundId },
        data: { status: RoundStatus.SCORING_COMPLETE },
      });
    });
  }
}

export async function getLeaderboard(roundId: string) {
  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  const isRound2 = round?.roundNumber === 2;

  const rawResults = await prisma.finalResult.findMany({
    where: {
      roundId,
      ...(isRound2 ? { competitorId: { not: null } } : { teamId: { not: null } }),
    },
    include: {
      team: true,
      competitor: {
        include: { originalTeam: true },
      },
    },
    orderBy: [
      { rank: 'asc' },
      { score: 'desc' },
    ],
  });

  const resultsWithViolations = await Promise.all(
    rawResults.map(async (r) => {
      const formattedTime = r.submittedAt
        ? new Date(r.submittedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
        : '—';

      const violationCount = isRound2 && r.competitor
        ? await prisma.antiCheatLog.count({ where: { competitorId: r.competitor.id } })
        : r.team
        ? await prisma.antiCheatLog.count({ where: { teamId: r.team.id } })
        : 0;

      if (isRound2 && r.competitor) {
        return {
          id: r.id,
          rank: r.rank,
          competitorId: r.competitor.id,
          playerName: r.competitor.playerName,
          competitorCode: r.competitor.competitorCode,
          originalTeamId: r.competitor.originalTeam.id,
          originalTeamNumber: r.competitor.originalTeam.teamNumber,
          originalTeamName:
            r.competitor.originalTeam.teamName ||
            `Team ${String(r.competitor.originalTeam.teamNumber).padStart(2, '0')}`,
          score: r.score,
          totalCorrect: r.totalCorrect,
          totalWrong: r.totalWrong,
          totalUnanswered: r.totalUnanswered,
          correctCount: r.totalCorrect,
          wrongCount: r.totalWrong,
          unansweredCount: r.totalUnanswered,
          submittedAt: r.submittedAt,
          formattedTime,
          status: r.competitor.status || (r.submittedAt ? 'SUBMITTED' : 'READY'),
          isDisqualified: r.competitor.isDisqualified,
          disqualifiedReason: r.competitor.disqualifiedReason,
          antiCheatViolationCount: violationCount,
          competitor: r.competitor,
        };
      } else if (r.team) {
        return {
          id: r.id,
          rank: r.rank,
          teamId: r.team.id,
          teamNumber: r.team.teamNumber,
          teamName:
            r.team.teamName || `Team ${String(r.team.teamNumber).padStart(2, '0')}`,
          score: r.score,
          totalCorrect: r.totalCorrect,
          totalWrong: r.totalWrong,
          totalUnanswered: r.totalUnanswered,
          correctCount: r.totalCorrect,
          wrongCount: r.totalWrong,
          unansweredCount: r.totalUnanswered,
          submittedAt: r.submittedAt,
          formattedTime,
          status: 'SUBMITTED',
          isDisqualified: r.team.isDisqualified,
          disqualifiedReason: r.team.disqualifiedReason,
          antiCheatViolationCount: violationCount,
          team: r.team,
        };
      }

      return {
        id: r.id,
        rank: r.rank,
        score: r.score,
        totalCorrect: r.totalCorrect,
        totalWrong: r.totalWrong,
        totalUnanswered: r.totalUnanswered,
        correctCount: r.totalCorrect,
        wrongCount: r.totalWrong,
        unansweredCount: r.totalUnanswered,
        submittedAt: r.submittedAt,
        formattedTime,
        antiCheatViolationCount: violationCount,
        competitor: r.competitor,
        team: r.team,
      };
    })
  );

  return resultsWithViolations;
}

export async function getTeamAnswerPaper(roundId: string, entityId: string) {
  // Check if entity is team or competitor
  const team = await prisma.team.findUnique({ where: { id: entityId } });
  const competitor = !team ? await prisma.roundCompetitor.findUnique({
    where: { id: entityId },
    include: { originalTeam: true, round: true },
  }) : null;

  if (!team && !competitor) {
    throw new Error('Participant entity not found.');
  }

  const round = await prisma.quizRound.findUnique({ where: { id: roundId } });

  const result = competitor
    ? await prisma.finalResult.findUnique({ where: { competitorId_roundId: { competitorId: competitor.id, roundId } } })
    : await prisma.finalResult.findUnique({ where: { teamId_roundId: { teamId: team!.id, roundId } } });

  const session = competitor
    ? await prisma.participantSession.findUnique({ where: { competitorId_roundId: { competitorId: competitor.id, roundId } } })
    : await prisma.participantSession.findUnique({ where: { teamId_roundId: { teamId: team!.id, roundId } } });

  const questions = await prisma.question.findMany({
    where: { roundId },
    orderBy: { questionNumber: 'asc' },
    include: {
      options: {
        orderBy: { optionLetter: 'asc' },
      },
    },
  });

  const submissions = competitor
    ? await prisma.answerSubmission.findMany({ where: { competitorId: competitor.id, roundId } })
    : await prisma.answerSubmission.findMany({ where: { teamId: team!.id, roundId } });

  const submissionMap = new Map(submissions.map((s) => [s.questionId, s.selectedOptionId]));

  const violationCount = competitor
    ? await prisma.antiCheatLog.count({ where: { competitorId: competitor.id } })
    : await prisma.antiCheatLog.count({ where: { teamId: team!.id } });

  const answerPaper = questions.map((q) => {
    const selectedOptId = submissionMap.get(q.id);
    const selectedOpt = q.options.find((opt) => opt.id === selectedOptId);
    const correctOpt = q.options.find((opt) => opt.isCorrect);

    let status: 'CORRECT' | 'WRONG' | 'UNANSWERED' = 'UNANSWERED';
    if (selectedOptId) {
      if (correctOpt && selectedOptId === correctOpt.id) {
        status = 'CORRECT';
      } else {
        status = 'WRONG';
      }
    }

    return {
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      codeSnippet: q.codeSnippet,
      selectedAnswer: selectedOpt
        ? `${selectedOpt.optionLetter}. ${selectedOpt.optionText}`
        : 'NOT ANSWERED',
      correctAnswer: correctOpt
        ? `${correctOpt.optionLetter}. ${correctOpt.optionText}`
        : 'N/A',
      status,
    };
  });

  if (competitor) {
    return {
      isRound2: true,
      competitor: {
        id: competitor.id,
        playerName: competitor.playerName,
        competitorCode: competitor.competitorCode,
        originalTeamNumber: competitor.originalTeam.teamNumber,
        originalTeamName: competitor.originalTeam.teamName || `Team ${String(competitor.originalTeam.teamNumber).padStart(2, '0')}`,
        isDisqualified: competitor.isDisqualified,
        disqualifiedReason: competitor.disqualifiedReason,
      },
      playerName: competitor.playerName,
      competitorCode: competitor.competitorCode,
      originalTeamNumber: competitor.originalTeam.teamNumber,
      originalTeamName: competitor.originalTeam.teamName || `Team ${String(competitor.originalTeam.teamNumber).padStart(2, '0')}`,
      roundName: competitor.round?.roundName || round?.roundName || 'DEBUGNOVA',
      score: result?.score ?? 0,
      rank: result?.rank ?? null,
      submittedAt: result?.submittedAt || session?.submittedAt,
      isDisqualified: competitor.isDisqualified,
      disqualifiedAt: competitor.disqualifiedAt,
      disqualifiedReason: competitor.disqualifiedReason,
      antiCheatViolationCount: violationCount,
      answerPaper,
    };
  } else {
    return {
      isRound2: false,
      team: {
        teamNumber: team!.teamNumber,
        teamName: team!.teamName || `Team ${String(team!.teamNumber).padStart(2, '0')}`,
        isDisqualified: team!.isDisqualified,
      },
      roundName: round?.roundName || 'SYNTRACE',
      score: result?.score ?? 0,
      rank: result?.rank ?? null,
      submittedAt: result?.submittedAt || session?.submittedAt,
      isDisqualified: team!.isDisqualified,
      disqualifiedAt: team!.disqualifiedAt,
      disqualifiedReason: team!.disqualifiedReason,
      antiCheatViolationCount: violationCount,
      answerPaper,
    };
  }
}

export async function publishResults(roundId: string) {
  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error('Round not found.');
  }

  // REQUIREMENT 1: Result publication is ONLY available for Round 1 (SYNTRACE)
  if (round.roundNumber !== 1) {
    throw new Error('Result publication is only available for Round 1.');
  }

  // REQUIREMENT 10: Prevent premature publication before qualification is performed
  const qualifiedCount = await prisma.team.count({
    where: { roomId: round.roomId, isQualifiedForRound2: true },
  });

  if (qualifiedCount === 0) {
    throw new Error('Complete Round 2 qualification before publishing Round 1 results.');
  }

  const updatedRound = await prisma.quizRound.update({
    where: { id: roundId },
    data: { status: RoundStatus.RESULTS_PUBLISHED },
  });

  await prisma.quizRoom.update({
    where: { id: round.roomId },
    data: { status: RoundStatus.RESULTS_PUBLISHED },
  });

  return updatedRound;
}

export async function resetOfficialStandings(roundId: string) {
  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error('Round not found.');
  }

  // 1. Delete calculated FinalResult records for this round
  await prisma.finalResult.deleteMany({
    where: { roundId },
  });

  // 2. Clear points and correctness marks on submissions for this round so recalculation is genuinely fresh
  await prisma.answerSubmission.updateMany({
    where: { roundId },
    data: {
      isCorrect: null,
      pointsAwarded: null,
    },
  });

  // 3. Revert status back to ROUND_ENDED so results become PENDING and CALCULATE RESULTS is enabled
  let newStatus = round.status;
  if (round.status === RoundStatus.RESULTS_PUBLISHED || round.status === RoundStatus.SCORING_COMPLETE) {
    newStatus = RoundStatus.ROUND_ENDED;
  }

  await prisma.quizRound.update({
    where: { id: roundId },
    data: { status: newStatus },
  });

  await prisma.quizRoom.update({
    where: { id: round.roomId },
    data: { status: newStatus },
  });

  return { roundId, status: newStatus };
}
