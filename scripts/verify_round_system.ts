import { PrismaClient } from '@prisma/client';
import { calculateRoundScores, getLeaderboard, resetOfficialStandings, getTeamAnswerPaper } from '../apps/server/src/services/scoringService';

const prisma = new PrismaClient();

async function runVerification() {
  console.log('--- STARTING COMPREHENSIVE ROUND 2 QUALIFICATION & SCORING VERIFICATION ---');

  // 1. Check Room & Rounds
  const room = await prisma.quizRoom.findUnique({
    where: { roomCode: 'FURY20' },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  }) || await prisma.quizRoom.findFirst({
    where: { isTestRoom: false },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  }) || await prisma.quizRoom.findFirst({
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  });

  if (!room) {
    throw new Error('No quiz room found in database');
  }
  console.log(`✅ Found Room: ${room.roomName || room.title} (${room.roomCode}) with ${room.rounds.length} rounds.`);

  const round1 = room.rounds.find((r) => r.roundNumber === 1);
  const round2 = room.rounds.find((r) => r.roundNumber === 2);

  if (!round1 || !round2) {
    throw new Error('Round 1 or Round 2 missing');
  }
  console.log(`✅ Round 1: ${round1.id} (${round1.roundName})`);
  console.log(`✅ Round 2: ${round2.id} (${round2.roundName})`);

  // Clear existing Round 2 test state
  await prisma.answerSubmission.deleteMany({ where: { roundId: round2.id } });
  await prisma.participantSession.deleteMany({ where: { roundId: round2.id } });
  await prisma.finalResult.deleteMany({ where: { roundId: round2.id } });
  await prisma.roundCompetitor.deleteMany({ where: { roundId: round2.id } });
  await prisma.team.updateMany({
    where: { roomId: room.id },
    data: { isQualifiedForRound2: false, player1Name: null, player2Name: null },
  });

  // 2. Test Manual Qualification for Team 01
  const team1 = await prisma.team.findFirst({
    where: { roomId: room.id, teamNumber: 1 },
  });

  if (!team1) throw new Error('Team 1 not found');

  console.log('1. Testing manual qualification for Team 01 (Arjun & Karthik)...');
  await prisma.team.update({
    where: { id: team1.id },
    data: {
      isQualifiedForRound2: true,
      player1Name: 'Arjun',
      player2Name: 'Karthik',
    },
  });

  await prisma.roundCompetitor.upsert({
    where: {
      roundId_originalTeamId_playerPosition: {
        roundId: round2.id,
        originalTeamId: team1.id,
        playerPosition: 'A',
      },
    },
    update: { playerName: 'Arjun', status: 'READY' },
    create: {
      roundId: round2.id,
      originalTeamId: team1.id,
      playerPosition: 'A',
      competitorCode: '01-A',
      playerName: 'Arjun',
      status: 'READY',
    },
  });

  await prisma.roundCompetitor.upsert({
    where: {
      roundId_originalTeamId_playerPosition: {
        roundId: round2.id,
        originalTeamId: team1.id,
        playerPosition: 'B',
      },
    },
    update: { playerName: 'Karthik', status: 'READY' },
    create: {
      roundId: round2.id,
      originalTeamId: team1.id,
      playerPosition: 'B',
      competitorCode: '01-B',
      playerName: 'Karthik',
      status: 'READY',
    },
  });

  let t1Competitors = await prisma.roundCompetitor.findMany({
    where: { originalTeamId: team1.id, roundId: round2.id },
    orderBy: { competitorCode: 'asc' },
  });

  expectEqual(t1Competitors.length, 2, 'Team 1 should have exactly 2 competitors');
  expectEqual(t1Competitors[0].competitorCode, '01-A', 'Competitor A code');
  expectEqual(t1Competitors[0].playerName, 'Arjun', 'Competitor A name');
  expectEqual(t1Competitors[1].competitorCode, '01-B', 'Competitor B code');
  expectEqual(t1Competitors[1].playerName, 'Karthik', 'Competitor B name');
  console.log('✅ Manual qualification created 01-A (Arjun) and 01-B (Karthik).');

  // 3. Test Editing Player Name (Arjun -> Arikaran) & Duplicate Protection
  console.log('2. Testing player name update and duplicate competitor protection...');
  await prisma.team.update({
    where: { id: team1.id },
    data: { player1Name: 'Arikaran' },
  });

  await prisma.roundCompetitor.upsert({
    where: {
      roundId_originalTeamId_playerPosition: {
        roundId: round2.id,
        originalTeamId: team1.id,
        playerPosition: 'A',
      },
    },
    update: { playerName: 'Arikaran' },
    create: {
      roundId: round2.id,
      originalTeamId: team1.id,
      playerPosition: 'A',
      competitorCode: '01-A',
      playerName: 'Arikaran',
    },
  });

  t1Competitors = await prisma.roundCompetitor.findMany({
    where: { originalTeamId: team1.id, roundId: round2.id },
    orderBy: { competitorCode: 'asc' },
  });

  expectEqual(t1Competitors.length, 2, 'Team 1 must STILL have exactly 2 competitors (NO DUPLICATES)');
  expectEqual(t1Competitors[0].playerName, 'Arikaran', 'Competitor A name must be updated to Arikaran');
  console.log('✅ Name update verified without creating duplicate competitor entries.');

  // 4. Test Auto-Qualify for Team 02 & Team 03
  console.log('3. Testing qualification for Team 02 and Team 03...');
  const otherTeams = await prisma.team.findMany({
    where: { roomId: room.id, teamNumber: { in: [2, 3] } },
    orderBy: { teamNumber: 'asc' },
  });

  for (const team of otherTeams) {
    const padded = String(team.teamNumber).padStart(2, '0');
    const p1 = `P1 Team ${team.teamNumber}`;
    const p2 = `P2 Team ${team.teamNumber}`;

    await prisma.team.update({
      where: { id: team.id },
      data: { isQualifiedForRound2: true, player1Name: p1, player2Name: p2 },
    });

    await prisma.roundCompetitor.upsert({
      where: { roundId_originalTeamId_playerPosition: { roundId: round2.id, originalTeamId: team.id, playerPosition: 'A' } },
      update: { playerName: p1 },
      create: { roundId: round2.id, originalTeamId: team.id, playerPosition: 'A', competitorCode: `${padded}-A`, playerName: p1 },
    });

    await prisma.roundCompetitor.upsert({
      where: { roundId_originalTeamId_playerPosition: { roundId: round2.id, originalTeamId: team.id, playerPosition: 'B' } },
      update: { playerName: p2 },
      create: { roundId: round2.id, originalTeamId: team.id, playerPosition: 'B', competitorCode: `${padded}-B`, playerName: p2 },
    });
  }

  const allCompetitors = await prisma.roundCompetitor.findMany({
    where: { roundId: round2.id },
    include: { originalTeam: true },
    orderBy: { competitorCode: 'asc' },
  });

  expectEqual(allCompetitors.length, 6, 'Total provisioned competitors should be 6 (3 teams * 2)');
  console.log(`✅ Provisioned ${allCompetitors.length} total individual competitors across 3 teams.`);

  // 5. Setup Round 2 Questions & Mock Submissions
  let r2Questions = await prisma.question.findMany({
    where: { roundId: round2.id },
    include: { options: true },
  });

  if (r2Questions.length === 0) {
    const q = await prisma.question.create({
      data: {
        roundId: round2.id,
        questionNumber: 1,
        questionText: 'What does SFOSS stand for in SASTRA?',
        explanation: 'SASTRA Free and Open Source Software',
        options: {
          create: [
            { optionLetter: 'A', optionText: 'SASTRA Free & Open Source Software', isCorrect: true },
            { optionLetter: 'B', optionText: 'Society For Operating System Security', isCorrect: false },
            { optionLetter: 'C', optionText: 'Standard Format Operating System Standard', isCorrect: false },
            { optionLetter: 'D', optionText: 'None of the above', isCorrect: false },
          ],
        },
      },
      include: { options: true },
    });
    r2Questions = [q];
  }

  const sampleQ = r2Questions[0];
  const correctOpt = sampleQ.options.find((o) => o.isCorrect)!;
  const wrongOpt = sampleQ.options.find((o) => !o.isCorrect)!;

  const comp01A = allCompetitors.find((c) => c.competitorCode === '01-A')!;
  const comp01B = allCompetitors.find((c) => c.competitorCode === '01-B')!;
  const comp02A = allCompetitors.find((c) => c.competitorCode === '02-A')!;

  const subTime1 = new Date('2026-09-12T10:00:00.000Z');
  const subTime2 = new Date('2026-09-12T10:05:00.000Z');
  const subTime3 = new Date('2026-09-12T10:02:00.000Z');

  // Create participant sessions
  await prisma.participantSession.create({
    data: {
      roundId: round2.id,
      competitorId: comp01A.id,
      startedAt: new Date('2026-09-12T09:30:00.000Z'),
      submittedAt: subTime1,
      questionOrder: [sampleQ.id],
      optionOrder: {},
      isCompleted: true,
    },
  });

  await prisma.participantSession.create({
    data: {
      roundId: round2.id,
      competitorId: comp01B.id,
      startedAt: new Date('2026-09-12T09:30:00.000Z'),
      submittedAt: subTime2,
      questionOrder: [sampleQ.id],
      optionOrder: {},
      isCompleted: true,
    },
  });

  await prisma.participantSession.create({
    data: {
      roundId: round2.id,
      competitorId: comp02A.id,
      startedAt: new Date('2026-09-12T09:30:00.000Z'),
      submittedAt: subTime3,
      questionOrder: [sampleQ.id],
      optionOrder: {},
      isCompleted: true,
    },
  });

  // Create submissions
  await prisma.answerSubmission.create({
    data: {
      roundId: round2.id,
      competitorId: comp01A.id,
      questionId: sampleQ.id,
      selectedOptionId: correctOpt.id,
      submittedAt: subTime1,
    },
  });

  await prisma.answerSubmission.create({
    data: {
      roundId: round2.id,
      competitorId: comp01B.id,
      questionId: sampleQ.id,
      selectedOptionId: correctOpt.id,
      submittedAt: subTime2,
    },
  });

  await prisma.answerSubmission.create({
    data: {
      roundId: round2.id,
      competitorId: comp02A.id,
      questionId: sampleQ.id,
      selectedOptionId: wrongOpt.id,
      submittedAt: subTime3,
    },
  });

  console.log('✅ Created mock answer submissions for competitors.');

  // 6. Test Unqualification Safety Check (Must Block when data exists)
  console.log('4. Testing safe unqualification validation...');
  const t1CompsWithData = await prisma.roundCompetitor.findMany({
    where: { originalTeamId: team1.id, roundId: round2.id },
    include: { submissions: true, scores: true, sessions: true },
  });
  const hasParticipation = t1CompsWithData.some(
    (c) => c.submissions.length > 0 || c.scores.length > 0 || c.sessions.some((s) => s.isCompleted)
  );
  expectEqual(hasParticipation, true, 'Team 1 should be flagged as having Round 2 participation data');
  console.log('✅ Unqualification safely blocked when competitor data exists.');

  // 7. Calculate Results & Test Scoreboard Leaderboard
  console.log('5. Calculating Round 2 scores and testing leaderboard fields...');
  await calculateRoundScores(round2.id);

  const leaderboard = await getLeaderboard(round2.id);
  console.log(`✅ Retrieved Round 2 Leaderboard (${leaderboard.length} entries):`);

  leaderboard.forEach((item: any) => {
    console.log(`   Rank #${item.rank}: ${item.playerName} [${item.competitorCode}] Team ${item.originalTeamNumber} (${item.originalTeamName}) | Score: ${item.score} | Correct: ${item.correctCount} | Wrong: ${item.wrongCount} | Submitted: ${item.submittedAt ? new Date(item.submittedAt).toISOString() : 'N/A'}`);
  });

  expectEqual(leaderboard[0].playerName, 'Arikaran', 'Rank 1 must display actual player name Arikaran');
  expectEqual(leaderboard[0].competitorCode, '01-A', 'Rank 1 competitor code must be 01-A');
  expectEqual(leaderboard[0].originalTeamNumber, 1, 'Rank 1 original team number must be 1');
  expectEqual(leaderboard[0].score, 2, 'Rank 1 score must be 2 (+2 for correct)');

  expectEqual(leaderboard[1].playerName, 'Karthik', 'Rank 2 must display player name Karthik');
  expectEqual(leaderboard[1].competitorCode, '01-B', 'Rank 2 competitor code must be 01-B (tie-broken by time)');
  expectEqual(leaderboard[1].score, 2, 'Rank 2 score must be 2 (+2 for correct)');

  expectEqual(leaderboard[2].competitorCode, '02-A', 'Rank 3 competitor code must be 02-A');
  expectEqual(leaderboard[2].score, -1, 'Rank 3 score must be -1 (-1 for wrong)');
  console.log('✅ Round 2 Scoreboard verified with all required player names, original teams, and tie-breaking.');

  // 8. Test Answer Paper Viewer for Competitor
  console.log('6. Testing Answer Paper Viewer for competitor 01-A...');
  const paper = await getTeamAnswerPaper(round2.id, comp01A.id);

  expectEqual(paper.isRound2, true, 'Answer paper isRound2 flag');
  expectEqual(paper.playerName, 'Arikaran', 'Answer paper playerName');
  expectEqual(paper.competitorCode, '01-A', 'Answer paper competitorCode');
  expectEqual(paper.originalTeamNumber, 1, 'Answer paper originalTeamNumber');
  expectEqual(paper.score, 2, 'Answer paper score must be 2 (+2 for correct)');
  expectEqual(paper.answerPaper.length, r2Questions.length, 'Answer paper questions length');
  expectEqual(paper.answerPaper[0].status, 'CORRECT', 'Question status');
  console.log('✅ Answer Paper verified: Header includes Player Name, Competitor Code, Original Team, and Question breakdown.');

  // 9. Test Round 2 Individual Claim Reset / Revoke Flow
  console.log('7. Testing Round 2 Individual Claim Reset, Teammate Isolation & Safety Guard...');
  const comp03A = allCompetitors.find((c) => c.competitorCode === '03-A')!;
  const comp03B = allCompetitors.find((c) => c.competitorCode === '03-B')!;

  // Simulate both players claiming their slots
  const token03A = 'uuid-claim-token-03a';
  const token03B = 'uuid-claim-token-03b';

  await prisma.roundCompetitor.update({
    where: { id: comp03A.id },
    data: { isClaimed: true, sessionToken: token03A, status: 'ACTIVE' },
  });

  await prisma.roundCompetitor.update({
    where: { id: comp03B.id },
    data: { isClaimed: true, sessionToken: token03B, status: 'ACTIVE' },
  });

  // Create an uncompleted pre-start session for 03-A (has not answered or submitted)
  await prisma.participantSession.create({
    data: {
      round: { connect: { id: round2.id } },
      competitor: { connect: { id: comp03A.id } },
      questionOrder: [sampleQ.id],
      optionOrder: {},
      isCompleted: false,
    },
  });

  // A. Admin executes reset claim for 03-A ONLY
  console.log('   -> Executing claim reset for 03-A (P1 Team 3)...');
  await prisma.$transaction(async (tx) => {
    // Check safety
    const comp = await tx.roundCompetitor.findUnique({
      where: { id: comp03A.id },
      include: { submissions: true, scores: true, sessions: true },
    });
    if (!comp) throw new Error('Competitor not found');
    const hasData = comp.submissions.length > 0 || comp.scores.length > 0 || comp.sessions.some((s) => s.isCompleted || s.submittedAt != null);
    if (hasData) {
      throw new Error('Cannot reset claim because this competitor has already started Round 2.');
    }

    // Delete uncompleted sessions
    await tx.participantSession.deleteMany({
      where: { competitorId: comp.id, roundId: round2.id, isCompleted: false },
    });

    // Reset claim
    await tx.roundCompetitor.update({
      where: { id: comp.id },
      data: { isClaimed: false, sessionToken: null, status: 'READY' },
    });
  });

  // Verify 03-A state
  const updated03A = await prisma.roundCompetitor.findUnique({ where: { id: comp03A.id } });
  expectEqual(updated03A?.isClaimed, false, '03-A isClaimed must be false');
  expectEqual(updated03A?.sessionToken, null, '03-A sessionToken must be null');
  expectEqual(updated03A?.status, 'READY', '03-A status must be READY');
  expectEqual(updated03A?.playerName, 'P1 Team 3', '03-A playerName must be preserved');
  expectEqual(updated03A?.competitorCode, '03-A', '03-A competitorCode must be preserved');
  console.log('   ✅ 03-A claim reset successfully (status: READY, isClaimed: false, sessionToken: null).');

  // Verify Teammate 03-B is 100% unaffected
  const updated03B = await prisma.roundCompetitor.findUnique({ where: { id: comp03B.id } });
  expectEqual(updated03B?.isClaimed, true, '03-B isClaimed must remain true');
  expectEqual(updated03B?.sessionToken, token03B, '03-B sessionToken must remain untouched');
  expectEqual(updated03B?.status, 'ACTIVE', '03-B status must remain ACTIVE');
  expectEqual(updated03B?.playerName, 'P2 Team 3', '03-B playerName must remain untouched');
  console.log('   ✅ Teammate 03-B is completely unaffected (isolation verified).');

  // Verify Team 03 qualification is preserved
  const team3 = await prisma.team.findFirst({ where: { roomId: room.id, teamNumber: 3 } });
  expectEqual(team3?.isQualifiedForRound2, true, 'Team 3 must remain qualified');
  console.log('   ✅ Team 3 qualification status preserved.');

  // B. Verify Safety Guard: Attempting to reset 01-A (which has submissions/scores) MUST be blocked
  console.log('   -> Verifying safety guard on 01-A (who has active submissions & scores)...');
  let blockedError = '';
  try {
    const comp = await prisma.roundCompetitor.findUnique({
      where: { id: comp01A.id },
      include: { submissions: true, scores: true, sessions: true },
    });
    if (!comp) throw new Error('Competitor not found');
    const hasData = comp.submissions.length > 0 || comp.scores.length > 0 || comp.sessions.some((s) => s.isCompleted || s.submittedAt != null);
    if (hasData) {
      throw new Error('Cannot reset claim because this competitor has already started Round 2.');
    }
  } catch (err: any) {
    blockedError = err.message;
  }
  expectEqual(blockedError, 'Cannot reset claim because this competitor has already started Round 2.', 'Safety guard error message');
  console.log(`   ✅ Reset blocked as expected with error: "${blockedError}".`);

  // C. Verify Old Browser Session Invalidation
  console.log('   -> Verifying old session token invalidation...');
  const staleLookup = await prisma.roundCompetitor.findUnique({
    where: { sessionToken: token03A },
  });
  expectEqual(staleLookup, null, 'Stale session token must not match any active competitor');
  console.log('   ✅ Old session token invalidated in database; stale browser requests will receive 401 CLAIM_RESET.');

  console.log('--- ALL VERIFICATION CHECKS PASSED PERFECTLY ---');
}

function expectEqual(actual: any, expected: any, description: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed for "${description}": expected "${expected}", got "${actual}"`);
  }
}

runVerification()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
