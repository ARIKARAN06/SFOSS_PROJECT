import { server } from './app';
import { ENV } from './config/env';
import { createOrGetRoom } from './services/roomService';

async function bootstrap() {
  try {
    // Initialize or load competition quiz room
    const competitionRoom = await createOrGetRoom(undefined, 'FOSSFURY 26 SFOSS Technical Quiz');
    console.log(`✅ Competition Quiz Room "${competitionRoom.roomCode}" initialized.`);

    server.listen(ENV.PORT, ENV.HOST, () => {
      console.log(`
==================================================
  ⚡ FOSSFURY 26 — LOCAL QUIZ SERVER RUNNING ⚡
==================================================
  - Mode:         OFFLINE LOCAL SERVER
  - URL:          http://${ENV.HOST}:${ENV.PORT}
  - Local LAN IP: http://${ENV.LOCAL_SERVER_IP}:${ENV.PORT}
  - Node Env:     ${ENV.NODE_ENV}
==================================================
      `);
    });
  } catch (err) {
    console.error('💥 Failed to start FOSSFURY 26 Server:', err);
    process.exit(1);
  }
}

bootstrap();
