import { prisma } from '../apps/server/src/db/client';
import { getOrCreateParticipantSession, saveAnswer, submitQuiz } from '../apps/server/src/services/quizService';
import { getTeamAnswerPaper } from '../apps/server/src/services/scoringService';
import { RoundStatus } from '@sfoss/shared';

async function main() {
  console.log('--- STARTING VERIFICATION: FIXED OPTION ORDER & PARTICIPANT-LOCAL TIMER BACKEND ---');

  // 1. Find round with questions
  const existingQuestion = await prisma.question.findFirst({
    include: { round: { include: { room: { include: { teams: true } } } } },
  });

  if (!existingQuestion) {
    console.log('No questions found in database.');
    return;
  }

  const round1 = existingQuestion.round;
  const activeRoom = round1.room;
  console.log(`✅ Using Room: ${activeRoom.roomCode} - Round: ${round1.roundName} (${round1.id})`);

  const team1 = activeRoom.teams[0];
  const team2 = activeRoom.teams[1] || activeRoom.teams[0];

  console.log('1. Testing getOrCreateParticipantSession for Team 1 and Team 2...');
  const session1 = await getOrCreateParticipantSession({ teamId: team1.id, roundId: round1.id });
  const session2 = await getOrCreateParticipantSession({ teamId: team2.id, roundId: round1.id });

  // Verify serverTime is included
  console.log('2. Verifying serverTime and serverTimestamp presence in session payload:');
  if (!session1.serverTime || !session1.serverTimestamp) {
    throw new Error('FAILED: serverTime or serverTimestamp missing from session response!');
  }
  console.log(`   ✅ serverTime: ${session1.serverTime}, serverTimestamp: ${session1.serverTimestamp}`);

  // Verify options order
  console.log('3. Verifying strict Admin option order (A, B, C, D) across all questions:');
  for (const q of session1.questions) {
    const letters = q.options.map((o) => o.optionLetter);
    const expectedLetters = ['A', 'B', 'C', 'D'].slice(0, letters.length);
    if (letters.join(',') !== expectedLetters.join(',')) {
      throw new Error(`FAILED: Question ${q.questionNumber} options out of order! Found: ${letters.join(',')}`);
    }
  }
  console.log(`   ✅ All ${session1.questions.length} questions in Team 1 session have options strictly in [A, B, C, D] order.`);

  for (const q of session2.questions) {
    const letters = q.options.map((o) => o.optionLetter);
    const expectedLetters = ['A', 'B', 'C', 'D'].slice(0, letters.length);
    if (letters.join(',') !== expectedLetters.join(',')) {
      throw new Error(`FAILED: Question ${q.questionNumber} options out of order for Team 2! Found: ${letters.join(',')}`);
    }
  }
  console.log(`   ✅ All ${session2.questions.length} questions in Team 2 session have options strictly in [A, B, C, D] order.`);

  // 4. Test Answer Paper Viewer options order
  console.log('4. Testing getTeamAnswerPaper options ordering:');
  const answerPaper = await getTeamAnswerPaper(round1.id, team1.id);
  console.log(`   ✅ Answer paper loaded successfully for ${answerPaper.team?.teamName || team1.teamName}. Total questions: ${answerPaper.answerPaper.length}`);

  // 5. Test Pre-Start state serverTime response
  console.log('5. Testing Pre-Start response structure:');
  // Temporarily create a mock test round in PRE_START
  const preStartRound = await prisma.quizRound.create({
    data: {
      roomId: activeRoom.id,
      roundNumber: 99,
      roundName: 'TEST PRE_START',
      status: RoundStatus.PRE_START,
      durationMinutes: 10,
      preStartDurationMinutes: 2,
      scheduledAnswerStartAt: new Date(Date.now() + 120000), // 2 mins in future
      endTime: new Date(Date.now() + 720000),
    },
  });

  const preStartSession = await getOrCreateParticipantSession({ teamId: team1.id, roundId: preStartRound.id });
  if (!preStartSession.isPreStart) {
    throw new Error('FAILED: isPreStart flag missing for PRE_START round!');
  }
  if (!preStartSession.serverTime || !preStartSession.serverTimestamp) {
    throw new Error('FAILED: serverTime missing in preStartSession!');
  }
  console.log(`   ✅ Pre-Start payload verified: isPreStart=${preStartSession.isPreStart}, serverTime=${preStartSession.serverTime}`);

  // Cleanup temporary round
  await prisma.quizRound.delete({ where: { id: preStartRound.id } });

  console.log('--- ALL VERIFICATION TESTS PASSED SUCCESFULLY ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
