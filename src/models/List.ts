import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IList extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  boardId: mongoose.Types.ObjectId;
  tasks: mongoose.Types.ObjectId[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const listSchema = new Schema<IList>(
  {
    name: {
      type: String,
      required: [true, 'List name is required'],
      trim: true,
      minlength: [1, 'List name must be at least 1 character'],
      maxlength: [100, 'List name cannot exceed 100 characters'],
    },
    boardId: {
      type: Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'Board ID is required'],
    },
    tasks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

listSchema.index({ boardId: 1 });
listSchema.index({ boardId: 1, position: 1 });

const List: Model<IList> = mongoose.model<IList>('List', listSchema);

export default List;
