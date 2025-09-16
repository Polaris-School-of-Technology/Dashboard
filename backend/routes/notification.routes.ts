import { Router } from 'express';
import {
    sendBatchNotification,
    sendGlobalNotification,
    sendUserNotification,
    uploadCsvMiddleware
} from '../controllers/notification.controller'

import { authenticate, authorizeAdmin } from '../middlewares/admin'
const router = Router();

// --- NOTIFICATION ROUTES ---
// All admin routes defined here are protected and require admin privileges to access.

/**
 * @route   POST /api/v1/notifications/batch/:batchId
 * @desc    Sends a notification to all students in a specific batch.
 * @body    { title: string, content: string, category?: string, is_header?: boolean }
 * @access  Private (Admin)
 */
router.post(
    '/batch/:batchId',
    authenticate,
    authorizeAdmin,
    sendBatchNotification
);

/**
 * @route   POST /api/v1/notifications/global
 * @desc    Sends a global notification to every user in the system.
 * @body    { title: string, content: string, category?: string, is_header?: boolean }
 * @access  Private (Admin)
 */
router.post(
    '/global',
    authenticate,
    authorizeAdmin,
    sendGlobalNotification
);

/**
 * @route   POST /api/v1/notifications/users
 * @desc    Sends a notification to specific users by their IDs.
 * @body    { title: string, content: string, recipient_ids: string[], category?: string, is_header?: boolean }
 * @access  Private (Admin)
 */
router.post(
    '/users',

    uploadCsvMiddleware,   // <-- Add this so CSV file gets parsed
    sendUserNotification
);






export default router;