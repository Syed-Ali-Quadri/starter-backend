import multer from "multer";
import fs from "fs";

// ✅ Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "./public/temp"),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix);
    }
});

// ✅ Multer Upload Instance
export const upload = multer({ storage });

// ✅ Universal Cleanup Middleware (Deletes Temp Files on Error)
export const cleanupFiles = (req) => {
    if (req.files) {
        Object.values(req.files).flat().forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) console.error(`Error deleting file: ${file.path}`, err);
            });
        });
    }
};

// ✅ Global Error Handling Middleware for File Uploads
export const handleFileCleanup = (err, req, res, next) => {
    cleanupFiles(req); // 🔥 Automatically delete uploaded files on failure

    if (err) {
        return res.status(500).json({ message: err.message || "Internal Server Error" });
    }

    next();
};
