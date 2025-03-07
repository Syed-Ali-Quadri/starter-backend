import mongoose, { Schema } from 'mongoose';

const Schema = new Schema;

const commentSchema = new Schema({
    content: {
        type: String,
        required: [true, "Content is required for a comment."]
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: 'Video',
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

export const Comment = mongoose.model('Comment', commentSchema);
