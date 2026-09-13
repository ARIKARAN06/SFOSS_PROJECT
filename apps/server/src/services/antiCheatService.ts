import { prisma } from '../db/client';
import { ViolationType } from '@sfoss/shared';

export interface LogViolationParams {
  teamId?: string;
  competitorId?: string;
  roundId?: string;
  violationType: ViolationType;
  metadata?: any;
}

export async function logAntiCheatViolation({
  teamId,
  competitorId,
  roundId,
  violationType,
  metadata,
}: LogViolationParams) {
  if (competitorId) {
    const competitor = await prisma.roundCompetitor.findUnique({
      where: { id: competitorId },
      include: { originalTeam: true },
    });

    if (!competitor) {
      throw new Error('Competitor not found.');
    }

    const log = await prisma.antiCheatLog.create({
      data: {
        competitorId,
        roundId: roundId || competitor.roundId,
        violationType,
        metadata: metadata || {},
      },
    });

    const violationCount = await prisma.antiCheatLog.count({
      where: { competitorId },
    });

    return {
      log,
      violationCount,
      competitorId: competitor.id,
      competitorCode: competitor.competitorCode,
      playerName: competitor.playerName,
      originalTeamNumber: competitor.originalTeam.teamNumber,
      originalTeamName:
        competitor.originalTeam.teamName ||
        `Team ${String(competitor.originalTeam.teamNumber).padStart(2, '0')}`,
    };
  }

  if (teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      throw new Error('Team not found.');
    }

    const log = await prisma.antiCheatLog.create({
      data: {
        teamId,
        roundId: roundId || null,
        violationType,
        metadata: metadata || {},
      },
    });

    const violationCount = await prisma.antiCheatLog.count({
      where: { teamId },
    });

    return {
      log,
      violationCount,
      teamId: team.id,
      teamNumber: team.teamNumber,
      teamName:
        team.teamName || `Team ${String(team.teamNumber).padStart(2, '0')}`,
    };
  }

  throw new Error('teamId or competitorId is required.');
}

export async function getAntiCheatLogs(filters?: {
  roundId?: string;
  mode?: 'ROUND_1' | 'ROUND_2';
}) {
  const where: any = {};

  if (filters?.roundId) {
    where.roundId = filters.roundId;
  }

  if (filters?.mode === 'ROUND_1') {
    where.teamId = { not: null };
  } else if (filters?.mode === 'ROUND_2') {
    where.competitorId = { not: null };
  }

  return prisma.antiCheatLog.findMany({
    where,
    include: {
      team: true,
      competitor: {
        include: { originalTeam: true },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });
}

export async function disqualifyTeam(teamId: string, reason?: string) {
  return prisma.team.update({
    where: { id: teamId },
    data: {
      isDisqualified: true,
      disqualifiedAt: new Date(),
      disqualifiedReason: reason || 'Disqualified by Admin',
    },
  });
}

export async function disqualifyCompetitor(competitorId: string, reason?: string) {
  const competitor = await prisma.roundCompetitor.findUnique({
    where: { id: competitorId },
  });

  if (!competitor) {
    throw new Error('Competitor not found.');
  }

  return prisma.roundCompetitor.update({
    where: { id: competitorId },
    data: {
      isDisqualified: true,
      disqualifiedAt: new Date(),
      disqualifiedReason: reason || 'Disqualified by Admin',
      status: 'DISQUALIFIED',
    },
    include: { originalTeam: true },
  });
}

export async function resetCompetitorDisqualification(competitorId: string) {
  const competitor = await prisma.roundCompetitor.findUnique({
    where: { id: competitorId },
    include: { round: true, originalTeam: true },
  });

  if (!competitor) {
    throw new Error('Competitor not found.');
  }

  const newStatus = competitor.isClaimed ? 'ACTIVE' : 'READY';

  return prisma.roundCompetitor.update({
    where: { id: competitorId },
    data: {
      isDisqualified: false,
      disqualifiedAt: null,
      disqualifiedReason: null,
      status: newStatus,
    },
    include: { originalTeam: true },
  });
}
