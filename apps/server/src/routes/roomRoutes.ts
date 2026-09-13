import { Router } from 'express';
import {
  handleGetOrCreateRoom,
  handleGetRoomByCode,
  handleUpdateRoomStatus,
  handleConfigureRound,
  handleStartRound,
  handleEndRound,
  handleGetDevInfo,
  handleResetTestRoom,
  handleUpdateRoomCode,
  handleGetCurrentRoom,
} from '../controllers/roomController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/dev-info', handleGetDevInfo);
router.get('/current', authenticate, handleGetCurrentRoom);
router.post('/init', authenticate, requireAdmin, handleGetOrCreateRoom);
router.get('/code/:roomCode', handleGetRoomByCode);
router.post('/update-code', authenticate, requireAdmin, handleUpdateRoomCode);
router.post('/:roomId/update-code', authenticate, requireAdmin, handleUpdateRoomCode);
router.patch('/:roomId/status', authenticate, requireAdmin, handleUpdateRoomStatus);
router.patch('/rounds/:roundId/config', authenticate, requireAdmin, handleConfigureRound);
router.post('/rounds/:roundId/start', authenticate, requireAdmin, handleStartRound);
router.post('/rounds/:roundId/end', authenticate, requireAdmin, handleEndRound);

// Dev / Test Room Reset Endpoint (Admin Only)
router.post('/test-room/reset', authenticate, requireAdmin, handleResetTestRoom);

export default router;
