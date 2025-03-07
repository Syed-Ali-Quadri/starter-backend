import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
// configure cors middleware for protection
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
    })
)
// common middleware.
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser())

// import routes
import healthcheckRoute from "./routes/healthcheck.routes.js"
import userRoutes from "./routes/user.routes.js";
import tweetRoutes from "./routes/tweet.routes.js";
import videoRoutes from "./routes/video.routes.js";
import playlistRoutes from "./routes/playlist.routes.js";

// routes
app.use("/api/v1/healthcheck", healthcheckRoute);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/tweet", tweetRoutes);
app.use("/api/v1/video", videoRoutes);
app.use("/api/v1/playlist", playlistRoutes);

export { app }