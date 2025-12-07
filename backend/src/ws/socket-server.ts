/**
 * WebSocket server for multiplayer features
 */
import { Server as SocketServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';

const JWT_SECRET = process.env.JWT_SECRET || 'plottwist-secret-key-change-in-production';

interface Room {
  code: string;
  players: Map<string, PlayerInfo>;
  status: 'waiting' | 'playing' | 'finished';
  currentRound: number;
  maxRounds: number;
}

interface PlayerInfo {
  socketId: string;
  name: string;
  score: number;
}

const rooms = new Map<string, Room>();

export function initializeWebSocketServer(httpServer: HTTPServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      socket.data.playerName = decoded.playerName;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.data.playerName} (${socket.id})`);

    // Create room
    socket.on('create_room', async (data: { maxRounds?: number }) => {
      const code = generateRoomCode();
      const playerName = socket.data.playerName;

      const room: Room = {
        code,
        players: new Map([[playerName, {
          socketId: socket.id,
          name: playerName,
          score: 0
        }]]),
        status: 'waiting',
        currentRound: 0,
        maxRounds: data.maxRounds || 3
      };

      rooms.set(code, room);
      socket.join(code);

      // Persist to DB
      try {
        await db.query(
          'INSERT INTO rooms (code, creator_name, max_players) VALUES ($1, $2, $3)',
          [code, playerName, 2]
        );
      } catch (error) {
        console.error('Error creating room in DB:', error);
      }

      socket.emit('room_created', { code, room: sanitizeRoom(room) });
      console.log(`Room created: ${code} by ${playerName}`);
    });

    // Join room
    socket.on('join_room', async (data: { code: string }) => {
      const { code } = data;
      const room = rooms.get(code);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Room already started' });
        return;
      }

      if (room.players.size >= 2) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      const playerName = socket.data.playerName;

      room.players.set(playerName, {
        socketId: socket.id,
        name: playerName,
        score: 0
      });

      socket.join(code);
      io.to(code).emit('player_joined', {
        playerName,
        room: sanitizeRoom(room)
      });

      console.log(`${playerName} joined room ${code}`);
    });

    // Start round
    socket.on('start_round', async (data: { code: string }) => {
      const room = rooms.get(data.code);
      if (!room) return;

      if (room.players.size < 2) {
        socket.emit('error', { message: 'Need 2 players to start' });
        return;
      }

      room.status = 'playing';
      room.currentRound++;

      io.to(data.code).emit('round_started', {
        round: room.currentRound,
        maxRounds: room.maxRounds
      });

      console.log(`Round ${room.currentRound} started in room ${data.code}`);
    });

    // Submit guess
    socket.on('submit_guess', async (data: {
      code: string;
      guess: string;
      setup: string;
      twist: string;
    }) => {
      const room = rooms.get(data.code);
      if (!room) return;

      const playerName = socket.data.playerName;

      // Broadcast guess submitted (without revealing content)
      io.to(data.code).emit('guess_submitted', {
        playerName,
        round: room.currentRound
      });

      console.log(`${playerName} submitted guess in room ${data.code}`);

      // Store in DB for scoring
      try {
        await db.query(
          `INSERT INTO match_rounds (match_id, round_number, player_name, setup, twist, opponent_guess)
           VALUES ((SELECT id FROM matches WHERE room_id = (SELECT id FROM rooms WHERE code = $1) LIMIT 1), $2, $3, $4, $5, $6)`,
          [data.code, room.currentRound, playerName, data.setup, data.twist, data.guess]
        );
      } catch (error) {
        console.error('Error storing round data:', error);
      }
    });

    // Round result
    socket.on('round_result', async (data: {
      code: string;
      playerName: string;
      score: number;
    }) => {
      const room = rooms.get(data.code);
      if (!room) return;

      const player = room.players.get(data.playerName);
      if (player) {
        player.score += data.score;
      }

      io.to(data.code).emit('score_updated', {
        playerName: data.playerName,
        score: data.score,
        totalScore: player?.score || 0
      });

      // Check if round is complete
      const allSubmitted = Array.from(room.players.values()).every(p => true);  // Simplified

      if (room.currentRound >= room.maxRounds) {
        room.status = 'finished';

        const scores = Array.from(room.players.entries()).map(([name, info]) => ({
          name,
          score: info.score
        }));

        scores.sort((a, b) => b.score - a.score);

        io.to(data.code).emit('match_finished', {
          winner: scores[0],
          scores
        });

        console.log(`Match finished in room ${data.code}`);

        // Clean up room after 5 minutes
        setTimeout(() => {
          rooms.delete(data.code);
        }, 5 * 60 * 1000);
      }
    });

    // Leave room
    socket.on('leave_room', (data: { code: string }) => {
      const room = rooms.get(data.code);
      if (!room) return;

      const playerName = socket.data.playerName;
      room.players.delete(playerName);

      socket.leave(data.code);

      io.to(data.code).emit('player_left', {
        playerName,
        room: sanitizeRoom(room)
      });

      // Delete room if empty
      if (room.players.size === 0) {
        rooms.delete(data.code);
      }

      console.log(`${playerName} left room ${data.code}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.data.playerName}`);

      // Remove from all rooms
      rooms.forEach((room, code) => {
        const playerName = socket.data.playerName;
        if (room.players.has(playerName)) {
          room.players.delete(playerName);
          io.to(code).emit('player_left', { playerName });

          if (room.players.size === 0) {
            rooms.delete(code);
          }
        }
      });
    });
  });

  console.log('WebSocket server initialized');
  return io;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function sanitizeRoom(room: Room) {
  return {
    code: room.code,
    players: Array.from(room.players.values()).map(p => ({
      name: p.name,
      score: p.score
    })),
    status: room.status,
    currentRound: room.currentRound,
    maxRounds: room.maxRounds
  };
}

// Token generation helper
export function generatePlayerToken(playerName: string): string {
  return jwt.sign({ playerName }, JWT_SECRET, { expiresIn: '24h' });
}
