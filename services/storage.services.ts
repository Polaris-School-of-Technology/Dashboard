import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto'; // Use Node.js built-in instead of uuid package
import path from 'path';

// Initialize GCP Storage client
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.NOTIFICATION_KEY_FILE,
});

const bucketName = process.env.GCP_BUCKET_NAME_NOTIFICATIONS!;
const bucket = storage.bucket(bucketName);

/**
 * Upload an image file to GCP Storage
 * @param file - Multer file object from request
 * @param folder - Folder path in bucket (default: 'notifications')
 * @returns Public URL of the uploaded image
 */
export const uploadImage = async (
  file: Express.Multer.File,
  folder: string = 'notifications'
): Promise<string> => {
  try {
    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Generate unique filename with original extension using Node.js crypto
    const fileExtension = path.extname(file.originalname);
    const uniqueFileName = `${folder}/${randomUUID()}${fileExtension}`;

    // Create a reference to the file in the bucket
    const blob = bucket.file(uniqueFileName);

    // Create write stream
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: randomUUID(), // Optional: for Firebase compatibility
        },
      },
    });

    // Return a promise that resolves with the public URL
    return new Promise((resolve, reject) => {
      blobStream.on('error', (error) => {
        console.error('GCP upload error:', error);
        reject(new Error('Failed to upload image to GCP Storage'));
      });

      blobStream.on('finish', async () => {
        try {
          // Make the file publicly accessible
          await blob.makePublic();

          // Construct the public URL
          const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueFileName}`;

          console.log(`Image uploaded successfully: ${publicUrl}`);
          resolve(publicUrl);
        } catch (error) {
          console.error('Error making file public:', error);
          reject(new Error('Failed to make image public'));
        }
      });

      // Write the file buffer to GCP
      blobStream.end(file.buffer);
    });
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw error;
  }
};

/**
 * Delete an image from GCP Storage
 * @param imageUrl - Full public URL of the image
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    // Extract filename from URL
    const baseUrl = `https://storage.googleapis.com/${bucketName}/`;
    if (!imageUrl.startsWith(baseUrl)) {
      throw new Error('Invalid image URL');
    }

    const fileName = imageUrl.replace(baseUrl, '');

    // Delete the file
    await bucket.file(fileName).delete();
    console.log(`Image deleted successfully: ${fileName}`);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image from GCP Storage');
  }
};

/**
 * Check if bucket exists and is accessible
 */
export const checkBucketAccess = async (): Promise<boolean> => {
  try {
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`Bucket ${bucketName} does not exist`);
      return false;
    }
    console.log(`Successfully connected to bucket: ${bucketName}`);
    return true;
  } catch (error) {
    console.error('Error checking bucket access:', error);
    return false;
  }
};

/**
 * Get file metadata
 */
export const getImageMetadata = async (imageUrl: string) => {
  try {
    const baseUrl = `https://storage.googleapis.com/${bucketName}/`;
    const fileName = imageUrl.replace(baseUrl, '');

    const [metadata] = await bucket.file(fileName).getMetadata();
    return metadata;
  } catch (error) {
    console.error('Error getting image metadata:', error);
    throw error;
  }
};