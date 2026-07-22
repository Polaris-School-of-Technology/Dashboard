"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucket = void 0;
const storage_1 = require("@google-cloud/storage");
const path_1 = __importDefault(require("path"));
let gcs;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // ✅ Use credentials from environment variable in production
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    gcs = new storage_1.Storage({
        projectId: credentials.project_id,
        credentials,
    });
}
else {
    // ✅ Local fallback (still uses your JSON file)
    gcs = new storage_1.Storage({
        keyFilename: path_1.default.join(__dirname, "service-account.json"),
    });
}
exports.bucket = gcs.bucket("polaris-tech_cloudbuild");
