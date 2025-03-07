import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

import dotenv from "dotenv";
dotenv.config();

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET
});

const uploadFileOnCloudniary = async (localFile, resourse = "image") => {
    try {
        if(!localFile) return null;

        const response = await cloudinary.uploader.upload(localFile, {
            resource_type: resourse
        });

        console.log("Your file is uploaded to the cloudinary. Here is the file url: ", response.url)
        fs.unlinkSync(localFile);

        return response;

    } catch (error) {
        throw new ApiError(401, "Cloudinary upload failed: " + error);
    }

};

const extractPublicId = (url) => {
    if (!url) return null;

    const parts = url.split('/upload/'); 
    if (!parts[1]) return null;

    const publicIdWithVersion = parts[1].split('/');
    
    // Remove version (which starts with 'v' followed by numbers)
    if (publicIdWithVersion[0].startsWith('v')) {
      publicIdWithVersion.shift(); // Remove version
    }

    // Rejoin remaining parts to get the full public_id without extension
    return publicIdWithVersion.join('/').split('.')[0];
};

const deleteFileOnCloudinary = async (url) => {
    try {
        if (!url) return null; 
        const publicId = extractPublicId(url);
        
        if (!publicId) throw new ApiError('Invalid public ID extraction from URL');

        // Determine resource type based on URL file extension
        const isVideo = url.match(/\.(mp4|avi|mov|mkv)$/); // Add more extensions if needed
        const options = isVideo ? { resource_type: "video" } : {}; 

        const result = await cloudinary.uploader.destroy(publicId, options);
        console.log("Delete result:", result);

        return result;
    } catch (error) {
        throw new ApiError(401, `Cloudinary delete failed: ${error.message}`);
    }
};

export { uploadFileOnCloudniary, deleteFileOnCloudinary };