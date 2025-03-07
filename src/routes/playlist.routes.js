import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    createPlaylist, 
    deletePlaylist, 
    updatePlaylist, 
    getPlaylistById, 
    getUserPlaylists,
    addVideoToPlaylist, 
    removeVideoFromPlaylist
} from "../controllers/playlist.controllers.js";

const route = Router();

// Create a new playlist
route.route("/create").post(verifyJWT, createPlaylist);

// Delete a playlist
route.route("/delete/:playlistId").delete(verifyJWT, deletePlaylist);

// Update playlist details (title, description, visibility)
route.route("/update/:playlistId").put(verifyJWT, updatePlaylist);

// Get a specific playlist by ID
route.route("/get-playlist/:playlistId").get(verifyJWT, getPlaylistById);

// Get all playlists of a user
route.route("/get-user-playlists/:userId").get(verifyJWT, getUserPlaylists);

// Add a video to a playlist
route.route("/add-video/:playlistId/:videoId").post(verifyJWT, addVideoToPlaylist);

// Remove a video from a playlist
route.route("/remove-video/:playlistId/:videoId").delete(verifyJWT, removeVideoFromPlaylist);

export default route;
