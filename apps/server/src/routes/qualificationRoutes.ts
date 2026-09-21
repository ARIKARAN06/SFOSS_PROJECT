import { Router } from 'express';
import {
  handleGetQualificationStatus,
  handleQualifyTeams,
  handleQualifyTopN,
  handleUpdatePlayerNames,
  handleUnqualifyTeam,
  handleResetCompetitorClaim,
} from '../controllers/qualificationController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/:roundId', authenticate, requireAdmin, handleGetQualificationStatus);
router.post('/qualify', authenticate, requireAdmin, handleQualifyTeams);
router.post('/qualify-top-n', authenticate, requireAdmin, handleQualifyTopN);
router.post('/update-players', authenticate, requireAdmin, handleUpdatePlayerNames);
router.post('/update-player-names', authenticate, requireAdmin, handleUpdatePlayerNames);
router.patch('/update-player-names', authenticate, requireAdmin, handleUpdatePlayerNames);
router.post('/unqualify', authenticate, requireAdmin, handleUnqualifyTeam);

// Round 2 Competitor Claim Reset / Revoke endpoints
router.post('/competitors/:competitorId/reset-claim', authenticate, requireAdmin, handleResetCompetitorClaim);
router.post('/reset-claim/:competitorId', authenticate, requireAdmin, handleResetCompetitorClaim);
router.post('/reset-claim', authenticate, requireAdmin, handleResetCompetitorClaim);

export default router;
