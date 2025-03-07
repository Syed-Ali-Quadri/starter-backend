import { AsyncHandler } from "../utilities/AsyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

const isAdmin = AsyncHandler(async (req, _, next) => {
    const token = req.cookies?.accessToken;

    if (!token) {
        return next(new ApiError(401, "Unauthorized Access. No token provided."));
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // Ensure correct secret

        if (!decodedToken) {
            return next(new ApiError(401, "Unauthorized Access."));
        }

        const getUser = await User.findById(decodedToken._id).select("-password"); // ✅ Fix: Use `await`
        if (!getUser) {
            return next(new ApiError(401, "User not found."));
        }

        if (getUser.role !== "admin") {
            return next(new ApiError(403, "Access Denied. Admins only."));
        }

        next(); // ✅ Proceed if user is an admin
    } catch (error) {
        return next(new ApiError(401, "Invalid or Expired Token"));
    }
});

export { isAdmin };
