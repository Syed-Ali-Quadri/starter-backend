import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { createTweet, 
    deleteTweet, 
    deleteTweetAdminOnly, 
    getAllTweets, 
    getTweetById, 
    getUserTweets, 
    updateTweet 
} from "../controllers/tweet.controllers.js";
import { isAdmin } from "../middlewares/isAdmin.middleware.js";

const route = Router();

// Secured user tweet routes.
route.route("/create").post(verifyJWT, createTweet);
route.route("/delete/:tweetId").delete(verifyJWT, deleteTweet);
route.route("/update/:tweetId").put(verifyJWT, updateTweet);
route.route("/get-tweet/:tweetId").get(verifyJWT, getTweetById);
route.route("/get-user-tweets/:userId").get(verifyJWT, getUserTweets);
route.route("/").get(verifyJWT, getAllTweets);

// Only admin access routes.
route.route("/admin/delete-tweet").delete([verifyJWT, isAdmin], deleteTweetAdminOnly);

export default route;