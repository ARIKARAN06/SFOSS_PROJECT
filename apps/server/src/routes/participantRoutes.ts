import { Router } from 'express';
import {
  handleValidateRoom,
  handleClaimTeam,
  handleClaimRound2Competitor,
  handleRestoreSession,
  handleGetRound1ParticipantResult,
} from '../controllers/participantController';
import { authenticate, requireTeam } from '../middleware/auth';

const router = Router();

router.get('/room/:roomCode', handleValidateRoom);
router.post('/claim-team', handleClaimTeam);
router.post('/claim-competitor', handleClaimRound2Competitor);
router.post('/restore-session', handleRestoreSession);
router.get('/round1/result', authenticate, requireTeam, handleGetRound1ParticipantResult);

export default router;

