import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';

/**
 * Helper to dynamically resolve room and rounds (Round 1 and Round 2)
 */
async function resolveRoomRounds(roundId?: string) {
  if (roundId && roundId !== 'default') {
    const round = await prisma.quizRound.findUnique({
      where: { id: roundId },
      include: { room: { include: { rounds: { orderBy: { roundNumber: 'asc' } } } } },
    });
    if (round?.room) {
      const round1 = round.room.rounds.find((r) => r.roundNumber === 1);
      const round2 = round.room.rounds.find((r) => r.roundNumber === 2);
      return { room: round.room, round1, round2 };
    }
  }

  // Fallback: fetch main non-test room or first room
  const room = await prisma.quizRoom.findFirst({
    where: { isTestRoom: false },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  }) || await prisma.quizRoom.findFirst({
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  });

  if (!room) return null;

  return {
    room,
    round1: room.rounds.find((r) => r.roundNumber === 1),
    round2: room.rounds.find((r) => r.roundNumber === 2),
  };
}

export async function handleGetQualificationStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const resolved = await resolveRoomRounds(roundId);

    if (!resolved || !resolved.round2) {
      return res.status(404).json({ success: false, error: 'Round 2 not found.' });
    }

    const { room, round1, round2 } = resolved;

    // Get all teams for this room
    const teams = await prisma.team.findMany({
      where: { roomId: room.id },
      orderBy: { teamNumber: 'asc' },
      include: {
        scores: { where: { roundId: round1?.id } },
        round2Competitors: { where: { roundId: round2.id } },
      },
    });

    const competitors = await prisma.roundCompetitor.findMany({
      where: { roundId: round2.id },
      include: { originalTeam: true },
      orderBy: { competitorCode: 'asc' },
    });

    return res.json({
      success: true,
      round1Id: round1?.id,
      round2Id: round2.id,
      teams: teams.map((t) => ({
        id: t.id,
        teamNumber: t.teamNumber,
        teamName: t.teamName || `Team ${String(t.teamNumber).padStart(2, '0')}`,
        isQualifiedForRound2: t.isQualifiedForRound2,
        player1Name: t.player1Name || '',
        player2Name: t.player2Name || '',
        round1Score: t.scores[0]?.score ?? null,
        round1Rank: t.scores[0]?.rank ?? null,
        competitors: t.round2Competitors,
      })),
      competitors,
    });
  } catch (err: any) {
    next(err);
  }
}

