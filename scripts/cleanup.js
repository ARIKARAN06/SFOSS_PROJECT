const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const fury20 = await prisma.quizRoom.findUnique({ where: { roomCode: 'FURY20' } });
  if (!fury20) {
    console.log('FURY20 not found');
    return;
  }
  const allTeams = await prisma.team.findMany({
    orderBy: { teamNumber: 'asc' },
    include: { submissions: true, sessions: true, scores: true, antiCheatLogs: true }
  });
  console.log('Total teams before cleanup:', allTeams.length);
  const byNum = {};
  for (const t of allTeams) {
    if (!byNum[t.teamNumber]) byNum[t.teamNumber] = [];
    byNum[t.teamNumber].push(t);
  }
  for (const [num, list] of Object.entries(byNum)) {
    const keeper = list.find(t => t.submissions.length > 0 || t.sessions.length > 0 || t.scores.length > 0 || t.isClaimed) || list[0];
    const others = list.filter(t => t.id !== keeper.id);
    for (const other of others) {
      for (const s of other.submissions) {
        const existingSub = await prisma.answerSubmission.findUnique({
          where: { teamId_roundId_questionId: { teamId: keeper.id, roundId: s.roundId, questionId: s.questionId } }
        });
        if (!existingSub) {
          await prisma.answerSubmission.update({ where: { id: s.id }, data: { teamId: keeper.id } });
        } else {
          await prisma.answerSubmission.delete({ where: { id: s.id } });
        }
      }
      for (const sess of other.sessions) {
        const existingSess = await prisma.participantSession.findUnique({
          where: { teamId_roundId: { teamId: keeper.id, roundId: sess.roundId } }
        });
        if (!existingSess) {
          await prisma.participantSession.update({ where: { id: sess.id }, data: { teamId: keeper.id } });
        } else {
          await prisma.participantSession.delete({ where: { id: sess.id } });
        }
      }
      for (const sc of other.scores) {
        const existingScore = await prisma.finalResult.findUnique({
          where: { teamId_roundId: { teamId: keeper.id, roundId: sc.roundId } }
        });
        if (!existingScore) {
          await prisma.finalResult.update({ where: { id: sc.id }, data: { teamId: keeper.id } });
        } else {
          await prisma.finalResult.delete({ where: { id: sc.id } });
        }
      }
      for (const ac of other.antiCheatLogs) {
        await prisma.antiCheatLog.update({ where: { id: ac.id }, data: { teamId: keeper.id } });
      }
      await prisma.team.delete({ where: { id: other.id } });
      await prisma.user.delete({ where: { id: other.userId } }).catch(() => {});
    }
    // Update keeper teamName if custom, and assign roomId
    await prisma.team.update({
      where: { id: keeper.id },
      data: {
        teamName: keeper.teamName || `Team ${String(keeper.teamNumber).padStart(2, '0')}`
      }
    });
  }
  console.log('Duplicates merged successfully. Total remaining teams:', await prisma.team.count());
}
clean().catch(console.error).finally(() => prisma.$disconnect());
