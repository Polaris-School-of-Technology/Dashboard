"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.uploadNotificationFiles = exports.uploadCsvMiddleware = exports.sendParentNotification = exports.sendUserNotification = exports.sendGlobalNotification = exports.sendBatchNotification = void 0;
const notificationService = __importStar(require("../services/notification.services"));
const multer_1 = __importDefault(require("multer"));
const sync_1 = require("csv-parse/sync");
const supabase_1 = require("../config/supabase");
const storageService = __importStar(require("../services/storage.services"));
// OLD middleware - keep for backward compatibility
const uploadCsv = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage()
});
// NEW middleware - for image + CSV support
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'recipients_file') {
            if (file.mimetype === 'text/csv') {
                cb(null, true);
            }
            else {
                cb(new Error('Recipients file must be CSV'));
            }
        }
        else if (file.fieldname === 'image') {
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
            }
        }
        else {
            cb(null, true);
        }
    },
});
/** ----------------------------
 * Helper: Map emails/phones → user_id[]
 * Also passes through raw UUIDs from CSV/JSON
 * ---------------------------- */
const getUserIdsFromContacts = (identifiers) => __awaiter(void 0, void 0, void 0, function* () {
    if (!identifiers.length)
        return [];
    const normalized = identifiers.map((id) => String(id).trim());
    const userIds = [];
    const lookupIdentifiers = [];
    // Separate raw UUIDs from emails/phones
    normalized.forEach((val) => {
        if (/^[0-9a-fA-F-]{36}$/.test(val)) { // UUID v4 pattern
            userIds.push(val);
        }
        else {
            lookupIdentifiers.push(val.toLowerCase());
        }
    });
    if (lookupIdentifiers.length > 0) {
        const { data, error } = yield supabase_1.supabase
            .from('user_contacts')
            .select('user_id')
            .or(lookupIdentifiers.map((v) => `email.eq.${v},phone.eq.${v}`).join(','));
        if (error) {
            console.error('Error fetching users from user_contacts:', error);
            throw new Error('Could not fetch user IDs');
        }
        userIds.push(...((data === null || data === void 0 ? void 0 : data.map((u) => u.user_id)) || []));
    }
    return userIds;
});
/** ----------------------------
 * 1. Batch Notification
 * ---------------------------- */
const sendBatchNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const batchId = parseInt(req.params.batchId, 10);
        const { title, content, category = 'general', is_header = false } = req.body;
        if (isNaN(batchId))
            return res.status(400).json({ message: "Invalid 'batchId'" });
        if (!title || !content)
            return res.status(400).json({ message: "Missing 'title' or 'content'" });
        const valid = ['notice', 'fees', 'reminder', 'general', 'Hosteller'];
        if (!valid.includes(category))
            return res.status(400).json({ message: `Invalid category. Must be one of: ${valid.join(', ')}` });
        // Handle optional image upload
        let imageUrl;
        const files = req.files;
        if ((_a = files === null || files === void 0 ? void 0 : files.image) === null || _a === void 0 ? void 0 : _a[0]) {
            imageUrl = yield storageService.uploadImage(files.image[0], 'notifications');
        }
        const count = yield notificationService.notifyBatch(batchId, title, content, category, is_header, imageUrl);
        res.status(200).json({
            message: `Notification sent to batch ${batchId}`,
            usersNotified: count,
            image_url: imageUrl
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
});
exports.sendBatchNotification = sendBatchNotification;
/** ----------------------------
 * 2. Global Notification
 * ---------------------------- */
const sendGlobalNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, content, category = 'general', is_header = false } = req.body;
        if (!title || !content)
            return res.status(400).json({ message: "Missing 'title' or 'content'" });
        const valid = ['notice', 'fees', 'reminder', 'general', 'Hosteller'];
        if (!valid.includes(category))
            return res.status(400).json({ message: `Invalid category. Must be one of: ${valid.join(', ')}` });
        // Handle optional image upload
        let imageUrl;
        const files = req.files;
        if ((_a = files === null || files === void 0 ? void 0 : files.image) === null || _a === void 0 ? void 0 : _a[0]) {
            imageUrl = yield storageService.uploadImage(files.image[0], 'notifications');
        }
        const count = yield notificationService.notifyAllUsers(title, content, category, is_header, imageUrl);
        res.status(200).json({
            message: 'Global notification sent',
            usersNotified: count,
            image_url: imageUrl
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
});
exports.sendGlobalNotification = sendGlobalNotification;
/** ----------------------------
 * 3. User Notification
 * ---------------------------- */
const sendUserNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { title, content, category = 'general', is_header = false } = req.body;
        if (!title || !content)
            return res.status(400).json({ message: "Missing 'title' or 'content'" });
        let recipientIds = [];
        const files = req.files;
        // Case 1: CSV file upload
        if ((_a = files === null || files === void 0 ? void 0 : files.recipients_file) === null || _a === void 0 ? void 0 : _a[0]) {
            const csvData = files.recipients_file[0].buffer.toString('utf-8');
            const rows = (0, sync_1.parse)(csvData, { skip_empty_lines: true });
            const identifiers = rows.flat();
            recipientIds = yield getUserIdsFromContacts(identifiers);
        }
        // Case 2: JSON body
        else if (req.body.recipient_ids) {
            recipientIds = yield getUserIdsFromContacts(req.body.recipient_ids);
        }
        else {
            return res.status(400).json({ message: 'Must provide recipient_ids or CSV file' });
        }
        if (!recipientIds.length)
            return res.status(404).json({ message: 'No matching users found' });
        // Handle optional image upload
        let imageUrl;
        if ((_b = files === null || files === void 0 ? void 0 : files.image) === null || _b === void 0 ? void 0 : _b[0]) {
            imageUrl = yield storageService.uploadImage(files.image[0], 'notifications');
        }
        const count = yield notificationService.sendNotificationToUsers(title, content, category, is_header, recipientIds, imageUrl);
        res.status(200).json({
            message: 'Notification sent',
            usersNotified: count,
            image_url: imageUrl
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
});
exports.sendUserNotification = sendUserNotification;
/** ----------------------------
 * 4. Parent Notification
 * ---------------------------- */
const sendParentNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, content, category = 'general', is_header = false } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: "Missing 'title' or 'content'" });
        }
        const valid = ['notice', 'fees', 'reminder', 'general', 'Hosteller'];
        if (!valid.includes(category)) {
            return res.status(400).json({
                message: `Invalid category. Must be one of: ${valid.join(', ')}`
            });
        }
        // Handle optional image upload
        let imageUrl;
        const files = req.files;
        if ((_a = files === null || files === void 0 ? void 0 : files.image) === null || _a === void 0 ? void 0 : _a[0]) {
            imageUrl = yield storageService.uploadImage(files.image[0], 'notifications');
        }
        const count = yield notificationService.notifyAllParents(title, content, category, is_header, imageUrl);
        if (count === 0) {
            return res.status(404).json({ message: 'No parents found' });
        }
        res.status(200).json({
            message: 'Notification sent to all parents',
            usersNotified: count,
            image_url: imageUrl
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Internal error', error: err.message });
    }
});
exports.sendParentNotification = sendParentNotification;
// Middleware for CSV upload
exports.uploadCsvMiddleware = upload.single('file');
// Middleware for image + CSV upload (use this for all notification endpoints)
exports.uploadNotificationFiles = upload.fields([
    { name: 'recipients_file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
]);
