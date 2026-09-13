import { Request, Response, NextFunction } from 'express';
import { loginAdmin, loginTeam } from '../services/authService';

export async function handleAdminLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const result = await loginAdmin(username, password);
    res.cookie('token', result.token, { httpOnly: true, sameSite: 'lax' });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(401).json({ success: false, error: err.message || 'Login failed.' });
  }
}

export async function handleTeamLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomCode, teamName, passcode } = req.body;
    if (!roomCode || !teamName || !passcode) {
      return res.status(400).json({
        success: false,
        error: 'Room code, team name, and passcode are required.',
      });
    }

    const result = await loginTeam(roomCode, teamName, passcode);
    res.cookie('token', result.token, { httpOnly: true, sameSite: 'lax' });
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(401).json({ success: false, error: err.message || 'Team login failed.' });
  }
}

export async function handleGetMe(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }

  return res.json({
    success: true,
    user: req.user,
  });
}
