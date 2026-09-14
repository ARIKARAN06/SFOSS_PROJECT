import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client';
import { ENV } from '../config/env';
import { Role } from '@sfoss/shared';

export async function handleValidateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomCode } = req.params;
    const room = await prisma.quizRoom.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Invalid room code.' });
    }

    // Security check: If test room and ENABLE_TEST_ROOM is false, reject
    if (room.isTestRoom && !ENV.ENABLE_TEST_ROOM) {
      return res.status(404).json({ success: false, error: 'Invalid room code.' });
    }

    // Get active team slots for this room up to maxTeams
    const rawTeams = await prisma.team.findMany({
      where: { roomId: room.id, isActiveSlot: true },
      orderBy: { teamNumber: 'asc' },
      select: {
        id: true,
        teamNumber: true,
        teamName: true,
        player1Name: true,
        player2Name: true,
        isClaimed: true,
        isDisqualified: true,
      },
    });

    const teams = rawTeams.map((t) => ({
      ...t,
      teamName: t.teamName || `Team ${String(t.teamNumber).padStart(2, '0')}`,
      player1Name: t.player1Name || '',
      player2Name: t.player2Name || '',
    }));

    // Check if Round 2 exists and fetch qualified competitors
    // REQUIREMENT 13 & 14: Do NOT expose Round 2 competitors before Round 1 results are published!
    const round1 = room.rounds.find((r) => r.roundNumber === 1);
    const round2 = room.rounds.find((r) => r.roundNumber === 2);
    let round2Competitors: any[] = [];

    const isRound1Published = round1?.status === 'RESULTS_PUBLISHED';

    if (round2 && isRound1Published) {
      const rawCompetitors = await prisma.roundCompetitor.findMany({
        where: { roundId: round2.id },
        include: { originalTeam: true },
        orderBy: { competitorCode: 'asc' },
      });

      round2Competitors = rawCompetitors.map((c) => ({
        id: c.id,
        roundId: c.roundId,
        competitorCode: c.competitorCode,
        playerName: c.playerName,
        playerPosition: c.playerPosition,
        originalTeamNumber: c.originalTeam.teamNumber,
        originalTeamName: c.originalTeam.teamName || `Team ${String(c.originalTeam.teamNumber).padStart(2, '0')}`,
        isClaimed: c.isClaimed,
        isDisqualified: c.isDisqualified,
        status: c.status,
      }));
    }

    return res.json({
      success: true,
      room: {
        id: room.id,
        roomCode: room.roomCode,
        title: room.title,
        status: room.status,
        maxTeams: room.maxTeams,
        rounds: room.rounds,
      },
      teams,
      round2Competitors,
    });
  } catch (err: any) {
    next(err);
  }
}

