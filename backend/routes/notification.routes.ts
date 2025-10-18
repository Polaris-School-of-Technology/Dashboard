import { Router } from 'express';
import {
    sendBatchNotification,
    sendGlobalNotification,
    sendUserNotification,
    uploadCsvMiddleware,
    sendParentNotification,
    uploadNotificationFiles  // Add this import
} from '../controllers/notification.controller'

import { authenticate, authorizeAdmin } from '../middlewares/admin'
const router = Router();

// --- NOTIFICATION ROUTES ---
// All admin routes defined here are protected and require admin privileges to access.

/**
 * @route   POST /api/v1/notifications/batch/:batchId
 * @desc    Sends a notification to all students in a specific batch.
 * @body    { title: string, content: string, category?: string, is_header?: boolean }
 * @file    image (optional): Image file for the notification
 * @access  Private (Admin)
 */
router.post(
    '/batch/:batchId',
    authenticate,
    authorizeAdmin,
    uploadNotificationFiles,  // Changed from no middleware to uploadNotificationFiles
    sendBatchNotification
);

/**
 * @route   POST /api/v1/notifications/global
 * @desc    Sends a global notification to every user in the system.
 * @body    { title: string, content: string, category?: string, is_header?: boolean }
 * @file    image (optional): Image file for the notification
 * @access  Private (Admin)
 */
router.post(
    '/global',
    authenticate,
    authorizeAdmin,
    uploadNotificationFiles,  // Added uploadNotificationFiles middleware
    sendGlobalNotification
);

/**
 * @route   POST /api/v1/notifications/users
 * @desc    Sends a notification to specific users by their IDs or CSV file.
 * @body    { title: string, content: string, recipient_ids: string[], category?: string, is_header?: boolean }
 * @file    recipients_file (optional): CSV file with user emails/phones/IDs
 * @file    image (optional): Image file for the notification
 * @access  Private (Admin)
 */
router.post(
    '/users',
    authenticate,
    authorizeAdmin,
    uploadNotificationFiles,  // Changed from uploadCsvMiddleware to uploadNotificationFiles
    sendUserNotification
);

/**
 * @route   POST /api/v1/notifications/parents
 * @desc    Sends a notification to all parents in the system.
 * @body    { title: string, content: string, category?: string, is_header?: boolean }
 * @file    image (optional): Image file for the notification
 * @access  Private (Admin)
 */
router.post(
    '/parents',
    authenticate,
    authorizeAdmin,
    uploadNotificationFiles,  // Added uploadNotificationFiles middleware
    sendParentNotification
);

export default router;