// controllers/notifications.controller.ts
import { Request, Response } from 'express';
import * as notificationService from '../services/notification.services';
import multer from 'multer'
import { parse } from 'csv-parse/sync';
import { supabase } from '../config/supabase';
import * as storageService from '../services/storage.services'

// OLD middleware - keep for backward compatibility
const uploadCsv = multer({
    storage: multer.memoryStorage()
});

// NEW middleware - for image + CSV support
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'recipients_file') {
            if (file.mimetype === 'text/csv') {
                cb(null, true);
            } else {
                cb(new Error('Recipients file must be CSV'));
            }
        }
        else if (file.fieldname === 'image') {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
            }
        } else {
            cb(null, true);
        }
    },
});

// Notification category type
type NotificationCategory = 'notice' | 'fees' | 'reminder' | 'general' | 'Hosteller';

/** ----------------------------
 * Helper: Map emails/phones → user_id[]
 * Also passes through raw UUIDs from CSV/JSON
 * ---------------------------- */
const getUserIdsFromContacts = async (identifiers: (string | number)[]): Promise<string[]> => {
    if (!identifiers.length) return [];

    const normalized = identifiers.map((id) => String(id).trim());

    const userIds: string[] = [];
    const lookupIdentifiers: string[] = [];

    // Separate raw UUIDs from emails/phones
    normalized.forEach((val) => {
        if (/^[0-9a-fA-F-]{36}$/.test(val)) { // UUID v4 pattern
            userIds.push(val);
        } else {
            lookupIdentifiers.push(val.toLowerCase());
        }
    });

    if (lookupIdentifiers.length > 0) {
        const { data, error } = await supabase
            .from('user_contacts')
            .select('user_id')
            .or(lookupIdentifiers.map((v) => `email.eq.${v},phone.eq.${v}`).join(','));

        if (error) {
            console.error('Error fetching users from user_contacts:', error);
            throw new Error('Could not fetch user IDs');
        }

        userIds.push(...(data?.map((u: any) => u.user_id) || []));
    }

    return userIds;
};

/** ----------------------------
 * 1. Batch Notification
 * ---------------------------- */
export const sendBatchNotification = async (req: Request, res: Response): Promise<Response | undefined> => {
    try {
        const batchId = parseInt(req.params.batchId, 10);
        const { title, content, category = 'general', is_header = false } = req.body;

        if (isNaN(batchId)) return res.status(400).json({ message: "Invalid 'batchId'" });
        if (!title || !content) return res.status(400).json({ message: "Missing 'title' or 'content'" });

        const valid: NotificationCategory[] = ['notice', 'fees', 'reminder', 'general', 'Hosteller'];
        if (!valid.includes(category as NotificationCategory))
            return res.status(400).json({ message: `Invalid category. Must be one of: ${valid.join(', ')}` });

        // Handle optional image upload
        let imageUrl: string | undefined;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files?.image?.[0]) {
            imageUrl = await storageService.uploadImage(files.image[0], 'notifications');
        }

        const count = await notificationService.notifyBatch(batchId, title, content, category, is_header, imageUrl);
        res.status(200).json({
            message: `Notification sent to batch ${batchId}`,
            usersNotified: count,
            image_url: imageUrl
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
};

/** ----------------------------
 * 2. Global Notification
 * ---------------------------- */
export const sendGlobalNotification = async (req: Request, res: Response): Promise<Response | undefined> => {
    try {
        const { title, content, category = 'general', is_header = false } = req.body;

        if (!title || !content) return res.status(400).json({ message: "Missing 'title' or 'content'" });

        const valid: NotificationCategory[] = ['notice', 'fees', 'reminder', 'general', 'Hosteller'];
        if (!valid.includes(category as NotificationCategory))
            return res.status(400).json({ message: `Invalid category. Must be one of: ${valid.join(', ')}` });

        // Handle optional image upload
        let imageUrl: string | undefined;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files?.image?.[0]) {
            imageUrl = await storageService.uploadImage(files.image[0], 'notifications');
        }

        const count = await notificationService.notifyAllUsers(title, content, category, is_header, imageUrl);
        res.status(200).json({
            message: 'Global notification sent',
            usersNotified: count,
            image_url: imageUrl
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
};

/** ----------------------------
 * 3. User Notification
 * ---------------------------- */
export const sendUserNotification = async (req: Request, res: Response): Promise<Response | undefined> => {
    try {
        const { title, content, category = 'general', is_header = false } = req.body;

        if (!title || !content) return res.status(400).json({ message: "Missing 'title' or 'content'" });

        let recipientIds: string[] = [];
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Case 1: CSV file upload
        if (files?.recipients_file?.[0]) {
            const csvData = files.recipients_file[0].buffer.toString('utf-8');
            const rows = parse(csvData, { skip_empty_lines: true });
            const identifiers = rows.flat();
            recipientIds = await getUserIdsFromContacts(identifiers);
        }
        // Case 2: JSON body
        else if (req.body.recipient_ids) {
            recipientIds = await getUserIdsFromContacts(req.body.recipient_ids);
        } else {
            return res.status(400).json({ message: 'Must provide recipient_ids or CSV file' });
        }

        if (!recipientIds.length) return res.status(404).json({ message: 'No matching users found' });

        // Handle optional image upload
        let imageUrl: string | undefined;
        if (files?.image?.[0]) {
            imageUrl = await storageService.uploadImage(files.image[0], 'notifications');
        }

        const count = await notificationService.sendNotificationToUsers(
            title,
            content,
            category,
            is_header,
            recipientIds,
            imageUrl
        );

        res.status(200).json({
            message: 'Notification sent',
            usersNotified: count,
            image_url: imageUrl
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
};

/** ----------------------------
 * 4. Parent Notification
 * ---------------------------- */
export const sendParentNotification = async (req: Request, res: Response): Promise<Response | undefined> => {
    try {
        const { title, content, category = 'general', is_header = false } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: "Missing 'title' or 'content'" });
        }

        const valid: NotificationCategory[] = ['notice', 'fees', 'reminder', 'general', 'Hosteller'];
        if (!valid.includes(category as NotificationCategory)) {
            return res.status(400).json({
                message: `Invalid category. Must be one of: ${valid.join(', ')}`
            });
        }

        // Handle optional image upload
        let imageUrl: string | undefined;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files?.image?.[0]) {
            imageUrl = await storageService.uploadImage(files.image[0], 'notifications');
        }

        const count = await notificationService.notifyAllParents(title, content, category, is_header, imageUrl);

        if (count === 0) {
            return res.status(404).json({ message: 'No parents found' });
        }

        res.status(200).json({
            message: 'Notification sent to all parents',
            usersNotified: count,
            image_url: imageUrl
        });
    } catch (err: any) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
};

// Middleware for CSV upload
export const uploadCsvMiddleware = upload.single('file');

// Middleware for image + CSV upload (use this for all notification endpoints)
export const uploadNotificationFiles = upload.fields([
    { name: 'recipients_file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
]);