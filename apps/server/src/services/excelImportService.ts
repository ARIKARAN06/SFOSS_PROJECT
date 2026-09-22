import * as XLSX from 'xlsx';
import { prisma } from '../db/client';

export interface ExcelRowPreview {
  rowNumber: number;
  questionText: string;
  codeSnippet?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  status: 'VALID' | 'INVALID' | 'DUPLICATE';
  errors: string[];
  warnings: string[];
  isDuplicateInFile?: boolean;
  isDuplicateInRound?: boolean;
}

export interface ExcelPreviewResult {
  fileName: string;
  sheetName: string;
  roundId: string;
  roundName: string;
  roundNumber: number;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  existingQuestionsCount: number;
  rows: ExcelRowPreview[];
}

export interface ExcelImportItem {
  questionText: string;
  codeSnippet?: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: 'A' | 'B' | 'C' | 'D';
}

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an official Excel template (.xlsx) with Questions sheet and Instructions sheet.
 * Columns: Question | Coding | Op1 | Op2 | Op3 | Op4 | Answer
 */
export function generateExcelTemplate(): Buffer {
  const wb = XLSX.utils.book_new();

  // 1. Questions Worksheet (7 columns)
  const questionsData = [
    ['Question', 'Coding', 'Op1', 'Op2', 'Op3', 'Op4', 'Answer'],
    [
      'What is the output of the following Python list comprehension?',
      'def filter_even_squares(nums):\n    return [x ** 2 for x in nums if x % 2 == 0]\n\nprint(filter_even_squares([1, 2, 3, 4]))',
      '[4, 16]',
      '[1, 9]',
      '[2, 4]',
      '[1, 4, 9, 16]',
      'A',
    ],
    [
      'Which transport layer protocol provides connection-oriented, reliable byte-stream transmission?',
      '',
      'UDP',
      'TCP',
      'ICMP',
      'IP',
      'B',
    ],
    [
      'What value is returned by the calculate() method when invoked?',
      'public class Counter {\n    public static int calculate(int n) {\n        int sum = 0;\n        for (int i = 1; i <= n; i++) {\n            sum += i;\n        }\n        return sum;\n    }\n}',
      '10',
      '15',
      '20',
      '25',
      'B',
    ],
    [
      'What will be the output of the following C code snippet?',
      '#include <stdio.h>\n\nint main() {\n    int a = 10;\n    int *p = &a;\n    *p = 50;\n    printf("%d", a);\n    return 0;\n}',
      '10',
      'Address of a',
      '50',
      'Compilation Error',
      'C',
    ],
  ];

  const wsQuestions = XLSX.utils.aoa_to_sheet(questionsData);
  wsQuestions['!cols'] = [
    { wch: 45 }, // Question
    { wch: 45 }, // Coding
    { wch: 20 }, // Op1
    { wch: 20 }, // Op2
    { wch: 20 }, // Op3
    { wch: 20 }, // Op4
    { wch: 10 }, // Answer
  ];
  XLSX.utils.book_append_sheet(wb, wsQuestions, 'Questions');

  // 2. Instructions Worksheet
  const instructionsData = [
    ['FOSSFURY 26 — EXCEL QUESTION IMPORT TEMPLATE GUIDELINES'],
    [''],
    ['1. EXACT COLUMN HEADERS (7 COLUMNS):'],
    ['   - Column A: Question (Main question prompt or question statement)'],
    ['   - Column B: Coding   (OPTIONAL: Code snippet or program block. Leave empty if question has no code)'],
    ['   - Column C: Op1      (Option A choice text)'],
    ['   - Column D: Op2      (Option B choice text)'],
    ['   - Column E: Op3      (Option C choice text)'],
    ['   - Column F: Op4      (Option D choice text)'],
    ['   - Column G: Answer   (Correct option letter: A, B, C, or D)'],
    [''],
    ['2. CODING COLUMN GUIDELINES:'],
    ['   - The Coding column is optional per question.'],
    ['   - If a question has no code block, leave the cell empty or enter EMPTY.'],
    ['   - Indentation, line breaks (Alt + Enter in Excel), quotes, and syntax symbols are strictly preserved.'],
    ['   - If provided, it will be rendered in a dark code snippet block during the competition.'],
    [''],
    ['3. ANSWER FORMAT:'],
    ['   - Must be a single letter: A, B, C, or D (case-insensitive, e.g. "a", "b", "A", "B").'],
    ['   - Values like "Option 1" or full option text are invalid and will be flagged by the validator.'],
    [''],
    ['4. SHEETS & PREVIEW:'],
    ['   - Keep your questions in the "Questions" sheet.'],
    ['   - The Admin dashboard allows you to preview and verify all rows before committing them to the database.'],
    [''],
    ['5. COMPATIBILITY:'],
    ['   - Legacy sheets with 6 columns (Question, Option A, Option B, Option C, Option D, Answer) are also supported.'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 85 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Parses and validates an uploaded Excel file for a destination round.
 */
export async function parseAndValidateExcel(
  buffer: Buffer,
  fileName: string,
  roundId: string
): Promise<ExcelPreviewResult> {
  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
    select: { id: true, roundName: true, roundNumber: true },
  });

  if (!round) {
    throw new Error(`Destination round '${roundId}' not found.`);
  }

  // Load existing questions for duplicate detection
  const existingQuestions = await prisma.question.findMany({
    where: { roundId },
    select: { id: true, questionText: true },
  });

  const existingNormalizedMap = new Map<string, string>();
  for (const eq of existingQuestions) {
    existingNormalizedMap.set(normalizeForComparison(eq.questionText), eq.questionText);
  }

  // Parse workbook
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err: any) {
    throw new Error(`Failed to parse Excel file. Ensure file is a valid .xlsx or .xls document: ${err.message}`);
  }

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  // Find the target sheet: prefer 'Questions', otherwise find sheet with header row containing required columns
  let targetSheetName = wb.SheetNames.find((s) => s.toLowerCase().trim() === 'questions');

  if (!targetSheetName) {
    // Search sheets excluding 'instructions'
    for (const name of wb.SheetNames) {
      if (name.toLowerCase().includes('instruction')) continue;
      const sheet = wb.Sheets[name];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
      if (rows.length > 0) {
        const headers = (rows[0] || []).map((h: any) => String(h).toLowerCase().replace(/\s+/g, ' ').trim());
        const hasQuestion = headers.some((h) => h.includes('question') || h.includes('prompt'));
        const hasOption = headers.some((h) => h.includes('option') || h.startsWith('op') || h.includes('choice'));
        const hasAnswer = headers.some((h) => h.includes('answer') || h === 'ans');
        if (hasQuestion && hasOption && hasAnswer) {
          targetSheetName = name;
          break;
        }
      }
    }
  }

  if (!targetSheetName) {
    targetSheetName = wb.SheetNames[0];
  }

  const sheet = wb.Sheets[targetSheetName];
  if (!sheet) {
    throw new Error(`Worksheet '${targetSheetName}' not found in workbook.`);
  }

  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: '' });
  if (rawRows.length === 0) {
    throw new Error(`Worksheet '${targetSheetName}' is completely empty.`);
  }

  // Identify header indices
  let headerRowIndex = -1;
  let qCol = -1;
  let codingCol = -1;
  let optACol = -1;
  let optBCol = -1;
  let optCCol = -1;
  let optDCol = -1;
  let ansCol = -1;

  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i] || [];
    const normalizedHeaders = row.map((c: any) => String(c).toLowerCase().replace(/\s+/g, ' ').trim());

    const qIdx = normalizedHeaders.findIndex(
      (h) => h === 'question' || h === 'question text' || h === 'prompt' || h === 'problem' || h.startsWith('question')
    );
    const codingIdx = normalizedHeaders.findIndex(
      (h) => h === 'coding' || h === 'code' || h === 'code block' || h === 'code snippet' || h === 'programming code'
    );
    const aIdx = normalizedHeaders.findIndex(
      (h) => h === 'op1' || h === 'op 1' || h === 'option 1' || h === 'option a' || h === 'option_a' || h === 'choice a' || h === 'choice 1' || h === 'a'
    );
    const bIdx = normalizedHeaders.findIndex(
      (h) => h === 'op2' || h === 'op 2' || h === 'option 2' || h === 'option b' || h === 'option_b' || h === 'choice b' || h === 'choice 2' || h === 'b'
    );
    const cIdx = normalizedHeaders.findIndex(
      (h) => h === 'op3' || h === 'op 3' || h === 'option 3' || h === 'option c' || h === 'option_c' || h === 'choice c' || h === 'choice 3' || h === 'c'
    );
    const dIdx = normalizedHeaders.findIndex(
      (h) => h === 'op4' || h === 'op 4' || h === 'option 4' || h === 'option d' || h === 'option_d' || h === 'choice d' || h === 'choice 4' || h === 'd'
    );
    const ansIdx = normalizedHeaders.findIndex(
      (h) => h === 'answer' || h === 'correct answer' || h === 'correct' || h === 'ans'
    );

    if (qIdx !== -1 && aIdx !== -1 && bIdx !== -1 && cIdx !== -1 && dIdx !== -1 && ansIdx !== -1) {
      headerRowIndex = i;
      qCol = qIdx;
      codingCol = codingIdx; // can be -1 if 6-column sheet without Coding
      optACol = aIdx;
      optBCol = bIdx;
      optCCol = cIdx;
      optDCol = dIdx;
      ansCol = ansIdx;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Fallback: Check column count in first row
    const firstRow = (rawRows[0] || []).map((c: any) => String(c).trim());
    if (firstRow.length >= 7) {
      // 7-column positional: Question | Coding | Op1 | Op2 | Op3 | Op4 | Answer
      headerRowIndex = 0;
      qCol = 0;
      codingCol = 1;
      optACol = 2;
      optBCol = 3;
      optCCol = 4;
      optDCol = 5;
      ansCol = 6;
    } else if (firstRow.length >= 6) {
      // 6-column legacy positional: Question | Option A | Option B | Option C | Option D | Answer
      headerRowIndex = 0;
      qCol = 0;
      codingCol = -1;
      optACol = 1;
      optBCol = 2;
      optCCol = 3;
      optDCol = 4;
      ansCol = 5;
    } else {
      throw new Error(
        `Invalid Excel template headers in sheet '${targetSheetName}'. Required columns: Question, Coding, Op1, Op2, Op3, Op4, Answer (or legacy 6 columns: Question, Option A, Option B, Option C, Option D, Answer).`
      );
    }
  }

  const rows: ExcelRowPreview[] = [];
  const fileSeenQuestions = new Map<string, number>();

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const rawRow = rawRows[r] || [];
    const rowNum = r + 1; // 1-based index in Excel

    const questionText = String(rawRow[qCol] ?? '').trim();
    const optA = String(rawRow[optACol] ?? '').trim();
    const optB = String(rawRow[optBCol] ?? '').trim();
    const optC = String(rawRow[optCCol] ?? '').trim();
    const optD = String(rawRow[optDCol] ?? '').trim();
    const answerRaw = String(rawRow[ansCol] ?? '').trim();

    // Extract coding snippet if column present
    let codeSnippet: string | undefined = undefined;
    if (codingCol !== -1 && rawRow[codingCol] !== undefined && rawRow[codingCol] !== null) {
      const rawCode = String(rawRow[codingCol]);
      const trimmedCode = rawCode.trim();
      if (trimmedCode.length > 0 && trimmedCode.toUpperCase() !== 'EMPTY') {
        // Normalize line endings to \n while preserving internal line indentation
        codeSnippet = rawCode
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/^\n+/, '')
          .replace(/\n+$/, '');
        if (codeSnippet.trim().length === 0) {
          codeSnippet = undefined;
        }
      }
    }

    // Check if entire row is empty
    if (!questionText && !codeSnippet && !optA && !optB && !optC && !optD && !answerRaw) {
      continue;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation 1: Question text
    if (!questionText) {
      errors.push(`Row ${rowNum}: Question text is empty.`);
    }

    // Validation 2: Options
    if (!optA) errors.push(`Row ${rowNum}: Option A is empty.`);
    if (!optB) errors.push(`Row ${rowNum}: Option B is empty.`);
    if (!optC) errors.push(`Row ${rowNum}: Option C is empty.`);
    if (!optD) errors.push(`Row ${rowNum}: Option D is empty.`);

    // Validation 3: Answer
    let normalizedAnswer = answerRaw.toUpperCase().replace(/[^A-D]/g, '');
    if (!answerRaw) {
      errors.push(`Row ${rowNum}: Answer is empty. Specify A, B, C, or D.`);
    } else if (!['A', 'B', 'C', 'D'].includes(normalizedAnswer) || normalizedAnswer.length !== 1) {
      errors.push(`Row ${rowNum}: Invalid correct answer '${answerRaw}'. Must be A, B, C, or D.`);
    }

    // Validation 4: Duplicates
    let isDuplicateInFile = false;
    let isDuplicateInRound = false;

    if (questionText) {
      const normQ = normalizeForComparison(questionText);
      if (fileSeenQuestions.has(normQ)) {
        const prevRow = fileSeenQuestions.get(normQ);
        isDuplicateInFile = true;
        warnings.push(`Row ${rowNum}: Duplicate question in uploaded file (identical to Row ${prevRow}).`);
      } else {
        fileSeenQuestions.set(normQ, rowNum);
      }

      if (existingNormalizedMap.has(normQ)) {
        isDuplicateInRound = true;
        warnings.push(`Row ${rowNum}: Question already exists in ${round.roundName}.`);
      }
    }

    let status: 'VALID' | 'INVALID' | 'DUPLICATE' = 'VALID';
    if (errors.length > 0) {
      status = 'INVALID';
      invalidCount++;
    } else if (isDuplicateInFile || isDuplicateInRound) {
      status = 'DUPLICATE';
      duplicateCount++;
    } else {
      validCount++;
    }

    rows.push({
      rowNumber: rowNum,
      questionText,
      codeSnippet,
      optionA: optA,
      optionB: optB,
      optionC: optC,
      optionD: optD,
      answer: normalizedAnswer || answerRaw,
      status,
      errors,
      warnings,
      isDuplicateInFile,
      isDuplicateInRound,
    });
  }

  return {
    fileName,
    sheetName: targetSheetName,
    roundId: round.id,
    roundName: round.roundName,
    roundNumber: round.roundNumber,
    totalRows: rows.length,
    validCount,
    invalidCount,
    duplicateCount,
    existingQuestionsCount: existingQuestions.length,
    rows,
  };
}

