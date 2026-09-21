import { Request, Response, NextFunction } from 'express';
import {
  calculateRoundScores,
  publishResults,
  getLeaderboard,
  getTeamAnswerPaper,
  resetOfficialStandings,
} from '../services/scoringService';

export async function handleCalculateScores(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    await calculateRoundScores(roundId);
    return res.json({ success: true, message: 'Scores calculated & ranked successfully.' });
  } catch (err: any) {
    next(err);
  }
}

export async function handlePublishResults(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const round = await publishResults(roundId);
    return res.json({ success: true, message: 'Round 1 qualification results published successfully.', round });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to publish results.' });
  }
}

export async function handleResetOfficialStandings(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const result = await resetOfficialStandings(roundId);
    return res.json({ success: true, message: 'Official standings reset successfully.', result });
  } catch (err: any) {
    next(err);
  }
}

export async function handleGetLeaderboard(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const results = await getLeaderboard(roundId);
    return res.json({ success: true, results });
  } catch (err: any) {
    next(err);
  }
}

export async function handleGetAnswerPaper(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId, teamId } = req.params;
    const paper = await getTeamAnswerPaper(roundId, teamId);
    return res.json({ success: true, ...paper });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