export async function handleQualifyTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId, teamIds, round2Id, roundId, player1Name, player2Name } = req.body;

    const resolved = await resolveRoomRounds(round2Id || roundId);
    if (!resolved || !resolved.round2) {
      return res.status(404).json({ success: false, error: 'Round 2 not found.' });
    }
    const targetRound2Id = resolved.round2.id;

    // 1. Single team qualification
    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team) {
        return res.status(404).json({ success: false, error: 'Team not found.' });
      }

      // Auto-carry names from Round 1 if not explicitly provided
      const p1 = (typeof player1Name === 'string' && player1Name.trim().length > 0)
        ? player1Name.trim()
        : (team.player1Name?.trim() || 'Player A');

      const p2 = (typeof player2Name === 'string' && player2Name.trim().length > 0)
        ? player2Name.trim()
        : (team.player2Name?.trim() || 'Player B');

      const paddedNum = String(team.teamNumber).padStart(2, '0');

      await prisma.$transaction(async (tx) => {
        await tx.team.update({
          where: { id: teamId },
          data: {
            isQualifiedForRound2: true,
            player1Name: p1,
            player2Name: p2,
          },
        });

        // Upsert Competitor A
        await tx.roundCompetitor.upsert({
          where: {
            roundId_originalTeamId_playerPosition: {
              roundId: targetRound2Id,
              originalTeamId: team.id,
              playerPosition: 'A',
            },
          },
          update: {
            playerName: p1,
            status: 'READY',
          },
          create: {
            roundId: targetRound2Id,
            originalTeamId: team.id,
            playerPosition: 'A',
            competitorCode: `${paddedNum}-A`,
            playerName: p1,
            status: 'READY',
          },
        });

        // Upsert Competitor B
        await tx.roundCompetitor.upsert({
          where: {
            roundId_originalTeamId_playerPosition: {
              roundId: targetRound2Id,
              originalTeamId: team.id,
              playerPosition: 'B',
            },
          },
          update: {
            playerName: p2,
            status: 'READY',
          },
          create: {
            roundId: targetRound2Id,
            originalTeamId: team.id,
            playerPosition: 'B',
            competitorCode: `${paddedNum}-B`,
            playerName: p2,
            status: 'READY',
          },
        });
      });

      return res.json({
        success: true,
        message: `Team ${paddedNum} qualified successfully with ${p1} (A) and ${p2} (B).`,
        competitors: [
          { competitorCode: `${paddedNum}-A`, playerName: p1 },
          { competitorCode: `${paddedNum}-B`, playerName: p2 },
        ],
      });
    }

    // 2. Batch team qualification
    if (Array.isArray(teamIds) && teamIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const tid of teamIds) {
          const team = await tx.team.findUnique({ where: { id: tid } });
          if (!team) continue;

          await tx.team.update({
            where: { id: tid },
            data: { isQualifiedForRound2: true },
          });

          const paddedNum = String(team.teamNumber).padStart(2, '0');
          const p1 = team.player1Name?.trim() || '';
          const p2 = team.player2Name?.trim() || '';

          await tx.roundCompetitor.upsert({
            where: {
              roundId_originalTeamId_playerPosition: {
                roundId: targetRound2Id,
                originalTeamId: team.id,
                playerPosition: 'A',
              },
            },
            update: {
              playerName: p1,
            },
            create: {
              roundId: targetRound2Id,
              originalTeamId: team.id,
              playerPosition: 'A',
              competitorCode: `${paddedNum}-A`,
              playerName: p1,
              status: p1 ? 'READY' : 'PENDING_NAME',
            },
          });

          await tx.roundCompetitor.upsert({
            where: {
              roundId_originalTeamId_playerPosition: {
                roundId: targetRound2Id,
                originalTeamId: team.id,
                playerPosition: 'B',
              },
            },
            update: {
              playerName: p2,
            },
            create: {
              roundId: targetRound2Id,
              originalTeamId: team.id,
              playerPosition: 'B',
              competitorCode: `${paddedNum}-B`,
              playerName: p2,
              status: p2 ? 'READY' : 'PENDING_NAME',
            },
          });
        }
      });

      return res.json({ success: true, message: `Successfully qualified ${teamIds.length} team(s) for Round 2.` });
    }

    return res.status(400).json({ success: false, error: 'teamId or teamIds array is required.' });
  } catch (err: any) {
    next(err);
  }
}

export async function handleQualifyTopN(req: Request, res: Response, next: NextFunction) {
  try {
    const { round1Id, round2Id, roundId, count, topN } = req.body;
    const n = parseInt(count || topN, 10);

    if (isNaN(n) || n <= 0) {
      return res.status(400).json({ success: false, error: 'Top teams count must be a positive number.' });
    }

    const resolved = await resolveRoomRounds(round2Id || round1Id || roundId);
    if (!resolved || !resolved.round1 || !resolved.round2) {
      return res.status(404).json({ success: false, error: 'Competition rounds not found.' });
    }

    const r1Id = resolved.round1.id;
    const r2Id = resolved.round2.id;

    // Fetch top N from FinalResult of Round 1
    const topResults = await prisma.finalResult.findMany({
      where: { roundId: r1Id, teamId: { not: null } },
      orderBy: [{ rank: 'asc' }, { score: 'desc' }],
      take: n,
    });

    let teamIds = topResults.map((r) => r.teamId).filter((id): id is string => id !== null);

    // Fallback if results not calculated yet: pick first N active teams
    if (teamIds.length === 0) {
      const activeTeams = await prisma.team.findMany({
        where: { roomId: resolved.room.id, isActiveSlot: true },
        orderBy: { teamNumber: 'asc' },
        take: n,
      });
      teamIds = activeTeams.map((t) => t.id);
    }

    if (teamIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No teams found to qualify.' });
    }

    await prisma.$transaction(async (tx) => {
      for (const tid of teamIds) {
        const team = await tx.team.findUnique({ where: { id: tid } });
        if (!team) continue;

        await tx.team.update({
          where: { id: tid },
          data: { isQualifiedForRound2: true },
        });

        const paddedNum = String(team.teamNumber).padStart(2, '0');
        const p1 = team.player1Name?.trim() || '';
        const p2 = team.player2Name?.trim() || '';

        await tx.roundCompetitor.upsert({
          where: {
            roundId_originalTeamId_playerPosition: {
              roundId: r2Id,
              originalTeamId: team.id,
              playerPosition: 'A',
            },
          },
          update: {
            playerName: p1,
          },
          create: {
            roundId: r2Id,
            originalTeamId: team.id,
            playerPosition: 'A',
            competitorCode: `${paddedNum}-A`,
            playerName: p1,
            status: p1 ? 'READY' : 'PENDING_NAME',
          },
        });

        await tx.roundCompetitor.upsert({
          where: {
            roundId_originalTeamId_playerPosition: {
              roundId: r2Id,
              originalTeamId: team.id,
              playerPosition: 'B',
            },
          },
          update: {
            playerName: p2,
          },
          create: {
            roundId: r2Id,
            originalTeamId: team.id,
            playerPosition: 'B',
            competitorCode: `${paddedNum}-B`,
            playerName: p2,
            status: p2 ? 'READY' : 'PENDING_NAME',
          },
        });
      }
    });

    return res.json({ success: true, message: `Successfully auto-qualified top ${teamIds.length} team(s) for Round 2.` });
  } catch (err: any) {
    next(err);
  }
}

