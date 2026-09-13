import { Router } from 'express';
import authRoutes from './authRoutes';
import roomRoutes from './roomRoutes';
import teamRoutes from './teamRoutes';
import questionRoutes from './questionRoutes';
import quizRoutes from './quizRoutes';
import resultsRoutes from './resultsRoutes';
import antiCheatRoutes from './antiCheatRoutes';
import participantRoutes from './participantRoutes';
import qualificationRoutes from './qualificationRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/rooms', roomRoutes);
router.use('/teams', teamRoutes);
router.use('/questions', questionRoutes);
router.use('/quiz', quizRoutes);
router.use('/results', resultsRoutes);
router.use('/anticheat', antiCheatRoutes);
router.use('/participant', participantRoutes);
router.use('/qualification', qualificationRoutes);

export default router;
