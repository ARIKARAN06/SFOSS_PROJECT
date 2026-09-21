import { Router } from 'express';
import {
  handleCalculateScores,
  handlePublishResults,
  handleGetLeaderboard,
  handleGetAnswerPaper,
  handleResetOfficialStandings,
} from '../controllers/resultsController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/calculate/:roundId', authenticate, requireAdmin, handleCalculateScores);
router.post('/publish/:roundId', authenticate, requireAdmin, handlePublishResults);
router.post('/reset-standings/:roundId', authenticate, requireAdmin, handleResetOfficialStandings);
router.get('/leaderboard/:roundId', authenticate, requireAdmin, handleGetLeaderboard);
router.get('/answer-paper/:roundId/:teamId', authenticate, requireAdmin, handleGetAnswerPaper);

export default router;
