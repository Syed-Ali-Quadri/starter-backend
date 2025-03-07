import { AsyncHandler } from "../utilities/AsyncHandler.js";
import { ApiResponse } from "../utilities/ApiResponse.js";
import { ApiError } from "../utilities/ApiError.js";
import { User } from "../models/user.models.js";
import { deleteFileOnCloudinary, uploadFileOnCloudniary } from "../utilities/Cloudinary.js";
import validator from 'validator';
import fs from "fs";
import jwt from "jsonwebtoken";

// Additional functions:
const getAccessAndRefreshToken = async (userInfo) => {
    const user = await User.findById(userInfo._id);

    const refreshToken = await user.getRefreshToken();
    const accessToken = await user.getAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { refreshToken, accessToken };
}

// Unsecure routes:
const registerUser = AsyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    const avatarLocalPath = req.files?.avatar?.[0]?.path || "";
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || "";

    if (!fullName || !email || !username || !password) {
        throw new ApiError(401, "Please fill the required inputs.");
    }

    if (!validator.isEmail(email)) {
        throw new ApiError(400, "Invalid email.");
    }

    const findUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (findUser) {
        throw new ApiError(400, "User already exists.");
    }

    let [avatar, coverImage] = await Promise.all([
        avatarLocalPath ? uploadFileOnCloudniary(avatarLocalPath) : Promise.resolve(null),
        coverImageLocalPath ? uploadFileOnCloudniary(coverImageLocalPath) : Promise.resolve(null)
    ]);

    try {
        const user = await User.create({
            username: username.toLowerCase(),
            fullName,
            email,
            password,
            avatar: avatar?.url || "",
            coverImage: coverImage?.url || ""
        });

        const createUser = await User.findById(user._id).select("-password");

        if (!createUser) {
            throw new ApiError(500, "Something went wrong while registering the user.");
        }

        return res.status(201).json(new ApiResponse(201, createUser, "User created successfully."));
    } catch (error) {
        if(avatarLocalPath) {
            fs.unlinkSync(avatarLocalPath);
        }
        if(coverImageLocalPath) {
            fs.unlinkSync(coverImageLocalPath);
        }
        if (avatar) {
            deleteFileOnCloudinary(avatar.url).catch(err => console.error("Failed to delete avatar:", err));
        }
        if (coverImage) {
            deleteFileOnCloudinary(coverImage.url).catch(err => console.error("Failed to delete cover image:", err));
        }
        throw new ApiError(500, "Something went wrong while registering the user and files are deleted from the cloud.");
    }
});

const loginUser = AsyncHandler(async (req, res) => {
    const { username, password } = req.body

    if ([username, password].some((field) => field.trim() === "")) throw new ApiError(404, "Please fill the required inputs.")

    const existUser = await User.findOne({username});

    if(!existUser) throw new ApiError(400, "User does not exist.");

    const checkPassword = await existUser.isPasswordCorrect(password);

    if(!checkPassword) throw new ApiError(400, "Password is incorrect.");

    const { refreshToken, accessToken } = await getAccessAndRefreshToken(existUser);

    const user = await User.findById(existUser._id).select("-password -refreshToken");

    const options = {
        httpOnly: true, // Prevents access from JavaScript
        secure: true, // Only transmit over HTTPS
        sameSite: "strict", // Protects against CSRF attacks
    }

    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(new ApiResponse(200, { user: user, accessToken, refreshToken }, "Successfully user has logged in."));
});

// Secure routes:
const getUser = AsyncHandler(async (req, res) => {
    const userInfo = req.user;
    if(!userInfo) throw new ApiError(404, "Invalid user.");

    const user = await User.findById(userInfo).select("-password -refreshToken");
    if(!user) throw new ApiError(401, "User not found.");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Fetch user successfully."));
});

const logoutUser = AsyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    }, { new: true })

    const options = {
        httpOnly: true, // Only accessible by the server
        secure: true, // Ensures the cookie is sent over HTTPS
        sameSite: "strict" // Protects against CSRF attacks
    };

    res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logout successfully."))

});

const getRefreshToken = AsyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken;

    if(!incomingRefreshToken) throw new ApiError(401, "Unauthorized access.");

    try {
        const decodeRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodeRefreshToken._id).select("-password");

        if(!user) throw new ApiError(401, "User not found.");

        if(incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh token is expired or used.");

        const { accessToken, refreshToken: newRefreshToken } = await getAccessAndRefreshToken(user);

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: true
        }

        return res
            .status(200)
            .cookie("refreshToken", newRefreshToken, options)
            .cookie("AccessToken", accessToken, options)
            .json(new ApiResponse(200, {accessToken, newRefreshToken}, "Successfully refresh token and access token generated."));
    } catch (error) {
        throw new ApiError(401, "Invalid refresh token.")
    }
});

