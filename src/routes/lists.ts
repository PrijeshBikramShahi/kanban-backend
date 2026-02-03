import express, { Response } from 'express';
import List from '../models/List.js';
import Board from '../models/Board.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(authenticate);

// POST /api/lists - Create a new list
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { name, boardId } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'List name is required',
      });
      return;
    }

    if (!boardId) {
      res.status(400).json({
        success: false,
        message: 'Board ID is required',
      });
      return;
    }

    // Check if board exists and user is a member
    const board = await Board.findById(boardId);
    if (!board) {
      res.status(404).json({
        success: false,
        message: 'Board not found',
      });
      return;
    }

    const isMember = board.members.some(
      (member) => member.toString() === req.userId
    );

    if (!isMember) {
      res.status(403).json({
        success: false,
        message: 'You do not have access to this board',
      });
      return;
    }

    // Get the highest position
    const listsCount = await List.countDocuments({ boardId });

    // Create list
    const list = await List.create({
      name: name.trim(),
      boardId,
      tasks: [],
      position: listsCount,
    });

    // Add list to board
    await Board.findByIdAndUpdate(boardId, {
      $push: { lists: list._id },
    });

    res.status(201).json({
      success: true,
      message: 'List created successfully',
      data: list,
    });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating list',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
