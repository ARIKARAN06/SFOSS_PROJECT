import { Router } from 'express';
import {
  handleLogViolation,
  handleGetLogs,
  handleDisqualify,
  handleDisqualifyCompetitor,
  handleResetCompetitorDisqualification,
} from '../controllers/antiCheatController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/log', authenticate, handleLogViolation);
router.get('/logs', authenticate, requireAdmin, handleGetLogs);
router.post('/disqualify/:teamId', authenticate, requireAdmin, handleDisqualify);

// Round 2 Competitor Disqualification & Reset endpoints
router.post('/competitors/:competitorId/disqualify', authenticate, requireAdmin, handleDisqualifyCompetitor);
router.post('/disqualify-competitor/:competitorId', authenticate, requireAdmin, handleDisqualifyCompetitor);

router.post('/competitors/:competitorId/reset-disqualification', authenticate, requireAdmin, handleResetCompetitorDisqualification);
router.post('/reset-competitor-disqualification/:competitorId', authenticate, requireAdmin, handleResetCompetitorDisqualification);

export default router;
