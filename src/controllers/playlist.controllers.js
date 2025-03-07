import { AsyncHandler } from "../utilities/AsyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { Playlist } from "../models/playlist.models.js";
import mongoose from "mongoose";

const createPlaylist = AsyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const user = req.user;
    
    if([name, description].some(field => field.trim() === "")) throw new ApiError(400, "Please fill all the fields.");

    const createdPlaylist = await Playlist.create({
        name,
        description,
        owner: user._id
    });

    if(!createdPlaylist) throw new ApiError(400, "Something went wrong while creating the playlist.");

    const playlistAggregation = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(createdPlaylist._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                name: 1,
                description: 1,
                "ownerDetails.username":1, 
                "ownerDetails.fullName":1, 
                "ownerDetails.avatar":1, 
            }
        }
    ]);

    if(!playlistAggregation.length) throw new ApiError(400);

    return res
        .status(200)
        .json(new ApiResponse(200, playlistAggregation[0], "Successfully playlist has been created."));
});

const deletePlaylist = AsyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const user = req.user;

    if(!mongoose.Types.ObjectId.isValid(playlistId)) throw new ApiError(400, "Invalid input Id.");
    
    const playlist = await Playlist.findById(playlistId);

    if(playlist.owner.toString() !== req.user.id && req.user.role !== "admin") throw new ApiError(403, "You are not authorized to delete this playlist.");

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Successfully playlist has been deleted."));
});

const updatePlaylist = AsyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { playlistId } = req.params;
    const user = req.user;

    if ([name, description].some(field => field && field.trim() === "")) {
        throw new ApiError(400, "Please fill all the fields.");
    }

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid input Id.");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new ApiError(404, "Playlist not found.");

    if (playlist.owner.toString() !== user._id.toString() && req.user.role !== "admin") {
        throw new ApiError(403, "You are not authorized to update this playlist.");
    }

    const updatedFields = {};
    if (name) updatedFields.name = name;
    if (description) updatedFields.description = description;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, updatedFields, { new: true });

    const playlistAggregation = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(updatedPlaylist._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                name: 1,
                description: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1
            }
        }
    ]);

    if (!playlistAggregation.length) {
        throw new ApiError(400, "Failed to retrieve updated playlist.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlistAggregation[0], "Playlist has been successfully updated."));
});

const getPlaylistById = AsyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(playlistId)) throw new ApiError(400, "Invalid input Id.");

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) throw new ApiError(404, "Playlist not found.");

    const playlistAggregation = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlist._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                name: 1,
                description: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1
            }
        }
    ]);

    if(!playlistAggregation.length) throw new ApiError(400, "Failed to retrieve updated playlist.");

    return res
        .status(200)
        .json(new ApiResponse(200, playlistAggregation[0], "Successfully specific playlist has been fetched."));
});

const getUserPlaylists = AsyncHandler(async (req, res) => {
    const { userId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid input Id.");

    const playlistAggregation = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                name: 1,
                description: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1
            }
        }
    ]);

    if(!playlistAggregation.length) throw new ApiError(400, "Failed to retrieve updated playlist.");
    
    return res
        .status(200)
        .json(new ApiResponse(200, playlistAggregation, "Successfully user playlist has been fetched."));
});

const addVideoToPlaylist = AsyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400, "Invalid input Id.");

    const playlist = await Playlist.findByIdAndUpdate(playlistId, {
        $push: { videos: videoId }
    });

    if(!playlist) throw new ApiError(404, "Playlist not found.");

    const playlistAggregation = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlist._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1
            }
        }
    ]);

    if(!playlistAggregation.length) throw new ApiError(400, "Failed to retrieve updated playlist.");
    
    return res
        .status(200)
        .json(new ApiResponse(200, playlistAggregation[0], "Successfully video is added to the playlist."));
});

const removeVideoFromPlaylist = AsyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400, "Invalid input Id.");
    
    const playlist = await Playlist.findByIdAndUpdate(playlistId, {
        $pull: { videos: videoId }
    });

    if(!playlist) throw new ApiError(404, "Playlist not found.");

    const playlistAggregation = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlist._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1
            }
        }
    ]);

    if(!playlistAggregation.length) throw new ApiError(400, "Failed to retrieve updated playlist.");

    return res
        .status(200)
        .json(new ApiResponse(200, playlistAggregation[0], "Successfully video is removed from the playlist."));
});

export {
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    getPlaylistById,
    getUserPlaylists,
    addVideoToPlaylist,
    removeVideoFromPlaylist
};
