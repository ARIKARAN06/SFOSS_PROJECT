import { Router } from 'express';
import multer from 'multer';
import {
  handleCreateQuestion,
  handleUpdateQuestion,
  handleDeleteQuestion,
  handleReorderQuestions,
  handleUploadQuestionPaper,
  handleApproveQuestions,
  handleGetRoundQuestions,
  handleDownloadExcelTemplate,
  handlePreviewExcelQuestions,
  handleImportExcelQuestions,
} from '../controllers/questionController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Manual Question Builder Endpoints (Admin Only)
router.post('/manual', authenticate, requireAdmin, handleCreateQuestion);
router.put('/manual/:questionId', authenticate, requireAdmin, handleUpdateQuestion);
router.delete('/manual/:questionId', authenticate, requireAdmin, handleDeleteQuestion);
router.post('/reorder/:roundId', authenticate, requireAdmin, handleReorderQuestions);

// Excel Question Import Endpoints (Admin Only)
router.get('/excel-template', authenticate, requireAdmin, handleDownloadExcelTemplate);
router.post('/excel-preview', authenticate, requireAdmin, upload.single('file'), handlePreviewExcelQuestions);
router.post('/excel-import', authenticate, requireAdmin, handleImportExcelQuestions);

// Document Upload Endpoints (Admin Only)
router.post('/upload', authenticate, requireAdmin, upload.single('file'), handleUploadQuestionPaper);
router.post('/approve', authenticate, requireAdmin, handleApproveQuestions);

// Fetch Questions (Admin gets full details including correct answer; Participant gets masked options)
router.get('/round/:roundId', authenticate, handleGetRoundQuestions);

export default router;