export async function handleClaimTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomCode, teamId, teamName, player1Name, player2Name } = req.body;

    if (!roomCode || !teamId) {
      return res.status(400).json({ success: false, error: 'Room code and team selection are required.' });
    }

    const tName = typeof teamName === 'string' ? teamName.trim() : '';
    const p1 = typeof player1Name === 'string' ? player1Name.trim() : '';
    const p2 = typeof player2Name === 'string' ? player2Name.trim() : '';

    if (!tName) {
      return res.status(400).json({ success: false, error: 'Team Name is required.' });
    }
    if (!p1) {
      return res.status(400).json({ success: false, error: 'Player 1 Name is required.' });
    }
    if (!p2) {
      return res.status(400).json({ success: false, error: 'Player 2 Name is required.' });
    }

    if (p1.toLowerCase() === p2.toLowerCase()) {
      return res.status(400).json({ success: false, error: 'Player 1 and Player 2 names cannot be identical.' });
    }

    const room = await prisma.quizRoom.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Invalid room code.' });
    }

    // Atomic team claim transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const targetTeam = await tx.team.findUnique({
        where: { id: teamId },
      });

      if (!targetTeam) {
        throw new Error('Selected team slot not found.');
      }

      if (!targetTeam.isActiveSlot) {
        throw new Error('This team slot is not active for this competition.');
      }

      if (targetTeam.isClaimed) {
        throw new Error(`Team ${String(targetTeam.teamNumber).padStart(2, '0')} has already been claimed. Please select another team.`);
      }

      const sessionToken = crypto.randomUUID();

      const claimedTeam = await tx.team.update({
        where: { id: teamId },
        data: {
          teamName: tName,
          player1Name: p1,
          player2Name: p2,
          member1Name: p1,
          member1RegNo: '',
          member2Name: p2,
          member2RegNo: '',
          isClaimed: true,
          sessionToken,
        },
      });

      return { claimedTeam, sessionToken };
    });

    const displayTeamName = result.claimedTeam.teamName || `Team ${String(result.claimedTeam.teamNumber).padStart(2, '0')}`;

    const token = jwt.sign(
      {
        userId: result.claimedTeam.userId,
        username: displayTeamName,
        role: Role.PARTICIPANT_TEAM,
        teamId: result.claimedTeam.id,
        teamName: displayTeamName,
        player1Name: result.claimedTeam.player1Name,
        player2Name: result.claimedTeam.player2Name,
        sessionToken: result.sessionToken,
      },
      ENV.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });

    return res.json({
      success: true,
      sessionToken: result.sessionToken,
      token,
      team: {
        id: result.claimedTeam.id,
        teamNumber: result.claimedTeam.teamNumber,
        teamName: displayTeamName,
        player1Name: result.claimedTeam.player1Name,
        player2Name: result.claimedTeam.player2Name,
      },
      room: {
        id: room.id,
        roomCode: room.roomCode,
        title: room.title,
        status: room.status,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Team claim failed.' });
  }
}

export async function handleClaimRound2Competitor(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomCode, competitorId } = req.body;

    if (!roomCode || !competitorId) {
      return res.status(400).json({ success: false, error: 'Room code and competitor selection are required.' });
    }

    const room = await prisma.quizRoom.findUnique({
      where: { roomCode: roomCode.toUpperCase() },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Invalid room code.' });
    }

    const competitor = await prisma.roundCompetitor.findUnique({
      where: { id: competitorId },
      include: { originalTeam: true, round: true },
    });

    if (!competitor) {
      return res.status(404).json({ success: false, error: 'Round 2 competitor slot not found.' });
    }

    const round1 = room.rounds.find((r) => r.roundNumber === 1);
    if (round1 && round1.status !== 'RESULTS_PUBLISHED') {
      return res.status(403).json({
        success: false,
        error: 'Round 2 participant entry is not open yet. Round 1 qualification results are pending publication.',
      });
    }

    if (competitor.isDisqualified) {
      return res.status(403).json({ success: false, error: 'This competitor has been disqualified.' });
    }

    if (competitor.isClaimed) {
      return res.status(400).json({
        success: false,
        error: `Competitor slot ${competitor.competitorCode} (${competitor.playerName}) has already been joined by another device.`,
      });
    }

    const sessionToken = crypto.randomUUID();

    const claimedCompetitor = await prisma.roundCompetitor.update({
      where: { id: competitorId },
      data: {
        isClaimed: true,
        sessionToken,
        status: 'ACTIVE',
      },
      include: { originalTeam: true, round: true },
    });

    const token = jwt.sign(
      {
        userId: claimedCompetitor.id,
        username: `${claimedCompetitor.playerName} (${claimedCompetitor.competitorCode})`,
        role: Role.PARTICIPANT_TEAM,
        competitorId: claimedCompetitor.id,
        competitorCode: claimedCompetitor.competitorCode,
        playerName: claimedCompetitor.playerName,
        originalTeamId: claimedCompetitor.originalTeamId,
        roundId: claimedCompetitor.roundId,
        sessionToken,
      },
      ENV.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });

    return res.json({
      success: true,
      sessionToken,
      token,
      competitor: {
        id: claimedCompetitor.id,
        competitorCode: claimedCompetitor.competitorCode,
        playerName: claimedCompetitor.playerName,
        playerPosition: claimedCompetitor.playerPosition,
        originalTeamNumber: claimedCompetitor.originalTeam.teamNumber,
        originalTeamName: claimedCompetitor.originalTeam.teamName || `Team ${String(claimedCompetitor.originalTeam.teamNumber).padStart(2, '0')}`,
        roundId: claimedCompetitor.roundId,
      },
      room: {
        id: room.id,
        roomCode: room.roomCode,
        title: room.title,
        status: room.status,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Competitor claim failed.' });
  }
}

export async function handleRestoreSession(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.body.sessionToken || req.headers['x-session-token'];

    if (!sessionToken) {
      return res.status(401).json({ success: false, error: 'Session token required for recovery.' });
    }

    // 1. Try finding Team session (Round 1)
    const team = await prisma.team.findUnique({
      where: { sessionToken },
      include: {
        user: true,
        sessions: { include: { round: true } },
      },
    });

    if (team) {
      const room = await prisma.quizRoom.findFirst({
        where: { id: team.roomId || undefined },
        include: { rounds: { orderBy: { roundNumber: 'asc' } } },
      }) || await prisma.quizRoom.findFirst({ include: { rounds: { orderBy: { roundNumber: 'asc' } } } });

      const displayTeamName = team.teamName || `Team ${String(team.teamNumber).padStart(2, '0')}`;

      const token = jwt.sign(
        {
          userId: team.userId,
          username: displayTeamName,
          role: Role.PARTICIPANT_TEAM,
          teamId: team.id,
          teamName: displayTeamName,
          sessionToken: team.sessionToken,
        },
        ENV.JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.json({
        success: true,
        sessionType: 'TEAM',
        status: team.isDisqualified ? 'DISQUALIFIED' : 'ACTIVE',
        isDisqualified: team.isDisqualified,
        reason: team.disqualifiedReason || (team.isDisqualified ? 'Anti-cheat violation' : undefined),
        sessionToken: team.sessionToken,
        token,
        team: {
          id: team.id,
          teamNumber: team.teamNumber,
          teamName: displayTeamName,
          player1Name: team.player1Name,
          player2Name: team.player2Name,
          isDisqualified: team.isDisqualified,
          disqualifiedReason: team.disqualifiedReason,
        },
        room,
      });
    }

    // 2. Try finding RoundCompetitor session (Round 2)
    const competitor = await prisma.roundCompetitor.findUnique({
      where: { sessionToken },
      include: {
        originalTeam: true,
        round: { include: { room: { include: { rounds: { orderBy: { roundNumber: 'asc' } } } } } },
      },
    });

    if (competitor) {
      const displayTeamName = competitor.originalTeam.teamName || `Team ${String(competitor.originalTeam.teamNumber).padStart(2, '0')}`;

      const token = jwt.sign(
        {
          userId: competitor.id,
          username: `${competitor.playerName} (${competitor.competitorCode})`,
          role: Role.PARTICIPANT_TEAM,
          competitorId: competitor.id,
          competitorCode: competitor.competitorCode,
          playerName: competitor.playerName,
          originalTeamId: competitor.originalTeamId,
          roundId: competitor.roundId,
          sessionToken: competitor.sessionToken,
        },
        ENV.JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.json({
        success: true,
        sessionType: 'COMPETITOR',
        status: competitor.isDisqualified ? 'DISQUALIFIED' : 'ACTIVE',
        isDisqualified: competitor.isDisqualified,
        reason: competitor.disqualifiedReason || (competitor.isDisqualified ? 'Anti-cheat violation' : undefined),
        sessionToken: competitor.sessionToken,
        token,
        competitor: {
          id: competitor.id,
          competitorCode: competitor.competitorCode,
          code: competitor.competitorCode,
          playerName: competitor.playerName,
          playerPosition: competitor.playerPosition,
          originalTeamNumber: competitor.originalTeam.teamNumber,
          originalTeamName: displayTeamName,
          roundId: competitor.roundId,
          isDisqualified: competitor.isDisqualified,
          disqualifiedReason: competitor.disqualifiedReason,
        },
        room: competitor.round?.room,
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Session token invalid or expired. Your claim may have been reset by the organizer.',
      code: 'CLAIM_RESET',
    });
  } catch (err: any) {
    next(err);
  }
}

/**
 * REQUIREMENT 15 & 16: Safe participant Round 1 result endpoint.
 * Returns ONLY { published: false } or { published: true, qualified: boolean, roundName: "SYNTRACE" }.
 * NEVER leaks score, rank, correct/wrong counts, answers, or answer papers.
 */
export async function handleGetRound1ParticipantResult(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = req.user?.teamId || req.user?.originalTeamId || req.user?.userId;
    if (!teamId) {
      return res.status(401).json({ success: false, error: 'Unauthorized participant.' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        room: {
          include: {
            rounds: { orderBy: { roundNumber: 'asc' } },
          },
        },
      },
    });

    if (!team || !team.room) {
      return res.status(404).json({ success: false, error: 'Team or room not found.' });
    }

    const round1 = team.room.rounds.find((r) => r.roundNumber === 1);
    if (!round1) {
      return res.json({ success: true, published: false, message: 'Round 1 not found.' });
    }

    const isPublished = round1.status === 'RESULTS_PUBLISHED';

    // REQUIREMENT 18: If a Round 1 team is disqualified, disqualification takes priority
    if (team.isDisqualified) {
      return res.json({
        success: true,
        published: isPublished,
        isDisqualified: true,
        disqualifiedReason: team.disqualifiedReason || 'Disqualified from this round',
        roundName: round1.roundName || 'SYNTRACE',
      });
    }

    // REQUIREMENT 13: Before publication: tell participant results are being finalized
    if (!isPublished) {
      return res.json({
        success: true,
        published: false,
        roundName: round1.roundName || 'SYNTRACE',
      });
    }

    // REQUIREMENT 3, 4, 5: After publication: qualification outcome ONLY (NO scores, NO ranks, NO answer sheet)
    return res.json({
      success: true,
      published: true,
      qualified: Boolean(team.isQualifiedForRound2),
      roundName: round1.roundName || 'SYNTRACE',
    });
  } catch (err: any) {
    next(err);
  }
}
