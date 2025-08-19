import multer from "multer";
import { ApiError } from "../utils/ApiError.utils.js";
const storage = multer.memoryStorage();

const allowMimeType = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
];
export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowMimeType.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError(400, "only images and videos are allowed"), false);
    }
  },
});
