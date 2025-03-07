import { Router } from "express";
import { loginUser, 
    logoutUser, 
    registerUser, 
    getRefreshToken, 
    changeUserDetails, 
    changeUserPassword, 
    changeUserAvatar, 
    changeUserCoverImage, 
    getUser, 
    getAllUsersAdminOnly, 
    deleteUserAdminOnly 
} from "../controllers/user.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js"
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const route = Router();

// Unsecured routes.
route.route("/register").post(upload.fields(
    [
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]
), 
registerUser);
route.route("/login").get(loginUser);

// secure user routes.
route.route("/logout").post(verifyJWT, logoutUser);
route.route("/refresh-token").post(verifyJWT, getRefreshToken);
route.route("/get-user").get(verifyJWT, getUser);
route.route("/update-user").put(verifyJWT, changeUserDetails);
route.route("/update-password").put(verifyJWT, changeUserPassword);
route.route("/update-avatar").put([verifyJWT, upload.single("updatedAvatar")], changeUserAvatar);
route.route("/update-cover-image").put([verifyJWT, upload.single("updatedCoverImage")], changeUserCoverImage);

// Only admin access routes.
route.route("/admin/all-users").get([verifyJWT, isAdmin], getAllUsersAdminOnly);
route.route("/admin/delete-user").delete([verifyJWT, isAdmin], deleteUserAdminOnly);

export default route;