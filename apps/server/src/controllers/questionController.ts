import { Request, Response, NextFunction } from 'express';
import {
  createManualQuestion,
  updateManualQuestion,
  deleteManualQuestion,
  reorderQuestions,
  processUploadedQuestionPaper,
  approveAndSaveQuestionSet,
  getOfficialQuestions,
} from '../services/questionService';

export async function handleCreateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId, questionText, codeSnippet, explanation, options } = req.body;
    if (!roundId || !questionText || !options) {
      return res.status(400).json({ success: false, error: 'roundId, questionText, and options are required.' });
    }

    const question = await createManualQuestion(roundId, {
      questionText,
      codeSnippet,
      explanation,
      options,
    });

    return res.status(201).json({ success: true, question });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to create question.' });
  }
}

export async function handleUpdateQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { questionId } = req.params;
    const { questionText, codeSnippet, explanation, options } = req.body;

    const question = await updateManualQuestion(questionId, {
      questionText,
      codeSnippet,
      explanation,
      options,
    });

    return res.json({ success: true, question });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update question.' });
  }
}

export async function handleDeleteQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const { questionId } = req.params;
    await deleteManualQuestion(questionId);
    return res.json({ success: true, message: 'Question deleted.' });
  } catch (err: any) {
    next(err);
  }
}

export async function handleReorderQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const { orderedQuestionIds } = req.body;

    await reorderQuestions(roundId, orderedQuestionIds);
    return res.json({ success: true, message: 'Questions reordered successfully.' });
  } catch (err: any) {
    next(err);
  }
}

export async function handleUploadQuestionPaper(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const parseResult = await processUploadedQuestionPaper(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    return res.json({ success: true, parseResult });
  } catch (err: any) {
    next(err);
  }
}

export async function handleApproveQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId, parseResult } = req.body;
    if (!roundId || !parseResult) {
      return res.status(400).json({ success: false, error: 'Round ID and parseResult are required.' });
    }

    const createdQuestions = await approveAndSaveQuestionSet(roundId, parseResult);
    return res.json({ success: true, count: createdQuestions.length, questions: createdQuestions });
  } catch (err: any) {
    next(err);
  }
}

export async function handleGetRoundQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const questions = await getOfficialQuestions(roundId);

    // If request comes from non-admin participant, mask isCorrect
    const isAdmin = req.user?.role === 'SUPERADMIN' || req.user?.role === 'EVENT_ORGANIZER';
    if (!isAdmin) {
      const masked = questions.map((q: any) => ({
        ...q,
        options: q.options.map((opt: any) => ({
          id: opt.id,
          questionId: opt.questionId,
          optionLetter: opt.optionLetter,
          optionText: opt.optionText,
          // Mask isCorrect
        })),
      }));
      return res.json({ success: true, questions: masked });
    }

    return res.json({ success: true, questions });
  } catch (err: any) {
    next(err);
  }
}

// ----------------------------------------------------
// EXCEL QUESTION IMPORT CONTROLLERS
// ----------------------------------------------------
import {
  generateExcelTemplate,
  parseAndValidateExcel,
  importExcelQuestions,
} from '../services/excelImportService';

export async function handleDownloadExcelTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const buffer = generateExcelTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="FOSSFURY26_Question_Template.xlsx"');
    return res.send(buffer);
  } catch (err: any) {
    next(err);
  }
}

export async function handlePreviewExcelQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No Excel file uploaded.' });
    }
    const { roundId } = req.body;
    if (!roundId) {
      return res.status(400).json({ success: false, error: 'Destination roundId is required.' });
    }

    const preview = await parseAndValidateExcel(
      req.file.buffer,
      req.file.originalname,
      roundId
    );

    return res.json({ success: true, preview });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to preview Excel file.' });
  }
}

export async function handleImportExcelQuestions(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId, questions } = req.body;
    if (!roundId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'roundId and questions array are required.' });
    }

    const result = await importExcelQuestions(roundId, questions);
    return res.json({
      success: true,
      message: `${result.count} questions imported successfully into Round ${result.roundNumber} — ${result.roundName}.`,
      count: result.count,
      roundName: result.roundName,
      roundNumber: result.roundNumber,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to import questions.' });
  }
}
