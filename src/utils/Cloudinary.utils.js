import * as fs from "node:fs";
import { v2 as cloudinary } from "cloudinary";

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// delete temp files
const deleteLocalFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Failed to delte temporary files", err);
      } else {
        console.log("Temp file deleted: ", filePath);
      }
    });
  }
};

// upload on cloudinary
const uploadCloudinary = async (source, foldername, mimetype) => {
  try {
    if (!source) {
      console.log("No source provided for upload");
      return null;
    }
    const options = { resource_type: "auto" };
    if (foldername) options.folder = foldername;

    let response;
    if (Buffer.isBuffer(source)) {
      response = await cloudinary.uploader.upload(
        `data:${mimetype};base64,${source.toString("base64")}`,
        options
      );
    } else {
      response = await cloudinary.uploader.upload(source, options);
      deleteLocalFile(source);
    }

    if (!response?.secure_url || !response?.public_id) {
      console.error("upload response is invalid: ", response);
      return null;
    }
    console.log("File uploaded on cloudinary. File src: ", response.secure_url);

    return {
      secure_url: response.secure_url,
      public_id: response.public_id,
    };
  } catch (error) {
    console.error("cloudinary upload failed", error);
    if (typeof source === "string") {
      deleteLocalFile(source);
    }
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) {
      console.error("No public id provided for deletion");
      return null;
    }
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result === "ok") {
      console.log("Deleted from cloudinary", publicId);
    } else {
      console.warn("cloudinary deletion returned ", result);
    }
    return result;
  } catch (error) {
    console.log("Error deleting from cloudinary", error);
    return null;
  }
};
export { uploadCloudinary, deleteFromCloudinary };
