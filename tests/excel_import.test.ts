import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as XLSX from 'xlsx';
import {
  generateExcelTemplate,
  parseAndValidateExcel,
  importExcelQuestions,
} from '../apps/server/src/services/excelImportService';
import { prisma } from '../apps/server/src/db/client';

describe('Excel Question Import Service', () => {
  let testRoomId: string;
  let testRoundId: string;

  beforeAll(async () => {
    // Find or create a test room and round for live DB tests
    let room = await prisma.quizRoom.findFirst({
      where: { roomCode: 'EXCEL_TEST' },
    });
    if (!room) {
      room = await prisma.quizRoom.create({
        data: {
          roomCode: 'EXCEL_TEST',
          title: 'Excel Import Test Room',
          status: 'CREATED',
        },
      });
    }
    testRoomId = room.id;

    let round = await prisma.quizRound.findFirst({
      where: { roomId: testRoomId, roundNumber: 1 },
    });
    if (!round) {
      round = await prisma.quizRound.create({
        data: {
          roomId: testRoomId,
          roundNumber: 1,
          roundName: 'TEST SYNTRACE',
          status: 'CREATED',
          durationMinutes: 15,
        },
      });
    }
    testRoundId = round.id;

    // Clean up any existing questions in this test round
    await prisma.option.deleteMany({
      where: { question: { roundId: testRoundId } },
    });
    await prisma.question.deleteMany({
      where: { roundId: testRoundId },
    });
  });

  afterAll(async () => {
    // Clean up test data
    if (testRoundId) {
      await prisma.option.deleteMany({
        where: { question: { roundId: testRoundId } },
      });
      await prisma.question.deleteMany({
        where: { roundId: testRoundId },
      });
      await prisma.quizRound.deleteMany({
        where: { roomId: testRoomId },
      });
    }
    if (testRoomId) {
      await prisma.quizRoom.deleteMany({
        where: { id: testRoomId },
      });
    }
    await prisma.$disconnect();
  });

  it('1. Generates valid Excel template with Questions and Instructions sheets', () => {
    const buffer = generateExcelTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    expect(workbook.SheetNames).toContain('Questions');
    expect(workbook.SheetNames).toContain('Instructions');

    const questionsSheet = workbook.Sheets['Questions'];
    const rows = XLSX.utils.sheet_to_json<string[]>(questionsSheet, { header: 1 });
    
    // Check header row
    const headers = rows[0];
    expect(headers).toEqual(['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer']);

    // Check that sample questions exist
    expect(rows.length).toBeGreaterThan(2);
    const sampleRow = rows[1];
    expect(sampleRow[0]).toBeTruthy(); // Question text
    expect(sampleRow[1]).toBeTruthy(); // Option A
    expect(sampleRow[2]).toBeTruthy(); // Option B
    expect(sampleRow[3]).toBeTruthy(); // Option C
    expect(sampleRow[4]).toBeTruthy(); // Option D
    expect(['A', 'B', 'C', 'D']).toContain(sampleRow[5]); // Valid Answer
  });

  it('2. Parses valid Excel workbook correctly with normalized answers', async () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'],
      ['What does FOSS stand for?', 'Free & Open Source Software', 'Fully Optimized System Software', 'Fast Operating System Server', 'Federal Office for Safety Standards', 'A'],
      ['Which command lists files in Linux?', 'cd', 'ls', 'mkdir', 'rm', ' b '], // lower case + whitespace
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const preview = await parseAndValidateExcel(buffer, 'test.xlsx', testRoundId);

    expect(preview.totalRows).toBe(2);
    expect(preview.validCount).toBe(2);
    expect(preview.invalidCount).toBe(0);
    expect(preview.duplicateCount).toBe(0);
    expect(preview.rows[0].status).toBe('VALID');
    expect(preview.rows[0].answer).toBe('A');
    expect(preview.rows[1].status).toBe('VALID');
    expect(preview.rows[1].answer).toBe('B'); // normalized from ' b '
  });

  it('3. Validates and marks rows INVALID for missing fields or invalid answer letter', async () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'],
      ['', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'A'], // missing question
      ['Valid question text?', 'Option 1', '', 'Option 3', 'Option 4', 'A'], // missing option B
      ['Another valid question?', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'E'], // invalid answer 'E'
      ['Third valid question?', 'Option 1', 'Option 2', 'Option 3', 'Option 4', ''], // empty answer
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const preview = await parseAndValidateExcel(buffer, 'test.xlsx', testRoundId);

    expect(preview.totalRows).toBe(4);
    expect(preview.validCount).toBe(0);
    expect(preview.invalidCount).toBe(4);

    expect(preview.rows[0].status).toBe('INVALID');
    expect(preview.rows[0].errors?.some((e: string) => e.includes('Question text is empty'))).toBe(true);

    expect(preview.rows[1].status).toBe('INVALID');
    expect(preview.rows[1].errors?.some((e: string) => e.includes('Option B is empty'))).toBe(true);

    expect(preview.rows[2].status).toBe('INVALID');
    expect(preview.rows[2].errors?.some((e: string) => e.includes('Must be A, B, C, or D'))).toBe(true);

    expect(preview.rows[3].status).toBe('INVALID');
    expect(preview.rows[3].errors?.some((e: string) => e.includes('Answer is empty'))).toBe(true);
  });

  it('4. Preserves multiline code snippets and formatting inside question text', async () => {
    const multilineQuestion = `What is the output of the following Python snippet?\n\`\`\`python\ndef greet(name):\n    return f"Hello, {name}!"\nprint(greet("FOSS"))\n\`\`\``;
    const wb = XLSX.utils.book_new();
    const data = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'],
      [multilineQuestion, 'Hello, FOSS!', 'None', 'Error', 'Hello, name!', 'A'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const preview = await parseAndValidateExcel(buffer, 'test.xlsx', testRoundId);
    expect(preview.rows[0].status).toBe('VALID');
    expect(preview.rows[0].questionText).toBe(multilineQuestion);
  });

  it('5. Detects in-file duplicates and marks them with warning', async () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'],
      ['What is Docker?', 'Containerization platform', 'Virtual machine', 'Compiler', 'Text editor', 'A'],
      ['what is docker?', 'Another A', 'Another B', 'Another C', 'Another D', 'B'], // duplicate with different case
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const preview = await parseAndValidateExcel(buffer, 'test.xlsx', testRoundId);

    expect(preview.totalRows).toBe(2);
    expect(preview.validCount).toBe(1);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.rows[0].status).toBe('VALID');
    expect(preview.rows[1].status).toBe('DUPLICATE');
    expect(preview.rows[1].warnings?.some((w: string) => w.includes('Duplicate question in uploaded file'))).toBe(true);
  });

  it('6. Imports questions into database appending sequentially after existing questions', async () => {
    // First, insert an initial manual question in test round
    const initialQuestion = await prisma.question.create({
      data: {
        roundId: testRoundId,
        questionNumber: 1,
        questionText: 'Initial Manual Question 1',
        options: {
          create: [
            { optionLetter: 'A', optionText: 'Opt A', isCorrect: true },
            { optionLetter: 'B', optionText: 'Opt B', isCorrect: false },
            { optionLetter: 'C', optionText: 'Opt C', isCorrect: false },
            { optionLetter: 'D', optionText: 'Opt D', isCorrect: false },
          ],
        },
      },
    });

    expect(initialQuestion.questionNumber).toBe(1);

    // Now import two new questions from Excel
    const wb = XLSX.utils.book_new();
    const data = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'],
      ['Imported Question 2', 'Imp A1', 'Imp B1', 'Imp C1', 'Imp D1', 'C'],
      ['Imported Question 3', 'Imp A2', 'Imp B2', 'Imp C2', 'Imp D2', 'D'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const preview = await parseAndValidateExcel(buffer, 'test.xlsx', testRoundId);
    expect(preview.validCount).toBe(2);

    const itemsToImport = preview.rows
      .filter((r) => r.status === 'VALID')
      .map((r) => ({
        questionText: r.questionText,
        optionA: r.optionA,
        optionB: r.optionB,
        optionC: r.optionC,
        optionD: r.optionD,
        answer: r.answer as 'A' | 'B' | 'C' | 'D',
      }));

    const result = await importExcelQuestions(testRoundId, itemsToImport);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);

    // Verify all 3 questions in database
    const questionsInDb = await prisma.question.findMany({
      where: { roundId: testRoundId },
      orderBy: { questionNumber: 'asc' },
      include: {
        options: {
          orderBy: { optionLetter: 'asc' },
        },
      },
    });

    expect(questionsInDb.length).toBe(3);
    expect(questionsInDb[0].questionNumber).toBe(1);
    expect(questionsInDb[0].questionText).toBe('Initial Manual Question 1');

    // New questions sequentially numbered 2 and 3
    expect(questionsInDb[1].questionNumber).toBe(2);
    expect(questionsInDb[1].questionText).toBe('Imported Question 2');
    expect(questionsInDb[2].questionNumber).toBe(3);
    expect(questionsInDb[2].questionText).toBe('Imported Question 3');

    // Verify fixed option ordering (A, B, C, D) and correct answers
    const q2Options = questionsInDb[1].options;
    expect(q2Options.map((o) => o.optionLetter)).toEqual(['A', 'B', 'C', 'D']);
    expect(q2Options.find((o) => o.optionLetter === 'C')?.isCorrect).toBe(true);
    expect(q2Options.find((o) => o.optionLetter === 'A')?.isCorrect).toBe(false);

    const q3Options = questionsInDb[2].options;
    expect(q3Options.map((o) => o.optionLetter)).toEqual(['A', 'B', 'C', 'D']);
    expect(q3Options.find((o) => o.optionLetter === 'D')?.isCorrect).toBe(true);
    expect(q3Options.find((o) => o.optionLetter === 'B')?.isCorrect).toBe(false);
  });

  it('7. Detects duplicates against existing database questions and skips them when excludeDuplicates=true', async () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'],
      ['Imported Question 2', 'A', 'B', 'C', 'D', 'A'], // already in DB!
      ['Unique Question 4', 'U A', 'U B', 'U C', 'U D', 'B'], // new
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const preview = await parseAndValidateExcel(buffer, 'test.xlsx', testRoundId);
    expect(preview.duplicateCount).toBe(1);
    expect(preview.rows[0].status).toBe('DUPLICATE');
    expect(preview.rows[0].warnings?.some((w: string) => w.includes('Question already exists in'))).toBe(true);
    expect(preview.rows[1].status).toBe('VALID');

    // Filter items with excludeDuplicates = true (only VALID)
    const itemsToImport = preview.rows
      .filter((r) => r.status === 'VALID')
      .map((r) => ({
        questionText: r.questionText,
        optionA: r.optionA,
        optionB: r.optionB,
        optionC: r.optionC,
        optionD: r.optionD,
        answer: r.answer as 'A' | 'B' | 'C' | 'D',
      }));

    const result = await importExcelQuestions(testRoundId, itemsToImport);
    expect(result.success).toBe(true);
    expect(result.count).toBe(1); // only Unique Question 4 imported

    // Total in round should now be 4
    const totalCount = await prisma.question.count({ where: { roundId: testRoundId } });
    expect(totalCount).toBe(4);
  });
});
