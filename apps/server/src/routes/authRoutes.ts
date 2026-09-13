import { Router } from 'express';
import { handleAdminLogin, handleTeamLogin, handleGetMe } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login/admin', handleAdminLogin);
router.post('/login/team', handleTeamLogin);
router.get('/me', authenticate, handleGetMe);

export default router;
