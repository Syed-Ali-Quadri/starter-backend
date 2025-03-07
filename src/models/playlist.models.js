import mongoose, { Schema } from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const playlistSchema = new Schema({
    name: {
        type: String,
        required: [true, "Please provide name for the playlist."]
    },
    description: {
        type: String,
        default: ''
    },
    videos: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Video'
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

playlistSchema.plugin(mongooseAggregatePaginate);

export const Playlist = mongoose.model('Playlist', playlistSchema);
