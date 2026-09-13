import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client';
import { ENV } from '../config/env';
import { Role } from '@sfoss/shared';

export async function loginAdmin(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || (user.role !== Role.SUPERADMIN && user.role !== Role.EVENT_ORGANIZER)) {
    throw new Error('Invalid admin credentials.');
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid admin credentials.');
  }

  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
    },
    ENV.JWT_SECRET,
    { expiresIn: '12h' }
  );

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    token,
  };
}

export async function loginTeam(roomCode: string, teamName: string, passcode: string) {
  const room = await prisma.quizRoom.findUnique({
    where: { roomCode: roomCode.toUpperCase() },
  });

  if (!room) {
    throw new Error(`Quiz room '${roomCode}' not found.`);
  }

  const team = await prisma.team.findFirst({
    where: { teamName },
    include: { user: true },
  });

  if (!team) {
    throw new Error(`Team '${teamName}' not found.`);
  }

  if (team.isDisqualified) {
    throw new Error(`Team '${teamName}' has been disqualified.`);
  }

  if (team.passcode !== passcode) {
    const isValidPasscode = await bcrypt.compare(passcode, team.user.passwordHash);
    if (!isValidPasscode) {
      throw new Error('Invalid team passcode.');
    }
  }

  const token = jwt.sign(
    {
      userId: team.user.id,
      username: team.user.username,
      role: team.user.role,
      teamId: team.id,
      teamName: team.teamName,
    },
    ENV.JWT_SECRET,
    { expiresIn: '12h' }
  );

  return {
    team: {
      id: team.id,
      teamName: team.teamName,
      member1Name: team.member1Name,
      member1RegNo: team.member1RegNo,
      member2Name: team.member2Name,
      member2RegNo: team.member2RegNo,
      isDisqualified: team.isDisqualified,
    },
    room: {
      id: room.id,
      roomCode: room.roomCode,
      title: room.title,
      status: room.status,
    },
    token,
  };
}
