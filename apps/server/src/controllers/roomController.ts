import { Request, Response, NextFunction } from 'express';
import {
  createOrGetRoom,
  updateRoomCode,
  updateRoomStatus,
  configureRound,
  startRound,
  endRound,
  checkAndAutoTransitionRound,
} from '../services/roomService';
import { prisma } from '../db/client';
import { ENV } from '../config/env';
import { RoundStatus } from '@sfoss/shared';

export async function handleGetOrCreateRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomCode, title } = req.body;
    const room = await createOrGetRoom(roomCode, title);
    // Auto-transition any PRE_START rounds
    for (const r of room.rounds) {
      await checkAndAutoTransitionRound(r);
    }
    const refreshed = await prisma.quizRoom.findUnique({
      where: { id: room.id },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });
    return res.json({
      success: true,
      room: refreshed || room,
      serverTime: new Date().toISOString(),
      serverTimestamp: Date.now(),
    });
  } catch (err: any) {
    next(err);
  }
}

export async function handleGetRoomByCode(req: Request, res: Response, next: NextFunction) {
  try {
    const roomCode = req.params.roomCode.toUpperCase();
    const room = await prisma.quizRoom.findUnique({
      where: { roomCode },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    if (room.isTestRoom && !ENV.ENABLE_TEST_ROOM) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    // Auto-transition any PRE_START rounds if time elapsed
    for (const r of room.rounds) {
      await checkAndAutoTransitionRound(r);
    }

    const refreshed = await prisma.quizRoom.findUnique({
      where: { roomCode },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });

    return res.json({
      success: true,
      room: refreshed || room,
      serverTime: new Date().toISOString(),
      serverTimestamp: Date.now(),
    });
  } catch (err: any) {
    next(err);
  }
}

export async function handleGetCurrentRoom(req: Request, res: Response, next: NextFunction) {
  try {
    let room: any = null;

    if (req.user?.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: req.user.teamId },
        include: { room: { include: { rounds: { orderBy: { roundNumber: 'asc' } } } } },
      });
      room = team?.room;
    } else if (req.user?.competitorId) {
      const comp = await prisma.roundCompetitor.findUnique({
        where: { id: req.user.competitorId },
        include: { round: { include: { room: { include: { rounds: { orderBy: { roundNumber: 'asc' } } } } } } },
      });
      room = comp?.round?.room;
    }

    if (!room) {
      room = await prisma.quizRoom.findFirst({
        where: { isTestRoom: false },
        include: { rounds: { orderBy: { roundNumber: 'asc' } } },
      });
    }

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found.' });
    }

    for (const r of room.rounds) {
      await checkAndAutoTransitionRound(r);
    }

    const refreshed = await prisma.quizRoom.findUnique({
      where: { id: room.id },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });

    return res.json({
      success: true,
      room: refreshed || room,
      serverTime: new Date().toISOString(),
      serverTimestamp: Date.now(),
    });
  } catch (err: any) {
    next(err);
  }
}

export async function handleUpdateRoomCode(req: Request, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId || req.body.roomId;
    const roomCode = req.body.roomCode || req.body.newRoomCode;

    const updatedRoom = await updateRoomCode(roomId, roomCode);
    return res.json({
      success: true,
      message: 'Room code updated successfully.',
      roomCode: updatedRoom.roomCode,
      room: updatedRoom,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message || 'Failed to update room code.' });
  }
}

export async function handleUpdateRoomStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const { status } = req.body;
    const room = await updateRoomStatus(roomId, status);
    return res.json({ success: true, room });
  } catch (err: any) {
    next(err);
  }
}

export async function handleConfigureRound(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const { durationMinutes, preStartDurationMinutes, marksPerCorrect, penaltyPerWrong } = req.body;
    const round = await configureRound(roundId, {
      durationMinutes,
      preStartDurationMinutes,
      marksPerCorrect,
      penaltyPerWrong,
    });
    return res.json({ success: true, round });
  } catch (err: any) {
    next(err);
  }
}

export async function handleStartRound(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const { durationMinutes, preStartDurationMinutes } = req.body;
    const round = await startRound(roundId, durationMinutes, preStartDurationMinutes);
    return res.json({
      success: true,
      round,
      serverTime: new Date().toISOString(),
      serverTimestamp: Date.now(),
    });
  } catch (err: any) {
    next(err);
  }
}

export async function handleEndRound(req: Request, res: Response, next: NextFunction) {
  try {
    const { roundId } = req.params;
    const round = await endRound(roundId);
    return res.json({ success: true, round });
  } catch (err: any) {
    next(err);
  }
}

export async function handleGetDevInfo(req: Request, res: Response, next: NextFunction) {
  try {
    return res.json({
      success: true,
      enableTestRoom: ENV.ENABLE_TEST_ROOM,
    });
  } catch (err: any) {
    next(err);
  }
}

export async function handleResetTestRoom(req: Request, res: Response, next: NextFunction) {
  try {
    if (!ENV.ENABLE_TEST_ROOM) {
      return res.status(403).json({ success: false, error: 'Test room is disabled in production.' });
    }

    const testRoom = await prisma.quizRoom.findUnique({
      where: { roomCode: 'TEST26' },
      include: { rounds: { orderBy: { roundNumber: 'asc' } } },
    });

    if (!testRoom) {
      return res.status(404).json({ success: false, error: 'TEST26 room not found. Run database seed.' });
    }

    const roundId = testRoom.rounds[0]?.id;

    await prisma.$transaction(async (tx: any) => {
      if (roundId) {
        // Clear test answers, sessions, scores, anti-cheat
        await tx.answerSubmission.deleteMany({ where: { roundId } });
        await tx.finalResult.deleteMany({ where: { roundId } });
        await tx.participantSession.deleteMany({ where: { roundId } });
      }

      // Reset team claimed statuses
      await tx.team.updateMany({
        data: {
          isClaimed: false,
          sessionToken: null,
        },
      });

      if (roundId) {
        // Reset test round timer & status
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + 5 * 60 * 1000);
        await tx.quizRound.update({
          where: { id: roundId },
          data: {
            status: RoundStatus.ROUND_ACTIVE,
            durationMinutes: 5,
            startTime,
            endTime,
          },
        });
      }
    });

    return res.json({ success: true, message: 'TEST26 room reset successfully. All test data cleared and timer reset to 5m.' });
  } catch (err: any) {
    next(err);
  }
}
