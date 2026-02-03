import express, { Response } from 'express';
import Board from '../models/Board.js';
import List from '../models/List.js';
import User from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(authenticate);

// GET /api/boards - Get all boards for the authenticated user
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const boards = await Board.find({ members: req.userId })
      .populate('members', 'name email')
      .populate('lists')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: boards,
    });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching boards',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /api/boards - Create a new board
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { name, description } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Board name is required',
      });
      return;
    }

    // Create board
    const board = await Board.create({
      name: name.trim(),
      description: description?.trim() || '',
      members: [req.userId],
      lists: [],
    });

    // Create default lists: To Do, In Progress, Done
    const defaultLists = [
      { name: 'To Do', position: 0 },
      { name: 'In Progress', position: 1 },
      { name: 'Done', position: 2 },
    ];

    const createdLists = await Promise.all(
      defaultLists.map((list) =>
        List.create({
          name: list.name,
          boardId: board._id,
          tasks: [],
          position: list.position,
        })
      )
    );

    // Update board with list IDs
    board.lists = createdLists.map((list) => list._id);
    await board.save();

    // Update user's boards array
    await User.findByIdAndUpdate(req.userId, {
      $push: { boards: board._id },
    });

    // Populate and return
    const populatedBoard = await Board.findById(board._id)
      .populate('members', 'name email')
      .populate('lists');

    res.status(201).json({
      success: true,
      message: 'Board created successfully',
      data: populatedBoard,
    });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating board',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /api/boards/:id - Get a specific board with all its data
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { id } = req.params;

    const board = await Board.findById(id)
      .populate('members', 'name email')
      .populate({
        path: 'lists',
        populate: {
          path: 'tasks',
          populate: {
            path: 'assignees',
            select: 'name email',
          },
        },
      });

    if (!board) {
      res.status(404).json({
        success: false,
        message: 'Board not found',
      });
      return;
    }

    // Check if user is a member
    const isMember = board.members.some(
      (member: any) => member._id.toString() === req.userId
    );

    if (!isMember) {
      res.status(403).json({
        success: false,
        message: 'You do not have access to this board',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching board',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