/**
 * Commits verified Excel questions into the database within a Prisma transaction.
 */
export async function importExcelQuestions(
  roundId: string,
  itemsToImport: ExcelImportItem[]
): Promise<{ success: boolean; count: number; roundName: string; roundNumber: number }> {
  if (!itemsToImport || itemsToImport.length === 0) {
    throw new Error('No valid questions provided for import.');
  }

  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error(`Round '${roundId}' not found.`);
  }

  // Find highest existing questionNumber
  const highestQ = await prisma.question.findFirst({
    where: { roundId },
    orderBy: { questionNumber: 'desc' },
  });

  let startingNum = highestQ ? highestQ.questionNumber : 0;

  return prisma.$transaction(async (tx: any) => {
    let createdCount = 0;

    for (const item of itemsToImport) {
      startingNum += 1;

      await tx.question.create({
        data: {
          roundId,
          questionNumber: startingNum,
          questionText: item.questionText.trim(),
          codeSnippet: item.codeSnippet ? item.codeSnippet.trim() : null,
          options: {
            create: [
              {
                optionLetter: 'A',
                optionText: item.optionA.trim(),
                isCorrect: item.answer === 'A',
              },
              {
                optionLetter: 'B',
                optionText: item.optionB.trim(),
                isCorrect: item.answer === 'B',
              },
              {
                optionLetter: 'C',
                optionText: item.optionC.trim(),
                isCorrect: item.answer === 'C',
              },
              {
                optionLetter: 'D',
                optionText: item.optionD.trim(),
                isCorrect: item.answer === 'D',
              },
            ],
          },
        },
      });

      createdCount++;
    }

    return {
      success: true,
      count: createdCount,
      roundName: round.roundName,
      roundNumber: round.roundNumber,
    };
  });
}
