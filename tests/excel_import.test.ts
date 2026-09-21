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

    const totalCount = await prisma.question.count({ where: { roundId: testRoundId } });
    expect(totalCount).toBe(4);
  });

  it('8. Verifies template workbook content: 2 sheets, exact 6 headers, sample questions, and valid answers', () => {
    const buffer = generateExcelTemplate();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toEqual(['Questions', 'Instructions']);

    const qSheet = wb.Sheets['Questions'];
    const rows = XLSX.utils.sheet_to_json<string[]>(qSheet, { header: 1 });
    expect(rows[0]).toEqual(['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer']);

    // Check sample rows (rows 1, 2, 3)
    expect(rows.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i <= 3; i++) {
      const row = rows[i];
      expect(row[0]).toBeTruthy(); // Question text
      expect(row[1]).toBeTruthy(); // Option A
      expect(row[2]).toBeTruthy(); // Option B
      expect(row[3]).toBeTruthy(); // Option C
      expect(row[4]).toBeTruthy(); // Option D
      expect(['A', 'B', 'C', 'D']).toContain(row[5]); // Correct answer letter
    }

    // Check Instructions sheet
    const instSheet = wb.Sheets['Instructions'];
    const instRows = XLSX.utils.sheet_to_json<string[]>(instSheet, { header: 1 });
    const flattened = instRows.flat().join(' ');
    expect(flattened).toContain('FOSSFURY 26');
    expect(flattened).toContain('Question');
    expect(flattened).toContain('Answer');
  });
});

