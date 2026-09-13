import { Request, Response, NextFunction } from 'express';
import { getOrCreateParticipantSession, saveAnswer, submitQuiz } from '../services/quizService';

export async function handleGetQuizSession(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = req.user?.teamId;
    const competitorId = req.user?.competitorId;
    const { roundId } = req.params;

    if (!teamId && !competitorId) {
      return res.status(403).json({ success: false, error: 'Participant identity missing.' });
    }

    const sessionData = await getOrCreateParticipantSession({ teamId, competitorId, roundId });
    return res.json({ success: true, ...sessionData });
  } catch (err: any) {
    next(err);
  }
}

export async function handleSaveAnswer(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = req.user?.teamId;
    const competitorId = req.user?.competitorId;
    const { roundId, questionId, selectedOptionId } = req.body;

    if ((!teamId && !competitorId) || !roundId || !questionId) {
      return res.status(400).json({
        success: false,
        error: 'Participant identity, roundId, and questionId are required.',
      });
    }

    await saveAnswer({ teamId, competitorId, roundId, questionId, selectedOptionId });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Save answer failed.' });
  }
}

export async function handleSubmitQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const teamId = req.user?.teamId;
    const competitorId = req.user?.competitorId;
    const { roundId } = req.body;

    if ((!teamId && !competitorId) || !roundId) {
      return res.status(400).json({ success: false, error: 'roundId is required.' });
    }

    const session = await submitQuiz({ teamId, competitorId, roundId });
    return res.json({ success: true, session });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Submit failed.' });
  }
}

export async function handleGetServerTime(req: Request, res: Response, next: NextFunction) {
  return res.json({
    success: true,
    serverTime: new Date().toISOString(),
    timestamp: Date.now(),
  });
}
