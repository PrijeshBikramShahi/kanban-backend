import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  listId: mongoose.Types.ObjectId;
  assignees: mongoose.Types.ObjectId[];
  status: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [1, 'Task title must be at least 1 character'],
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    listId: {
      type: Schema.Types.ObjectId,
      ref: 'List',
      required: [true, 'List ID is required'],
    },
    assignees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Done'],
      default: 'To Do',
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ listId: 1 });
taskSchema.index({ listId: 1, position: 1 });
taskSchema.index({ assignees: 1 });

const Task: Model<ITask> = mongoose.model<ITask>('Task', taskSchema);

export default Task;
