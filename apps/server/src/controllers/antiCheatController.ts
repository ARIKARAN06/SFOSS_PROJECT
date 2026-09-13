import { Request, Response, NextFunction } from 'express';
import {
  logAntiCheatViolation,
  getAntiCheatLogs,
  disqualifyTeam,
  disqualifyCompetitor,
  resetCompetitorDisqualification,
} from '../services/antiCheatService';

export async function handleLogViolation(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = req.user?.teamId || req.body.teamId;
    const competitorId = req.user?.competitorId || req.body.competitorId;
    const { roundId, violationType, metadata } = req.body;

    if ((!teamId && !competitorId) || !violationType) {
      return res.status(400).json({
        success: false,
        error: 'Participant identity (teamId or competitorId) and violationType are required.',
      });
    }

    const result = await logAntiCheatViolation({
      teamId,
      competitorId,
      roundId,
      violationType,
      metadata,
    });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    next(err);
  }
}

export async function handleGetLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const roundId = req.query.roundId as string | undefined;
    const mode = req.query.mode as 'ROUND_1' | 'ROUND_2' | undefined;
    const logs = await getAntiCheatLogs({ roundId, mode });
    return res.json({ success: true, logs });
  } catch (err: any) {
    next(err);
  }
}

export async function handleDisqualify(req: Request, res: Response, next: NextFunction) {
  try {
    const { teamId } = req.params;
    const { reason } = req.body;
    const team = await disqualifyTeam(teamId, reason);
    return res.json({ success: true, team });
  } catch (err: any) {
    next(err);
  }
}

export async function handleDisqualifyCompetitor(req: Request, res: Response, next: NextFunction) {
  try {
    const { competitorId } = req.params;
    const { reason } = req.body;

    if (!competitorId) {
      return res.status(400).json({ success: false, error: 'Competitor ID is required.' });
    }

    const competitor = await disqualifyCompetitor(competitorId, reason);
    return res.json({
      success: true,
      competitorId: competitor.id,
      competitorCode: competitor.competitorCode,
      status: 'DISQUALIFIED',
      reason: competitor.disqualifiedReason || reason || 'Anti-cheat violation',
      message: `Competitor ${competitor.playerName} (${competitor.competitorCode}) disqualified.`,
      competitor,
    });
  } catch (err: any) {
    if (err.message === 'Competitor not found.') {
      return res.status(404).json({ success: false, error: 'Competitor not found' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Failed to disqualify competitor.' });
  }
}

export async function handleResetCompetitorDisqualification(req: Request, res: Response, next: NextFunction) {
  try {
    const { competitorId } = req.params;

    if (!competitorId) {
      return res.status(400).json({ success: false, error: 'Competitor ID is required.' });
    }

    const competitor = await resetCompetitorDisqualification(competitorId);
    return res.json({
      success: true,
      competitorId: competitor.id,
      competitorCode: competitor.competitorCode,
      status: competitor.status,
      message: `Disqualification reset for ${competitor.playerName} (${competitor.competitorCode}).`,
      competitor,
    });
  } catch (err: any) {
    if (err.message === 'Competitor not found.') {
      return res.status(404).json({ success: false, error: 'Competitor not found' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Failed to reset competitor disqualification.' });
  }
}
