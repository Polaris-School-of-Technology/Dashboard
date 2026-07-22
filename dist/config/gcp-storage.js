"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucket = exports.bucketName = exports.storage = void 0;
const storage_1 = require("@google-cloud/storage");
const path_1 = __importDefault(require("path"));
// Initialize GCP Storage
exports.storage = new storage_1.Storage({
    keyFilename: path_1.default.join(__dirname, 'notification-key.json'), // Path to your service account key
    projectId: process.env.GCP_PROJECT_ID, // Your GCP project ID
});
// Your bucket name
exports.bucketName = process.env.GCP_BUCKET_NAME_NOTIFICATIONS || 'notifications_app';
// Get the bucket instance
exports.bucket = exports.storage.bucket(exports.bucketName);
