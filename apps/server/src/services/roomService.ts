import { prisma } from '../db/client';
import { RoundStatus } from '@sfoss/shared';

export async function createOrGetRoom(roomCode?: string, title: string = 'SFOSS FURY 2.0') {
  if (roomCode) {
    const code = roomCode.toUpperCase();
    const existing = await prisma.quizRoom.findUnique({
      where: { roomCode: code },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });
    if (existing) return existing;
  }

  // Look for existing main non-test room first
  let room = await prisma.quizRoom.findFirst({
    where: { isTestRoom: false },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  });

  if (!room) {
    const initialCode = (roomCode || 'FURY20').toUpperCase();
    room = await prisma.quizRoom.create({
      data: {
        roomCode: initialCode,
        title,
        status: RoundStatus.CREATED,
        rounds: {
          create: [
            {
              roundNumber: 1,
              roundName: 'SYNTRACE',
              durationMinutes: 30,
              marksPerCorrect: 1.0,
              penaltyPerWrong: -1.0,
              status: RoundStatus.CREATED,
            },
            {
              roundNumber: 2,
              roundName: 'DEBUGNOVA',
              durationMinutes: 45,
              marksPerCorrect: 1.0,
              penaltyPerWrong: -1.0,
              status: RoundStatus.CREATED,
            },
          ],
        },
      },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });
  }

  return room;
}

export async function updateRoomCode(roomId: string, newRoomCode: string) {
  const cleanCode = String(newRoomCode || '').trim().toUpperCase();

  if (!cleanCode || !/^[A-Z0-9]{4,12}$/.test(cleanCode)) {
    throw new Error('Room code must be 4 to 12 alphanumeric characters (A-Z, 0-9).');
  }

  const room = await prisma.quizRoom.findFirst({
    where: roomId ? { id: roomId } : { isTestRoom: false },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  });

  if (!room) {
    throw new Error('Room not found.');
  }

  // Active participant safety: Check if round is PRE_START or ROUND_ACTIVE
  const isRoundInProgress =
    room.status === RoundStatus.ROUND_ACTIVE ||
    room.status === RoundStatus.PRE_START ||
    room.rounds.some((r) => r.status === RoundStatus.ROUND_ACTIVE || r.status === RoundStatus.PRE_START);

  if (isRoundInProgress) {
    throw new Error('Room code cannot be changed while a round is in progress.');
  }

  // Check duplicate
  const duplicate = await prisma.quizRoom.findUnique({
    where: { roomCode: cleanCode },
  });

  if (duplicate && duplicate.id !== room.id) {
    throw new Error('Room code is already in use by another room.');
  }

  return prisma.quizRoom.update({
    where: { id: room.id },
    data: { roomCode: cleanCode },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  });
}

export async function updateRoomStatus(roomId: string, status: RoundStatus) {
  return prisma.quizRoom.update({
    where: { id: roomId },
    data: { status },
  });
}

export async function configureRound(
  roundId: string,
  data: {
    durationMinutes?: number;
    preStartDurationMinutes?: number;
    marksPerCorrect?: number;
    penaltyPerWrong?: number;
  }
) {
  const round = await prisma.quizRound.findUnique({ where: { id: roundId } });
  if (!round) throw new Error('Round not found.');

  if (round.status === RoundStatus.ROUND_ACTIVE || round.status === RoundStatus.PRE_START) {
    throw new Error('Round settings are locked once round sequence has started.');
  }

  const preStart = data.preStartDurationMinutes !== undefined
    ? Math.max(0, Math.min(30, Number(data.preStartDurationMinutes)))
    : undefined;

  return prisma.quizRound.update({
    where: { id: roundId },
    data: {
      ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
      ...(preStart !== undefined ? { preStartDurationMinutes: preStart } : {}),
      ...(data.marksPerCorrect !== undefined ? { marksPerCorrect: data.marksPerCorrect } : {}),
      ...(data.penaltyPerWrong !== undefined ? { penaltyPerWrong: data.penaltyPerWrong } : {}),
    },
  });
}

export async function checkAndAutoTransitionRound(round: any) {
  if (
    round.status === RoundStatus.PRE_START &&
    round.scheduledAnswerStartAt &&
    new Date() >= new Date(round.scheduledAnswerStartAt)
  ) {
    const updatedRound = await prisma.quizRound.update({
      where: { id: round.id },
      data: { status: RoundStatus.ROUND_ACTIVE },
    });

    await prisma.quizRoom.update({
      where: { id: round.roomId },
      data: { status: RoundStatus.ROUND_ACTIVE },
    });

    return updatedRound;
  }
  return round;
}

export async function startRound(
  roundId: string,
  durationMinutes?: number,
  preStartDurationMinutes?: number
) {
  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
    include: { room: true },
  });

  if (!round) {
    throw new Error('Round not found.');
  }

  const duration = durationMinutes ?? round.durationMinutes;
  const preStartMinutes = preStartDurationMinutes !== undefined
    ? Math.max(0, Math.min(30, Number(preStartDurationMinutes)))
    : round.preStartDurationMinutes;

  const startTime = new Date();

  if (preStartMinutes > 0) {
    const scheduledAnswerStartAt = new Date(startTime.getTime() + preStartMinutes * 60 * 1000);
    const endTime = new Date(scheduledAnswerStartAt.getTime() + duration * 60 * 1000);

    const updatedRound = await prisma.quizRound.update({
      where: { id: roundId },
      data: {
        durationMinutes: duration,
        preStartDurationMinutes: preStartMinutes,
        startTime,
        scheduledAnswerStartAt,
        endTime,
        status: RoundStatus.PRE_START,
      },
    });

    await prisma.quizRoom.update({
      where: { id: round.roomId },
      data: { status: RoundStatus.PRE_START },
    });

    return updatedRound;
  } else {
    const scheduledAnswerStartAt = startTime;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const updatedRound = await prisma.quizRound.update({
      where: { id: roundId },
      data: {
        durationMinutes: duration,
        preStartDurationMinutes: 0,
        startTime,
        scheduledAnswerStartAt,
        endTime,
        status: RoundStatus.ROUND_ACTIVE,
      },
    });

    await prisma.quizRoom.update({
      where: { id: round.roomId },
      data: { status: RoundStatus.ROUND_ACTIVE },
    });

    return updatedRound;
  }
}

export async function endRound(roundId: string) {
  const round = await prisma.quizRound.findUnique({
    where: { id: roundId },
  });

  if (!round) {
    throw new Error('Round not found.');
  }

  const updatedRound = await prisma.quizRound.update({
    where: { id: roundId },
    data: {
      status: RoundStatus.ROUND_ENDED,
      endTime: new Date(),
    },
  });

  await prisma.quizRoom.update({
    where: { id: round.roomId },
    data: { status: RoundStatus.ROUND_ENDED },
  });

  return updatedRound;
}
