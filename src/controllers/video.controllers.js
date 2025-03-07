import { AsyncHandler } from "../utilities/AsyncHandler.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { ApiError } from "../utilities/ApiError.js";
import { uploadFileOnCloudniary, deleteFileOnCloudinary } from "../utilities/Cloudinary.js";
import { Video } from "../models/video.models.js";
import mongoose from "mongoose";

// secure routes:
const createVideo = AsyncHandler(async (req, res) => {
    // Collecting data:
    const {title, description, isPublished} = req.body;
    const videoLocalPath = req.files?.video?.[0].path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0].path;

    // Validation:
    if([title, description, isPublished, videoLocalPath, thumbnailLocalPath].some(field => field.trim() === "")) throw new ApiError(400, "Please fill all the required fields.");

    // Upload local files path to the cloudinary:
    const videoFile = await uploadFileOnCloudniary(videoLocalPath, "video");
    const thumbnail = await uploadFileOnCloudniary(thumbnailLocalPath);

    // Debugging stuff: (Just for development purpose)
    // console.log("videoFile url:", videoFile?.url);
    // console.log("videoFile duration:", Math.floor(videoFile?.duration));
    // console.log("thumbnail ", thumbnail?.url);
    
    // Upload all the data to database:
    const createdVideo = await Video.create({
        title,
        description,
        isPublished,
        videoFile: videoFile?.url,
        thumbnail: thumbnail?.url,
        duration: Math.floor(videoFile?.duration),
        owner: req.user._id,
        views: 0
    });

    // Validating:
    if(!createdVideo) throw new ApiError(400, "Something went wrong.");

    // Aggregating the video.
    const createdVideoAggregation = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(createdVideo._id)
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
                title: 1,
                description: 1,
                isPublished: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    // Validating:
    if(!createdVideoAggregation.length) throw new ApiError(500);

    // Returning the response
    return res
        .status(200)
        .json(new ApiResponse(200, createdVideoAggregation[0], "Successfully video has been created."));
});

const deleteVideo = AsyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const videoDetails = await Video.findById(videoId);

    if(videoDetails.owner.toString() !== req.user.id && req.user.role !== "admin") throw new ApiError(403, "You are not authorized to delete this video.");

    await deleteFileOnCloudinary(videoDetails.videoFile);
    await deleteFileOnCloudinary(videoDetails.thumbnail);

    const video = await Video.findByIdAndDelete(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found or already deleted.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Successfully video has been deleted."));
});

const updateVideo = AsyncHandler(async (req, res) => {
    const { title, description, isPublished } = req.body;
    const thumbnailLocalPath = req.file?.path;

    console.log(thumbnailLocalPath);

    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const videoDetails = await Video.findById(videoId);
    if (!videoDetails) {
        throw new ApiError(404, "Video not found.");
    }

    if(videoDetails.owner.toString() !== req.user.id && req.user.role !== "admin") throw new ApiError(403, "You are not authorized to update this video.");

    let isSelected = false;

    if (title) {
        videoDetails.title = title;
        isSelected = true;
    }

    if (description) {
        videoDetails.description = description;
        isSelected = true;
    }

    if (typeof isPublished === "boolean") { // Allow false values
        videoDetails.isPublished = isPublished;
        isSelected = true;
    }

    if (thumbnailLocalPath) {
        if (videoDetails.thumbnail) {
            await deleteFileOnCloudinary(videoDetails.thumbnail);
        }
        const uploadedThumbnail = await uploadFileOnCloudniary(thumbnailLocalPath);
        if (uploadedThumbnail?.url) {
            videoDetails.thumbnail = uploadedThumbnail.url;
            isSelected = true;
        }
    }

    if (isSelected) await videoDetails.save();

    const videoAggregation = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoDetails._id),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            },
        },
        {
            $unwind: "$ownerDetails",
        },
        {
            $project: {
                title: 1,
                description: 1,
                isPublished: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1,
            },
        },
    ]);

    if (!videoAggregation.length) throw new ApiError(500, "Aggregation failed.");

    return res
        .status(200)
        .json(new ApiResponse(200, videoAggregation[0], "Successfully updated the video."));
});

const getVideoById = AsyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400, "Invalid video id.");

    const videoDetails = await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    }, { new: true });

    if(!videoDetails) throw new ApiError(400);

    const videoAggregation = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoDetails._id)
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
                title: 1,
                description: 1,
                isPublished: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    if(!videoAggregation.length) throw new ApiError(400);

    return res
        .status(200)
        .json(new ApiResponse(200, videoAggregation[0], "Successfully video has been fetched by and id."));
});

const getUserVideos = AsyncHandler(async (req, res) => {
    const { userId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid user id.");

    const videoAggregation = await Video.aggregate([
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
        {
            $unwind: "$ownerDetails"
        },
        {
            $project: {
                title: 1,
                description: 1,
                isPublished: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    if(!videoAggregation.length) throw new ApiError(400);

    return res
        .status(200)
        .json(new ApiResponse(200, videoAggregation, "Successfully user videos has been fetched."));
});

const getAllVideos = AsyncHandler(async (req, res) => {
    const videoAggregation = await Video.aggregate([
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
                title: 1,
                description: 1,
                isPublished: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                "ownerDetails.username": 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    if(!videoAggregation.length) throw new ApiError(400);

    return res
        .status(200)
        .json(new ApiResponse(200, videoAggregation, "Successfully all videos has been fetched."));
});

// Only admin access routes:
const deleteVideoAdminOnly = AsyncHandler(async (req, res) => {
    const { videoId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    const video = await Video.findByIdAndDelete(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found.");
    }
    return res
    .status(200)
    .json(new ApiResponse(200, null, "Successfully user videos has been deleted."));
});

export {
    createVideo,
    deleteVideo,
    updateVideo,
    getVideoById,
    getUserVideos,
    getAllVideos,
    deleteVideoAdminOnly
};