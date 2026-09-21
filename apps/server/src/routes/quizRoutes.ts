import { Router } from 'express';
import {
  handleGetQuizSession,
  handleSaveAnswer,
  handleSubmitQuiz,
  handleGetServerTime,
} from '../controllers/quizController';
import { authenticate, requireTeam } from '../middleware/auth';

const router = Router();

router.get('/session/:roundId', authenticate, requireTeam, handleGetQuizSession);
router.post('/answer', authenticate, requireTeam, handleSaveAnswer);
router.post('/submit', authenticate, requireTeam, handleSubmitQuiz);
router.get('/time', handleGetServerTime);

export default router;
