import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createVideo, 
    deleteVideo, 
    updateVideo, 
    getVideoById, 
    getUserVideos, 
    getAllVideos, 
    deleteVideoAdminOnly 
} from "../controllers/video.controllers.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";
import { upload, handleFileCleanup } from "../middlewares/multer.middleware.js"

const route = Router();

// Secured user tweet routes.
route.route("/create").post(
    [
        verifyJWT,
        upload.fields([
            { name: "video", maxCount: 1 },
            { name: "thumbnail", maxCount: 1 }
        ])
    ],
    createVideo,
    handleFileCleanup // 🔥 Automatically clean up files on failure
);
route.route("/delete/:videoId").delete(verifyJWT, deleteVideo);
route.route("/update/:videoId").put([verifyJWT, upload.single("thumbnail")], updateVideo, handleFileCleanup);
route.route("/get-video/:videoId").get(verifyJWT, getVideoById);
route.route("/get-user-videos/:userId").get(verifyJWT, getUserVideos);
route.route("/").get(verifyJWT, getAllVideos);

// Only admin access routes.
route.route("/admin/delete-tweet").delete([verifyJWT, isAdmin], deleteVideoAdminOnly);

export default route;
