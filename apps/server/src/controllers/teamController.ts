import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/client';

export async function handleSetTeamCount(req: Request, res: Response, next: NextFunction) {
  try {
    const { maxTeams } = req.body;
    const count = parseInt(maxTeams, 10);

    if (isNaN(count) || count < 10 || count > 60) {
      return res.status(400).json({
        success: false,
        error: 'Team count must be a valid integer between 10 and 60.',
      });
    }

    const room = await prisma.quizRoom.findFirst({
      where: { isTestRoom: false },
    }) || await prisma.quizRoom.findFirst();

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    // Check if lowering count would deactivate a team that is already claimed or has submissions
    const activeClaimedTeams = await prisma.team.findMany({
      where: {
        roomId: room.id,
        teamNumber: { gt: count },
        OR: [
          { isClaimed: true },
          { submissions: { some: {} } },
          { scores: { some: {} } },
        ],
      },
    });

    if (activeClaimedTeams.length > 0) {
      const problematicNumbers = activeClaimedTeams.map((t) => t.teamNumber).join(', ');
      return res.status(400).json({
        success: false,
        error: `Cannot reduce team count to ${count}. Team(s) [${problematicNumbers}] have active participant data. Reset or disqualify those teams first.`,
      });
    }

    // Update QuizRoom maxTeams and toggle isActiveSlot on Team table scoped to this room
    await prisma.$transaction(async (tx: any) => {
      await tx.quizRoom.update({
        where: { id: room.id },
        data: { maxTeams: count },
      });

      await tx.team.updateMany({
        where: { roomId: room.id, teamNumber: { lte: count } },
        data: { isActiveSlot: true },
      });

      await tx.team.updateMany({
        where: { roomId: room.id, teamNumber: { gt: count } },
        data: { isActiveSlot: false },
      });
    });

    return res.json({ success: true, maxTeams: count });
  } catch (err: any) {
    next(err);
  }
}

export async function handleResetTeamSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId } = req.params;
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        isClaimed: false,
        sessionToken: null,
      },
    });

    return res.json({ success: true, message: `Session reset for Team ${String(team.teamNumber).padStart(2, '0')}.`, team });
  } catch (err: any) {
    next(err);
  }
}

export async function handleGetAllTeams(req: Request, res: Response, next: NextFunction) {
  try {
    const room = await prisma.quizRoom.findFirst({
      where: { isTestRoom: false },
    }) || await prisma.quizRoom.findFirst();

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    const maxTeams = room.maxTeams || 40;

    const rawTeams = await prisma.team.findMany({
      where: { roomId: room.id },
      orderBy: { teamNumber: 'asc' },
      include: {
        sessions: true,
        submissions: true,
        scores: true,
        antiCheatLogs: true,
        round2Competitors: true,
      },
    });

    const teams = rawTeams.map((t) => ({
      ...t,
      teamName: t.teamName || `Team ${String(t.teamNumber).padStart(2, '0')}`,
    }));

    return res.json({
      success: true,
      maxTeams,
      teams,
      activeCount: teams.filter((t) => t.isActiveSlot).length,
      claimedCount: teams.filter((t) => t.isActiveSlot && t.isClaimed).length,
      availableCount: teams.filter((t) => t.isActiveSlot && !t.isClaimed).length,
    });
  } catch (err: any) {
    next(err);
  }
}

export async function handleDisqualifyTeam(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId } = req.params;
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        isDisqualified: true,
        disqualifiedAt: new Date(),
      },
    });

    return res.json({ success: true, team });
  } catch (err: any) {
    next(err);
  }
}

export async function handleResetTeamDisqualification(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId } = req.params;
    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        isDisqualified: false,
        disqualifiedReason: null,
        disqualifiedAt: null,
      },
    });

    const displayTeamName = team.teamName || `Team ${String(team.teamNumber).padStart(2, '0')}`;
    return res.json({ success: true, message: `Disqualification reset for ${displayTeamName}.`, team });
  } catch (err: any) {
    next(err);
  }
}

export async function handleResetAllDisqualified(req: Request, res: Response, next: NextFunction) {
  try {
    const disqualifiedTeams = await prisma.team.findMany({
      where: { isDisqualified: true },
    });

    let count = 0;
    for (const t of disqualifiedTeams) {
      await prisma.team.update({
        where: { id: t.id },
        data: {
          isDisqualified: false,
          disqualifiedReason: null,
          disqualifiedAt: null,
        },
      });
      count++;
    }

    return res.json({
      success: true,
      message: `${count} disqualified teams reset.`,
      resetCount: count,
    });
  } catch (err: any) {
    next(err);
  }
}