const changeUserDetails = AsyncHandler(async (req, res) => {
    const { updatedFullName, updatedEmail } = req.body;

    if (!updatedEmail && !updatedFullName) throw new ApiError(401, "Input at least one field.");
    
    const userInfo = req.user;
    const user = await User.findById(userInfo._id).select("-password -refreshToken");

    let isUpdate = false;

    if (updatedEmail) {
        if (!validator.isEmail(updatedEmail) || updatedEmail === user.email) {
            throw new ApiError(400, "Invalid email.");
        }
        user.email = updatedEmail;
        isUpdate = true;
    }

    if (updatedFullName) {
        if (updatedFullName === user.fullName) {
            throw new ApiError(400, "Invalid username.");
        }
        user.fullName = updatedFullName;
        isUpdate = true;
    }

    if (isUpdate) {
        await user.save();
    }

    return res.status(200).json(new ApiResponse(200, user, "Successfully updated the user info."));
});

const changeUserPassword = AsyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const loggedInUser = req.user;

    if([oldPassword, newPassword].some(field => field.trim() === "")) throw new ApiError(401, "Provide the content in the fields.");

    if(oldPassword === newPassword) throw new ApiError(400, "New passwords is same as old password.");

    if(!loggedInUser) throw new ApiError(400, "User not found.");

    const user = await User.findById(loggedInUser._id).select("-refreshToken");

    const checkPassword = await user.isPasswordCorrect(oldPassword);

    if(!checkPassword) throw new ApiError(400, "Invalid password.");

    user.password = newPassword;

    await user.save();

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Successfully password changed."))

});

const changeUserAvatar = AsyncHandler(async (req, res) => {
    const localPathAvatar = req.file?.path; // ✅ Fix: Use `req.file` instead of `req.files`
    const loggedInUser = req.user;

    if (!localPathAvatar) throw new ApiError(400, "Please provide an avatar picture.");

    const user = await User.findById(loggedInUser._id).select("-password -refreshToken");
    if (!user) throw new ApiError(404, "User not found."); // ✅ Change 400 to 404 for better status code

    if (user.avatar) {
        await deleteFileOnCloudinary(user.avatar);
    }

    const updatedAvatarUrl = await uploadFileOnCloudniary(localPathAvatar);
    if (!updatedAvatarUrl) throw new ApiError(500, "Failed to upload avatar."); // ✅ Use 500 for server-side issues

    user.avatar = updatedAvatarUrl.url;
    await user.save();

    return res.status(200).json(new ApiResponse(200, user, "Avatar has been changed."));
});

const changeUserCoverImage = AsyncHandler(async (req, res) => {
    const localPathCoverImage = req.file?.path; // ✅ Fix: Use `req.file` instead of `req.files`
    const loggedInUser = req.user;

    if (!localPathCoverImage) throw new ApiError(400, "Please provide an cover picture.");

    const user = await User.findById(loggedInUser._id).select("-password -refreshToken");
    if (!user) throw new ApiError(404, "User not found."); // ✅ Change 400 to 404 for better status code

    if (user.coverImage) {
        await deleteFileOnCloudinary(user.coverImage);
    }

    const updatedCoverImageUrl = await uploadFileOnCloudniary(localPathCoverImage);
    if (!updatedCoverImageUrl) throw new ApiError(500, "Failed to upload cover image."); // ✅ Use 500 for server-side issues

    user.coverImage = updatedCoverImageUrl.url;
    await user.save();

    return res.status(200).json(new ApiResponse(200, user, "Cover Image has been changed."));
});

// Only admin access routes:
const getAllUsersAdminOnly = AsyncHandler(async (req, res) => {
    const users = await User.find({}, "-password -refreshToken"); // Exclude passwords
    res
        .status(200)
        .json(new ApiResponse(200, users, "Fetched all users."));
});

const deleteUserAdminOnly = AsyncHandler(async (req, res) => {
    const { target } = req.body;

    if (!target) throw new ApiError(400, "Please mention the username.");

    // Correct query format
    const deletedUser = await User.findOneAndDelete({ username: target });

    if (!deletedUser) throw new ApiError(400, "User not found.");

    // Fetch all remaining users (excluding password and refreshToken)
    const users = await User.find().select("-password -refreshToken");

    return res
        .status(200)
        .json(new ApiResponse(200, { deletedUser, users }, "User deleted successfully."));
});

export { 
    registerUser, 
    loginUser, 
    logoutUser, 
    getRefreshToken, 
    changeUserDetails,
    getUser,
    changeUserPassword,
    changeUserAvatar,
    changeUserCoverImage,
    getAllUsersAdminOnly, 
    deleteUserAdminOnly
};
