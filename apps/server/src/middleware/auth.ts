import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { Role } from '@sfoss/shared';

import { prisma } from '../db/client';

export interface AuthPayload {
  userId: string;
  username: string;
  role: Role;
  teamId?: string;
  teamName?: string;
  competitorId?: string;
  competitorCode?: string;
  playerName?: string;
  originalTeamId?: string;
  sessionToken?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;
    req.user = decoded;

    // If token belongs to a Round 2 competitor, verify the slot claim is still valid
    if (decoded.competitorId) {
      const comp = await prisma.roundCompetitor.findUnique({
        where: { id: decoded.competitorId },
        select: { isClaimed: true, sessionToken: true },
      });

      if (!comp || !comp.isClaimed || comp.sessionToken !== decoded.sessionToken) {
        return res.status(401).json({
          success: false,
          error: 'Your Round 2 claim was reset by the organizer.',
          code: 'CLAIM_RESET',
        });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication token.' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  if (req.user.role !== Role.SUPERADMIN && req.user.role !== Role.EVENT_ORGANIZER) {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin privilege required.' });
  }

  next();
}

export async function requireTeam(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  if (req.user.role !== Role.PARTICIPANT_TEAM || (!req.user.teamId && !req.user.competitorId)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Participant access required.' });
  }

  // Extra check for competitor session validity
  if (req.user.competitorId) {
    const competitor = await prisma.roundCompetitor.findUnique({
      where: { id: req.user.competitorId },
      select: { isClaimed: true, sessionToken: true },
    });

    if (!competitor || !competitor.isClaimed || competitor.sessionToken !== req.user.sessionToken) {
      return res.status(401).json({
        success: false,
        error: 'Your Round 2 claim was reset by the organizer.',
        code: 'CLAIM_RESET',
      });
    }
  }

  next();
}