describe('Excel Import HTTP API & Auth Protection Tests', () => {
  let server: any;
  let baseUrl: string;
  let adminToken: string;
  let participantToken: string;
  let testRoomId: string;
  let testRound1Id: string;
  let testRound2Id: string;

  beforeAll(async () => {
    const { app } = await import('../apps/server/src/app');
    const http = await import('http');
    const jwt = await import('jsonwebtoken');
    const { ENV } = await import('../apps/server/src/config/env');
    const { Role } = await import('@sfoss/shared');

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Generate valid test JWTs
    adminToken = jwt.default.sign(
      { userId: 'admin-test-id', username: 'admin', role: Role.SUPERADMIN },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    participantToken = jwt.default.sign(
      { userId: 'part-test-id', username: 'team01', role: Role.PARTICIPANT_TEAM, teamId: 'team-mock-id' },
      ENV.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Setup dedicated HTTP test room with Round 1 and Round 2
    let room = await prisma.quizRoom.findFirst({
      where: { roomCode: 'HTTP_EXCEL_TEST' },
    });
    if (!room) {
      room = await prisma.quizRoom.create({
        data: {
          roomCode: 'HTTP_EXCEL_TEST',
          title: 'HTTP Excel Test Room',
          status: 'CREATED',
        },
      });
    }
    testRoomId = room.id;

    // Create Round 1
    let r1 = await prisma.quizRound.findFirst({
      where: { roomId: testRoomId, roundNumber: 1 },
    });
    if (!r1) {
      r1 = await prisma.quizRound.create({
        data: {
          roomId: testRoomId,
          roundNumber: 1,
          roundName: 'SYNTRACE',
          status: 'CREATED',
          durationMinutes: 20,
        },
      });
    }
    testRound1Id = r1.id;

    // Create Round 2
    let r2 = await prisma.quizRound.findFirst({
      where: { roomId: testRoomId, roundNumber: 2 },
    });
    if (!r2) {
      r2 = await prisma.quizRound.create({
        data: {
          roomId: testRoomId,
          roundNumber: 2,
          roundName: 'DEBUGNOVA',
          status: 'CREATED',
          durationMinutes: 15,
        },
      });
    }
    testRound2Id = r2.id;

    // Clean up any existing questions in test rounds
    await prisma.option.deleteMany({
      where: { question: { roundId: { in: [testRound1Id, testRound2Id] } } },
    });
    await prisma.question.deleteMany({
      where: { roundId: { in: [testRound1Id, testRound2Id] } },
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    if (testRoomId) {
      await prisma.option.deleteMany({
        where: { question: { roundId: { in: [testRound1Id, testRound2Id] } } },
      });
      await prisma.question.deleteMany({
        where: { roundId: { in: [testRound1Id, testRound2Id] } },
      });
      await prisma.quizRound.deleteMany({
        where: { roomId: testRoomId },
      });
      await prisma.quizRoom.deleteMany({
        where: { id: testRoomId },
      });
    }
  });

  it('1. GET /api/questions/excel-template: rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${baseUrl}/api/questions/excel-template`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Authentication token required');
  });

  it('2. GET /api/questions/excel-template: rejects participant requests with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/questions/excel-template`, {
      headers: {
        Authorization: `Bearer ${participantToken}`,
      },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('Admin privilege required');
  });

  it('3. GET /api/questions/excel-template: allows Admin to download XLSX template with correct headers and valid workbook', async () => {
    const res = await fetch(`${baseUrl}/api/questions/excel-template`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(res.headers.get('content-disposition')).toContain('FOSSFURY26_Question_Template.xlsx');

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const wb = XLSX.read(buffer, { type: 'buffer' });
    expect(wb.SheetNames).toContain('Questions');
    expect(wb.SheetNames).toContain('Instructions');
  });

  it('4. POST /api/questions/excel-preview: enforces authentication and parses uploaded file', async () => {
    // 4a. Unauthenticated check
    const unauthRes = await fetch(`${baseUrl}/api/questions/excel-preview`, {
      method: 'POST',
    });
    expect(unauthRes.status).toBe(401);

    // 4b. Participant check
    const partRes = await fetch(`${baseUrl}/api/questions/excel-preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participantToken}` },
    });
    expect(partRes.status).toBe(403);

    // 4c. Admin valid upload check using FormData
    const wb = XLSX.utils.book_new();
    const data = [
      ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Answer'],
      ['HTTP Preview Test Q1', 'Opt A', 'Opt B', 'Opt C', 'Opt D', 'A'],
      ['HTTP Preview Test Q2', 'Opt A', 'Opt B', 'Opt C', 'Opt D', 'B'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const blob = new Blob([xlsxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const formData = new FormData();
    formData.append('file', blob, 'questions.xlsx');
    formData.append('roundId', testRound1Id);

    const adminRes = await fetch(`${baseUrl}/api/questions/excel-preview`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });

    expect(adminRes.status).toBe(200);
    const body = await adminRes.json();
    expect(body.success).toBe(true);
    expect(body.preview.validCount).toBe(2);
    expect(body.preview.rows.length).toBe(2);
  });

  it('5. POST /api/questions/excel-import: enforces authentication and transactionally commits questions', async () => {
    // 5a. Unauthenticated check
    const unauthRes = await fetch(`${baseUrl}/api/questions/excel-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundId: testRound1Id, questions: [] }),
    });
    expect(unauthRes.status).toBe(401);

    // 5b. Participant check
    const partRes = await fetch(`${baseUrl}/api/questions/excel-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${participantToken}`,
      },
      body: JSON.stringify({ roundId: testRound1Id, questions: [] }),
    });
    expect(partRes.status).toBe(403);

    // 5c. Admin valid import into Round 1
    const importPayload = {
      roundId: testRound1Id,
      questions: [
        {
          questionText: 'Round 1 Excel Question 1',
          optionA: 'Opt A',
          optionB: 'Opt B',
          optionC: 'Opt C',
          optionD: 'Opt D',
          answer: 'A',
        },
        {
          questionText: 'Round 1 Excel Question 2',
          optionA: 'Opt A',
          optionB: 'Opt B',
          optionC: 'Opt C',
          optionD: 'Opt D',
          answer: 'D',
        },
      ],
    };

    const adminRes = await fetch(`${baseUrl}/api/questions/excel-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(importPayload),
    });

    expect(adminRes.status).toBe(200);
    const body = await adminRes.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(2);
    expect(body.roundNumber).toBe(1);

    // Verify questions in DB for Round 1
    const r1Questions = await prisma.question.findMany({
      where: { roundId: testRound1Id },
      include: { options: { orderBy: { optionLetter: 'asc' } } },
    });
    expect(r1Questions.length).toBe(2);
    expect(r1Questions[0].questionNumber).toBe(1);
    expect(r1Questions[1].questionNumber).toBe(2);
    expect(r1Questions[0].options.map((o) => o.optionLetter)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('6. Supports Round 2 (DEBUGNOVA) import without affecting Round 1', async () => {
    const importPayload = {
      roundId: testRound2Id,
      questions: [
        {
          questionText: 'Round 2 Excel Debug Question 1',
          optionA: 'Bug A',
          optionB: 'Bug B',
          optionC: 'Bug C',
          optionD: 'Bug D',
          answer: 'C',
        },
      ],
    };

    const adminRes = await fetch(`${baseUrl}/api/questions/excel-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(importPayload),
    });

    expect(adminRes.status).toBe(200);
    const body = await adminRes.json();
    expect(body.count).toBe(1);
    expect(body.roundNumber).toBe(2);

    // Confirm Round 1 still has exactly 2 questions and Round 2 has exactly 1 question
    const r1Count = await prisma.question.count({ where: { roundId: testRound1Id } });
    const r2Count = await prisma.question.count({ where: { roundId: testRound2Id } });
    expect(r1Count).toBe(2);
    expect(r2Count).toBe(1);
  });

  it('7. Verifies manual question creation and Excel import coexist with sequential numbering', async () => {
    // Current Round 1 has questions 1 & 2.
    // Create a manual question in Round 1
    const manualQ1 = await prisma.question.create({
      data: {
        roundId: testRound1Id,
        questionNumber: 3,
        questionText: 'Manual Question 3',
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
    expect(manualQ1.questionNumber).toBe(3);

    // Now import another question via Excel into Round 1
    const importRes = await fetch(`${baseUrl}/api/questions/excel-import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        roundId: testRound1Id,
        questions: [
          {
            questionText: 'Imported Question 4',
            optionA: 'Opt A',
            optionB: 'Opt B',
            optionC: 'Opt C',
            optionD: 'Opt D',
            answer: 'B',
          },
        ],
      }),
    });
    expect(importRes.status).toBe(200);

    // Now create another manual question in Round 1
    const highest = await prisma.question.findFirst({
      where: { roundId: testRound1Id },
      orderBy: { questionNumber: 'desc' },
    });
    expect(highest?.questionNumber).toBe(4);

    const manualQ2 = await prisma.question.create({
      data: {
        roundId: testRound1Id,
        questionNumber: (highest?.questionNumber || 4) + 1,
        questionText: 'Manual Question 5',
        options: {
          create: [
            { optionLetter: 'A', optionText: 'Opt A', isCorrect: false },
            { optionLetter: 'B', optionText: 'Opt B', isCorrect: true },
            { optionLetter: 'C', optionText: 'Opt C', isCorrect: false },
            { optionLetter: 'D', optionText: 'Opt D', isCorrect: false },
          ],
        },
      },
    });

    expect(manualQ2.questionNumber).toBe(5);

    // Confirm all 5 questions in Round 1 have exact sequence 1, 2, 3, 4, 5
    const allR1Questions = await prisma.question.findMany({
      where: { roundId: testRound1Id },
      orderBy: { questionNumber: 'asc' },
    });
    expect(allR1Questions.map((q) => q.questionNumber)).toEqual([1, 2, 3, 4, 5]);
  });
});

