"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImageMetadata = exports.checkBucketAccess = exports.deleteImage = exports.uploadImage = void 0;
const storage_1 = require("@google-cloud/storage");
const crypto_1 = require("crypto"); // Use Node.js built-in instead of uuid package
const path_1 = __importDefault(require("path"));
// Initialize GCP Storage client
const storage = new storage_1.Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.NOTIFICATION_KEY_FILE,
});
const bucketName = process.env.GCP_BUCKET_NAME_NOTIFICATIONS;
const bucket = storage.bucket(bucketName);
/**
 * Upload an image file to GCP Storage
 * @param file - Multer file object from request
 * @param folder - Folder path in bucket (default: 'notifications')
 * @returns Public URL of the uploaded image
 */
const uploadImage = (file_1, ...args_1) => __awaiter(void 0, [file_1, ...args_1], void 0, function* (file, folder = 'notifications') {
    try {
        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
            throw new Error('File must be an image');
        }
        // Generate unique filename with original extension using Node.js crypto
        const fileExtension = path_1.default.extname(file.originalname);
        const uniqueFileName = `${folder}/${(0, crypto_1.randomUUID)()}${fileExtension}`;
        // Create a reference to the file in the bucket
        const blob = bucket.file(uniqueFileName);
        // Create write stream
        const blobStream = blob.createWriteStream({
            resumable: false,
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    firebaseStorageDownloadTokens: (0, crypto_1.randomUUID)(), // Optional: for Firebase compatibility
                },
            },
        });
        // Return a promise that resolves with the public URL
        return new Promise((resolve, reject) => {
            blobStream.on('error', (error) => {
                console.error('GCP upload error:', error);
                reject(new Error('Failed to upload image to GCP Storage'));
            });
            blobStream.on('finish', () => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    // Make the file publicly accessible
                    yield blob.makePublic();
                    // Construct the public URL
                    const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`;
                    console.log(`Image uploaded successfully: ${publicUrl}`);
                    resolve(publicUrl);
                }
                catch (error) {
                    console.error('Error making file public:', error);
                    reject(new Error('Failed to make image public'));
                }
            }));
            // Write the file buffer to GCP
            blobStream.end(file.buffer);
        });
    }
    catch (error) {
        console.error('Error in uploadImage:', error);
        throw error;
    }
});
exports.uploadImage = uploadImage;
/**
 * Delete an image from GCP Storage
 * @param imageUrl - Full public URL of the image
 */
const deleteImage = (imageUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract filename from URL
        const baseUrl = `https://storage.googleapis.com/${bucketName}/`;
        if (!imageUrl.startsWith(baseUrl)) {
            throw new Error('Invalid image URL');
        }
        const fileName = imageUrl.replace(baseUrl, '');
        // Delete the file
        yield bucket.file(fileName).delete();
        console.log(`Image deleted successfully: ${fileName}`);
    }
    catch (error) {
        console.error('Error deleting image:', error);
        throw new Error('Failed to delete image from GCP Storage');
    }
});
exports.deleteImage = deleteImage;
/**
 * Check if bucket exists and is accessible
 */
const checkBucketAccess = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const [exists] = yield bucket.exists();
        if (!exists) {
            console.error(`Bucket ${bucketName} does not exist`);
            return false;
        }
        console.log(`Successfully connected to bucket: ${bucketName}`);
        return true;
    }
    catch (error) {
        console.error('Error checking bucket access:', error);
        return false;
    }
});
exports.checkBucketAccess = checkBucketAccess;
/**
 * Get file metadata
 */
const getImageMetadata = (imageUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const baseUrl = `https://storage.googleapis.com/${bucketName}/`;
        const fileName = imageUrl.replace(baseUrl, '');
        const [metadata] = yield bucket.file(fileName).getMetadata();
        return metadata;
    }
    catch (error) {
        console.error('Error getting image metadata:', error);
        throw error;
    }
});
exports.getImageMetadata = getImageMetadata;
