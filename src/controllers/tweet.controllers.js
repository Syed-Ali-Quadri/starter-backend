import { AsyncHandler } from "../utilities/AsyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { Tweet } from "../models/tweet.models.js";
import mongoose from "mongoose";

// Secure routes:
const createTweet = AsyncHandler(async (req, res) => {
    const { content } = req.body;
    const user = req.user;

    if (!content?.trim()) {
        throw new ApiError(400, "Content field is required.");
    }

    const tweet = await Tweet.create({
        content: content,
        owner: user._id
    });

    if (!tweet) {
        throw new ApiError(500, "Failed to create tweet.");
    }

    const tweetAggregate = await Tweet.aggregate([
        { 
            $match: { 
                _id: new mongoose.Types.ObjectId(tweet._id) 
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
                content: 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.username": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    if (!tweetAggregate.length) {
        throw new ApiError(500, "Failed to fetch created tweet.");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, tweetAggregate[0], "Tweet created successfully."));
});

const deleteTweet = AsyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    const tweetDetails = await Tweet.findById(tweetId);

    if(tweetDetails.owner.toString() !== req.user.id && req.user.role !== "admin") throw new ApiError(403, "You are not authorized to delete this tweet.");

    const tweet = await Tweet.findByIdAndDelete(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found or already deleted.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Tweet deleted successfully."));
});

const updateTweet = AsyncHandler(async (req, res) => {
    const { editedContent } = req.body;
    const { tweetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    if (!editedContent?.trim()) {
        throw new ApiError(400, "Content field is required.");
    }

    const tweetDetails = await Tweet.findById(tweetId);

    if(tweetDetails.owner.toString() !== req.user.id && req.user.role !== "admin") throw new ApiError(403, "You are not authorized to update this tweet.");

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { 
            $set: { content: editedContent } 
        },
        { 
            new: true 
        }
    );

    if (!tweet) {
        throw new ApiError(404, "Tweet not found.");
    }

    const tweetAggregate = await Tweet.aggregate([
        { 
            $match: { 
                _id: new mongoose.Types.ObjectId(tweetId) 
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
                content: 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.username": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    if (!tweetAggregate.length) {
        throw new ApiError(500, "Failed to fetch updated tweet.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweetAggregate[0], "Tweet updated successfully."));
});

const getTweetById = AsyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    const tweetAggregate = await Tweet.aggregate([
        { 
            $match: { 
                _id: new mongoose.Types.ObjectId(tweetId) 
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
                content: 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.username": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    if (!tweetAggregate.length) {
        throw new ApiError(404, "Tweet not found.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweetAggregate[0], "Tweet fetched successfully."));
});

const getUserTweets = AsyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid user ID.");
    }

    const tweetAggregate = await Tweet.aggregate([
        { 
            $match: { 
                owner: new mongoose.Types.ObjectId(userId) 
            } 
        },
        { 
            $sort: { 
                createdAt: -1 
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
                content: 1,
                createdAt: 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.username": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, tweetAggregate, "User tweets fetched successfully."));
});

const getAllTweets = AsyncHandler(async (req, res) => {
    const tweets = await Tweet.find({});

    const tweetAggregate = await Tweet.aggregate([
        { 
            $sort: { 
                createdAt: -1 
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
                content: 1,
                createdAt: 1,
                "ownerDetails.fullName": 1,
                "ownerDetails.username": 1,
                "ownerDetails.avatar": 1,
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, tweetAggregate, "All tweets fetched successfully."));
});

// Only admin access routes:
const deleteTweetAdminOnly = AsyncHandler(async (req, res) => {
    const { tweetId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID.");
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found.");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Tweet deleted successfully by admin."));
});

export {
    createTweet,
    deleteTweet,
    updateTweet,
    getTweetById,
    getUserTweets,
    getAllTweets,
    deleteTweetAdminOnly
};
