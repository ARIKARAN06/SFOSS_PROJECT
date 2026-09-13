import { Router } from 'express';
import {
  handleSetTeamCount,
  handleResetTeamSession,
  handleGetAllTeams,
  handleDisqualifyTeam,
  handleResetTeamDisqualification,
  handleResetAllDisqualified,
} from '../controllers/teamController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/count', authenticate, requireAdmin, handleSetTeamCount);
router.post('/reset-disqualified', authenticate, requireAdmin, handleResetAllDisqualified);
router.post('/:teamId/reset-session', authenticate, requireAdmin, handleResetTeamSession);
router.get('/', authenticate, requireAdmin, handleGetAllTeams);
router.post('/:teamId/disqualify', authenticate, requireAdmin, handleDisqualifyTeam);
router.post('/:teamId/reset-disqualification', authenticate, requireAdmin, handleResetTeamDisqualification);

export default router;
