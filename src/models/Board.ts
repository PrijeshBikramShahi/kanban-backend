import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBoard extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  members: mongoose.Types.ObjectId[];
  lists: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const boardSchema = new Schema<IBoard>(
  {
    name: {
      type: String,
      required: [true, 'Board name is required'],
      trim: true,
      minlength: [1, 'Board name must be at least 1 character'],
      maxlength: [100, 'Board name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lists: [
      {
        type: Schema.Types.ObjectId,
        ref: 'List',
      },
    ],
  },
  {
    timestamps: true,
  }
);

boardSchema.index({ members: 1 });
boardSchema.index({ createdAt: -1 });

const Board: Model<IBoard> = mongoose.model<IBoard>('Board', boardSchema);

export default Board;
