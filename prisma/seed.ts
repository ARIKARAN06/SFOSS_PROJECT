import { PrismaClient, Role, RoundStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();
const enableTestRoom = process.env.ENABLE_TEST_ROOM === 'true';

async function main() {
  console.log('🌱 Starting FOSSFURY 26 database seed...');

  // 1. Seed Admin SuperUser
  const adminPasswordHash = await bcrypt.hash('SfossFury2026Password!', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      role: Role.SUPERADMIN,
    },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: Role.SUPERADMIN,
    },
  });

  console.log(`✅ Admin superuser created: ${adminUser.username} (${adminUser.id})`);

  // 1.5 Ensure FURY20 Quiz Room exists
  let furyRoom = await prisma.quizRoom.findUnique({
    where: { roomCode: 'FURY20' },
    include: { rounds: true },
  });

  if (!furyRoom) {
    furyRoom = await prisma.quizRoom.create({
      data: {
        roomCode: 'FURY20',
        title: 'FOSSFURY 26 SFOSS Technical Quiz',
        maxTeams: 40,
        isTestRoom: false,
        status: RoundStatus.CREATED,
        rounds: {
          create: [
            {
              roundNumber: 1,
              roundName: 'SYNTRACE',
              durationMinutes: 30,
              marksPerCorrect: 2.0,
              penaltyPerWrong: -1.0,
              status: RoundStatus.CREATED,
            },
            {
              roundNumber: 2,
              roundName: 'DEBUGNOVA',
              durationMinutes: 45,
              marksPerCorrect: 2.0,
              penaltyPerWrong: -1.0,
              status: RoundStatus.CREATED,
            },
          ],
        },
      },
      include: { rounds: true },
    });
  }

  // 2. Seed 60 Configurable Team Slots (slots 1-40 active by default) for FURY20
  for (let i = 1; i <= 60; i++) {
    const paddedIndex = String(i).padStart(2, '0');
    const teamUsername = `team_${paddedIndex}`;
    const defaultTeamName = `Team ${paddedIndex}`;
    const userPasswordHash = await bcrypt.hash(`pass_${paddedIndex}`, 10);

    const user = await prisma.user.upsert({
      where: { username: teamUsername },
      update: {
        role: Role.PARTICIPANT_TEAM,
      },
      create: {
        username: teamUsername,
        passwordHash: userPasswordHash,
        role: Role.PARTICIPANT_TEAM,
      },
    });

    await prisma.team.upsert({
      where: { userId: user.id },
      update: {
        roomId: furyRoom.id,
        teamNumber: i,
        isActiveSlot: i <= 40,
      },
      create: {
        roomId: furyRoom.id,
        userId: user.id,
        teamNumber: i,
        teamName: defaultTeamName,
        passcode: '',
        member1Name: '',
        member1RegNo: '',
        member2Name: '',
        member2RegNo: '',
        isClaimed: false,
        isActiveSlot: i <= 40,
      },
    });
  }
  console.log('✅ 60 Pre-created competition team slots seeded successfully for FURY20 (1-40 active).');

  // 3. Seed Hidden Test Room (TEST26) if ENABLE_TEST_ROOM=true
  if (enableTestRoom) {
    console.log('🛠️ ENABLE_TEST_ROOM=true detected. Seeding hidden development test room TEST26...');

    let testRoom = await prisma.quizRoom.findUnique({
      where: { roomCode: 'TEST26' },
      include: { rounds: true },
    });

    if (!testRoom) {
      testRoom = await prisma.quizRoom.create({
        data: {
          roomCode: 'TEST26',
          title: 'FOSSFURY 26 Test Room',
          maxTeams: 10,
          isTestRoom: true,
          status: RoundStatus.ROUND_ACTIVE,
          rounds: {
            create: [
              {
                roundNumber: 1,
                roundName: 'TEST ROUND / SYNTRACE TEST',
                durationMinutes: 5,
                marksPerCorrect: 2.0,
                penaltyPerWrong: -1.0,
                status: RoundStatus.ROUND_ACTIVE,
                startTime: new Date(),
                endTime: new Date(Date.now() + 5 * 60 * 1000),
              },
            ],
          },
        },
        include: { rounds: true },
      });
    }

    const testRound = testRoom.rounds[0];

    // Seed Sample Test Questions for TEST26
    const sampleQuestions = [
      {
        questionNumber: 1,
        questionText: 'What is the output of the following code?',
        codeSnippet: 'int x = 5;\nprintf("%d", x + 2);',
        options: [
          { optionLetter: 'A', optionText: '5', isCorrect: false },
          { optionLetter: 'B', optionText: '6', isCorrect: false },
          { optionLetter: 'C', optionText: '7', isCorrect: true },
          { optionLetter: 'D', optionText: 'Error', isCorrect: false },
        ],
      },
      {
        questionNumber: 2,
        questionText: 'Which keyword is used to define a constant in Java?',
        options: [
          { optionLetter: 'A', optionText: 'const', isCorrect: false },
          { optionLetter: 'B', optionText: 'final', isCorrect: true },
          { optionLetter: 'C', optionText: 'static', isCorrect: false },
          { optionLetter: 'D', optionText: 'define', isCorrect: false },
        ],
      },
      {
        questionNumber: 3,
        questionText: 'Which data structure follows LIFO (Last In First Out)?',
        options: [
          { optionLetter: 'A', optionText: 'Queue', isCorrect: false },
          { optionLetter: 'B', optionText: 'Array', isCorrect: false },
          { optionLetter: 'C', optionText: 'Stack', isCorrect: true },
          { optionLetter: 'D', optionText: 'Tree', isCorrect: false },
        ],
      },
    ];

    for (const sq of sampleQuestions) {
      const existingQ = await prisma.question.findFirst({
        where: { roundId: testRound.id, questionNumber: sq.questionNumber },
      });

      if (!existingQ) {
        await prisma.question.create({
          data: {
            roundId: testRound.id,
            questionNumber: sq.questionNumber,
            questionText: sq.questionText,
            codeSnippet: sq.codeSnippet || null,
            options: {
              create: sq.options.map((opt) => ({
                optionLetter: opt.optionLetter,
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
              })),
            },
          },
        });
      }
    }
    console.log('✅ Hidden TEST26 room and 3 sample test questions seeded successfully.');
  } else {
    console.log('🔒 ENABLE_TEST_ROOM=false. Skipping TEST26 room seeding.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Database seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
