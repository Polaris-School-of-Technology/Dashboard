"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const admin_1 = require("../middlewares/admin");
const router = (0, express_1.Router)();
// --- NOTIFICATION ROUTES ---
// All admin routes defined here are protected and require admin privileges to access.
/**
 * @route   POST /api/v1/notifications/batch/:batchId
 * @desc    Sends a notification to all students in a specific batch.
 * @body    { title: string, content: string, category?: string, is_header?: boolean }
 * @file    image (optional): Image file for the notification
 * @access  Private (Admin)
 */
router.post('/batch/:batchId', admin_1.authenticate, admin_1.authorizeAdmin, notification_controller_1.uploadNotificationFiles, // Changed from no middleware to uploadNotificationFiles
notification_controller_1.sendBatchNotification);
/**
 * @route   POST /api/v1/notifications/global
 * @desc    Sends a global notification to every user in the system.
 * @body    { title: string, content: string, category?: string, is_header?: boolean }
 * @file    image (optional): Image file for the notification
 * @access  Private (Admin)
 */
router.post('/global', admin_1.authenticate, admin_1.authorizeAdmin, notification_controller_1.uploadNotificationFiles, // Added uploadNotificationFiles middleware
notification_controller_1.sendGlobalNotification);
/**
 * @route   POST /api/v1/notifications/users
 * @desc    Sends a notification to specific users by their IDs or CSV file.
 * @body    { title: string, content: string, recipient_ids: string[], category?: string, is_header?: boolean }
 * @file    recipients_file (optional): CSV file with user emails/phones/IDs
 * @file    image (optional): Image file for the notification
 * @access  Private (Admin)
 */
router.post('/users', admin_1.authenticate, admin_1.authorizeAdmin, notification_controller_1.uploadNotificationFiles, // Changed from uploadCsvMiddleware to uploadNotificationFiles
notification_controller_1.sendUserNotification);
/**
 * @route   POST /api/v1/notifications/parents
 * @desc    Sends a notification to all parents in the system.
 * @body    { title: string, content: string, category?: string, is_header?: boolean }
 * @file    image (optional): Image file for the notification
 * @access  Private (Admin)
 */
router.post('/parents', admin_1.authenticate, admin_1.authorizeAdmin, notification_controller_1.uploadNotificationFiles, // Added uploadNotificationFiles middleware
notification_controller_1.sendParentNotification);
exports.default = router;
