import express, { Response } from 'express';
import Task from '../models/Task.js';
import List from '../models/List.js';
import Board from '../models/Board.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(authenticate);

// POST /api/tasks - Create a new task
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { title, description, listId, status } = req.body;

    if (!title || title.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'Task title is required',
      });
      return;
    }

    if (!listId) {
      res.status(400).json({
        success: false,
        message: 'List ID is required',
      });
      return;
    }

    // Check if list exists
    const list = await List.findById(listId);
    if (!list) {
      res.status(404).json({
        success: false,
        message: 'List not found',
      });
      return;
    }

    // Check if user has access to the board
    const board = await Board.findById(list.boardId);
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

    // Get the highest position in this list
    const tasksCount = await Task.countDocuments({ listId });

    // Create task
    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || '',
      listId,
      assignees: [],
      status: status || 'To Do',
      position: tasksCount,
    });

    // Add task to list
    await List.findByIdAndUpdate(listId, {
      $push: { tasks: task._id },
    });

    // Populate assignees
    const populatedTask = await Task.findById(task._id).populate(
      'assignees',
      'name email'
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask,
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating task',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// PUT /api/tasks/:id - Update a task
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const { title, description, listId, status, assignees } = req.body;

    // Find the task
    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    // Check if user has access to the board
    const list = await List.findById(task.listId);
    if (!list) {
      res.status(404).json({
        success: false,
        message: 'List not found',
      });
      return;
    }

    const board = await Board.findById(list.boardId);
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

    // If moving to a different list
    if (listId && listId !== task.listId.toString()) {
      const newList = await List.findById(listId);
      if (!newList) {
        res.status(404).json({
          success: false,
          message: 'Target list not found',
        });
        return;
      }

      // Remove from old list
      await List.findByIdAndUpdate(task.listId, {
        $pull: { tasks: task._id },
      });

      // Add to new list
      await List.findByIdAndUpdate(listId, {
        $push: { tasks: task._id },
      });

      task.listId = newList._id;
    }

    // Update task fields
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (status !== undefined) task.status = status;
    if (assignees !== undefined) task.assignees = assignees;

    await task.save();

    // Populate assignees
    const updatedTask = await Task.findById(task._id).populate(
      'assignees',
      'name email'
    );

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating task',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// DELETE /api/tasks/:id - Delete a task
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    const { id } = req.params;

    // Find the task
    const task = await Task.findById(id);
    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found',
      });
      return;
    }

    // Check if user has access to the board
    const list = await List.findById(task.listId);
    if (!list) {
      res.status(404).json({
        success: false,
        message: 'List not found',
      });
      return;
    }

    const board = await Board.findById(list.boardId);
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

    // Remove task from list
    await List.findByIdAndUpdate(task.listId, {
      $pull: { tasks: task._id },
    });

    // Delete task
    await Task.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting task',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
