import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile: {
        type: String,
        required: [true, "Please provide a video file"]
    },
    thumbnail: {
        type: String,
        required: [true, "Please provide a thumbnail"]
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, "Please provide an owner"]
    },
    title: {
        type: String,
        required: [true, "Please provide a title"]
    },
    description: {
        type: String,
        required: [true, "Please provide a description"]
    },
    duration: {
        type: Number,
        required: [true, "Please provide a duration"]
    },
    views: {
        type: Number,
        default: 0
    },
    isPublished: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model('Video', videoSchema);