export async function handleUpdatePlayerNames(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId, round2Id, roundId, player1Name, player2Name } = req.body;

    if (!teamId) {
      return res.status(400).json({ success: false, error: 'teamId is required.' });
    }

    const p1 = typeof player1Name === 'string' ? player1Name.trim() : '';
    const p2 = typeof player2Name === 'string' ? player2Name.trim() : '';

    if (!p1) {
      return res.status(400).json({ success: false, error: 'Enter Player A name before saving.' });
    }
    if (!p2) {
      return res.status(400).json({ success: false, error: 'Enter Player B name before saving.' });
    }

    if (p1.toLowerCase() === p2.toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Player 1 and Player 2 names cannot be identical.' });
    }

    const resolved = await resolveRoomRounds(round2Id || roundId);
    if (!resolved || !resolved.round2) {
      return res.status(404).json({ success: false, error: 'Round 2 not found.' });
    }
    const targetRound2Id = resolved.round2.id;

    if (resolved.round2.status === 'ROUND_ACTIVE' || resolved.round2.status === 'PRE_START') {
      return res.status(400).json({ success: false, error: 'Cannot rename players after Round 2 has started.' });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ success: false, error: 'Team not found.' });
    }

    const paddedNum = String(team.teamNumber).padStart(2, '0');

    await prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id: teamId },
        data: {
          isQualifiedForRound2: true,
          player1Name: p1,
          player2Name: p2,
        },
      });

      await tx.roundCompetitor.upsert({
        where: {
          roundId_originalTeamId_playerPosition: {
            roundId: targetRound2Id,
            originalTeamId: team.id,
            playerPosition: 'A',
          },
        },
        update: { playerName: p1, status: 'READY' },
        create: {
          roundId: targetRound2Id,
          originalTeamId: team.id,
          playerPosition: 'A',
          competitorCode: `${paddedNum}-A`,
          playerName: p1,
          status: 'READY',
        },
      });

      await tx.roundCompetitor.upsert({
        where: {
          roundId_originalTeamId_playerPosition: {
            roundId: targetRound2Id,
            originalTeamId: team.id,
            playerPosition: 'B',
          },
        },
        update: { playerName: p2, status: 'READY' },
        create: {
          roundId: targetRound2Id,
          originalTeamId: team.id,
          playerPosition: 'B',
          competitorCode: `${paddedNum}-B`,
          playerName: p2,
          status: 'READY',
        },
      });
    });

    return res.json({ success: true, message: 'Round 2 player names saved successfully.' });
  } catch (err: any) {
    next(err);
  }
}

export async function handleUnqualifyTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId, round2Id, roundId } = req.body;

    if (!teamId) {
      return res.status(400).json({ success: false, error: 'teamId is required.' });
    }

    const resolved = await resolveRoomRounds(round2Id || roundId);
    if (!resolved || !resolved.round2) {
      return res.status(404).json({ success: false, error: 'Round 2 not found.' });
    }
    const targetRound2Id = resolved.round2.id;

    // Check if competitors have participation data in Round 2
    const competitors = await prisma.roundCompetitor.findMany({
      where: { originalTeamId: teamId, roundId: targetRound2Id },
      include: {
        submissions: true,
        scores: true,
        sessions: true,
      },
    });

    const hasData = competitors.some(
      (c) =>
        c.submissions.length > 0 ||
        c.scores.length > 0 ||
        c.sessions.some((s) => s.isCompleted || s.startedAt != null) ||
        (c.isClaimed && c.sessionToken != null)
    );

    if (hasData) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove qualification because Round 2 participation data already exists.',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.roundCompetitor.deleteMany({
        where: { originalTeamId: teamId, roundId: targetRound2Id },
      });

      await tx.team.update({
        where: { id: teamId },
        data: { isQualifiedForRound2: false },
      });
    });

    return res.json({ success: true, message: 'Team qualification removed successfully.' });
  } catch (err: any) {
    next(err);
  }
}
