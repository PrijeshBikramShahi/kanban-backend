import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

interface SocketData {
  userId: string;
}

interface JwtPayload {
  userId: string;
}

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      if (!process.env.JWT_SECRET) {
        return next(new Error('Server configuration error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
      (socket.data as SocketData).userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`✅ User connected: ${socket.id} (User ID: ${(socket.data as SocketData).userId})`);

    // Join a board room
    socket.on('join-board', (boardId: string) => {
      socket.join(`board:${boardId}`);
      console.log(`📌 User ${socket.id} joined board: ${boardId}`);
    });

    // Leave a board room
    socket.on('leave-board', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      console.log(`📤 User ${socket.id} left board: ${boardId}`);
    });

    // Task created
    socket.on('task-created', (data: { boardId: string; task: any }) => {
      socket.to(`board:${data.boardId}`).emit('task-created', data.task);
      console.log(`📝 Task created in board: ${data.boardId}`);
    });

    // Task updated
    socket.on('task-updated', (data: { boardId: string; task: any }) => {
      socket.to(`board:${data.boardId}`).emit('task-updated', data.task);
      console.log(`✏️  Task updated in board: ${data.boardId}`);
    });

    // Task moved (between lists)
    socket.on(
      'task-moved',
      (data: {
        boardId: string;
        taskId: string;
        sourceListId: string;
        targetListId: string;
        task: any;
      }) => {
        socket.to(`board:${data.boardId}`).emit('task-moved', {
          taskId: data.taskId,
          sourceListId: data.sourceListId,
          targetListId: data.targetListId,
          task: data.task,
        });
        console.log(`🔄 Task moved in board: ${data.boardId}`);
      }
    );

    // Task deleted
    socket.on('task-deleted', (data: { boardId: string; taskId: string; listId: string }) => {
      socket.to(`board:${data.boardId}`).emit('task-deleted', {
        taskId: data.taskId,
        listId: data.listId,
      });
      console.log(`🗑️  Task deleted in board: ${data.boardId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  return io;
};
