import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { Role } from '@sfoss/shared';

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
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;
    req.user = decoded;
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

export function requireTeam(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  if (req.user.role !== Role.PARTICIPANT_TEAM || (!req.user.teamId && !req.user.competitorId)) {
    return res.status(403).json({ success: false, error: 'Forbidden: Participant access required.' });
  }

  next();
}
