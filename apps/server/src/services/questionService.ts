import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { prisma } from '../db/client';
import { parseRawQuestionText, ParseResult } from '@sfoss/shared';

// ----------------------------------------------------
// MANUAL QUESTION BUILDER SERVICES
// ----------------------------------------------------

export interface ManualQuestionInput {
  questionNumber?: number;
  questionText: string;
  codeSnippet?: string;
  explanation?: string;
  options: Array<{
    optionLetter: string; // "A", "B", "C", "D"
    optionText: string;
    isCorrect: boolean;
  }>;
}

export async function createManualQuestion(roundId: string, input: ManualQuestionInput) {
  if (!input.questionText || input.questionText.trim().length === 0) {
    throw new Error('Question text is required.');
  }

  const validOptions = input.options.filter((opt) => opt.optionText && opt.optionText.trim().length > 0);
  if (validOptions.length < 2) {
    throw new Error('Question requires at least 2 non-empty answer options.');
  }

  const correctOption = input.options.find((opt) => opt.isCorrect);
  if (!correctOption) {
    throw new Error('Please select a correct answer for this question.');
  }

  // Calculate next question number if not provided
  let qNum = input.questionNumber;
  if (!qNum) {
    const highestQ = await prisma.question.findFirst({
      where: { roundId },
      orderBy: { questionNumber: 'desc' },
    });
    qNum = highestQ ? highestQ.questionNumber + 1 : 1;
  }

  return prisma.question.create({
    data: {
      roundId,
      questionNumber: qNum,
      questionText: input.questionText.trim(),
      codeSnippet: input.codeSnippet ? input.codeSnippet.trim() : null,
      explanation: input.explanation ? input.explanation.trim() : null,
      options: {
        create: input.options.map((opt) => ({
          optionLetter: opt.optionLetter,
          optionText: opt.optionText.trim(),
          isCorrect: opt.isCorrect,
        })),
      },
    },
    include: { options: true },
  });
}

export async function updateManualQuestion(questionId: string, input: ManualQuestionInput) {
  if (!input.questionText || input.questionText.trim().length === 0) {
    throw new Error('Question text is required.');
  }

  const validOptions = input.options.filter((opt) => opt.optionText && opt.optionText.trim().length > 0);
  if (validOptions.length < 2) {
    throw new Error('Question requires at least 2 non-empty answer options.');
  }

  const correctOption = input.options.find((opt) => opt.isCorrect);
  if (!correctOption) {
    throw new Error('Please select a correct answer for this question.');
  }

  return prisma.$transaction(async (tx: any) => {
    // Delete existing options
    await tx.option.deleteMany({ where: { questionId } });

    // Update question & recreate options
    return tx.question.update({
      where: { id: questionId },
      data: {
        questionText: input.questionText.trim(),
        codeSnippet: input.codeSnippet ? input.codeSnippet.trim() : null,
        explanation: input.explanation ? input.explanation.trim() : null,
        options: {
          create: input.options.map((opt) => ({
            optionLetter: opt.optionLetter,
            optionText: opt.optionText.trim(),
            isCorrect: opt.isCorrect,
          })),
        },
      },
      include: { options: true },
    });
  });
}

export async function deleteManualQuestion(questionId: string) {
  return prisma.question.delete({
    where: { id: questionId },
  });
}

export async function reorderQuestions(roundId: string, orderedQuestionIds: string[]) {
  return prisma.$transaction(async (tx: any) => {
    for (let i = 0; i < orderedQuestionIds.length; i++) {
      await tx.question.update({
        where: { id: orderedQuestionIds[i] },
        data: { questionNumber: i + 1 },
      });
    }
  });
}

// ----------------------------------------------------
// DOCUMENT PARSER SERVICES (OPTIONAL BACKUP METHOD)
// ----------------------------------------------------

export async function processUploadedQuestionPaper(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParseResult> {
  let extractedText = '';

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    const res = await mammoth.extractRawText({ buffer });
    extractedText = res.value;
  } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const res = await pdfParse(buffer);
    extractedText = res.text;
  } else {
    extractedText = buffer.toString('utf-8');
  }

  return parseRawQuestionText(extractedText);
}

export async function approveAndSaveQuestionSet(roundId: string, parseResult: ParseResult) {
  if (parseResult.validQuestions.length === 0) {
    throw new Error('Cannot approve empty or invalid question paper.');
  }

  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error(`Round '${roundId}' not found.`);
  }

  return prisma.$transaction(async (tx: any) => {
    await tx.question.deleteMany({ where: { roundId } });

    const createdQuestions = [];
    for (const q of parseResult.validQuestions) {
      const question = await tx.question.create({
        data: {
          roundId,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          codeSnippet: q.codeSnippet || null,
          explanation: q.explanation || null,
          options: {
            create: [
              { optionLetter: 'A', optionText: q.optionA, isCorrect: q.correctOptionLetter === 'A' },
              { optionLetter: 'B', optionText: q.optionB, isCorrect: q.correctOptionLetter === 'B' },
              { optionLetter: 'C', optionText: q.optionC, isCorrect: q.correctOptionLetter === 'C' },
              { optionLetter: 'D', optionText: q.optionD, isCorrect: q.correctOptionLetter === 'D' },
            ],
          },
        },
        include: { options: true },
      });
      createdQuestions.push(question);
    }

    return createdQuestions;
  });
}

export async function getOfficialQuestions(roundId: string) {
  return prisma.question.findMany({
    where: { roundId },
    orderBy: { questionNumber: 'asc' },
    include: { options: true },
  });
}
