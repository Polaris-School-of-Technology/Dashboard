import { Storage } from '@google-cloud/storage';
import path from 'path';

// Initialize GCP Storage
export const storage = new Storage({
    keyFilename: path.join(__dirname, 'notification-key.json'), // Path to your service account key
    projectId: process.env.GCP_PROJECT_ID, // Your GCP project ID
});

// Your bucket name
export const bucketName = process.env.GCP_BUCKET_NAME_NOTIFICATIONS || 'notifications_app';

// Get the bucket instance
export const bucket = storage.bucket(bucketName);