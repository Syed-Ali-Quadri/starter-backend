import { AsyncHandler } from "../utilities/AsyncHandler.js";
import { ApiError } from "../utilities/ApiError.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";

const verifyJWT = AsyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.headers["authorization"]?.split("Bearer ")[1];
        
        if(!token) throw new ApiError(400, "Unauthorized request.");

        const verifyToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if(!verifyToken) throw new ApiError(400, "Unauthorized request.");

        const user = await User.findById(verifyToken._id);

        if(!user) throw new ApiError(403, "Access denied.");

        req.user = user;

    next();
    } catch (error) {
        throw new ApiError(401, "Invalid authentication access.")
    }

});

export { verifyJWT };