// controllers/notifications.controller.ts
import { Request, Response } from 'express';
import * as notificationService from '../services/notification.services';
import multer from 'multer'
import { parse } from 'csv-parse/sync';
import { supabase } from '../config/supabase';

// Multer setup for CSV uploads
const upload = multer({ storage: multer.memoryStorage() });

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
export const sendBatchNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const batchId = parseInt(req.params.batchId, 10);
        const { title, content, category = 'general', is_header = false } = req.body;

        if (isNaN(batchId)) return res.status(400).json({ message: "Invalid 'batchId'" });
        if (!title || !content) return res.status(400).json({ message: "Missing 'title' or 'content'" });

        const valid: NotificationCategory[] = ['notice', 'fees', 'reminder', 'general', 'Hosteller'];
        if (!valid.includes(category as NotificationCategory))
            return res.status(400).json({ message: `Invalid category. Must be one of: ${valid.join(', ')}` });

        const count = await notificationService.notifyBatch(batchId, title, content, category, is_header);
        res.status(200).json({ message: `Notification sent to batch ${batchId}`, usersNotified: count });
    } catch (err: any) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
};

/** ----------------------------
 * 2. Global Notification
 * ---------------------------- */
export const sendGlobalNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, content, category = 'general', is_header = false } = req.body;

        if (!title || !content) return res.status(400).json({ message: "Missing 'title' or 'content'" });

        const valid: NotificationCategory[] = ['notice', 'fees', 'reminder', 'general', 'Hosteller'];
        if (!valid.includes(category as NotificationCategory))
            return res.status(400).json({ message: `Invalid category. Must be one of: ${valid.join(', ')}` });

        const count = await notificationService.notifyAllUsers(title, content, category, is_header);
        res.status(200).json({ message: 'Global notification sent', usersNotified: count });
    } catch (err: any) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
};

/** ----------------------------
 * 3. User Notification
 * ---------------------------- */
export const sendUserNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, content, category = 'general', is_header = false } = req.body;

        if (!title || !content) return res.status(400).json({ message: "Missing 'title' or 'content'" });

        let recipientIds: string[] = [];

        // Case 1: CSV file upload
        if (req.file) {
            const csvData = req.file.buffer.toString('utf-8');
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

        const count = await notificationService.sendNotificationToUsers(
            title,
            content,
            category,
            is_header,
            recipientIds
        );

        res.status(200).json({ message: 'Notification sent', usersNotified: count });
    } catch (err: any) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
};

// Middleware for CSV upload
export const uploadCsvMiddleware = upload.single('file');
