import { Storage } from "@google-cloud/storage";
import path from "path";

let gcs: Storage;

if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // ✅ Use credentials from environment variable in production
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    gcs = new Storage({
        projectId: credentials.project_id,
        credentials,
    });
} else {
    // ✅ Local fallback (still uses your JSON file)
    gcs = new Storage({
        keyFilename: path.join(__dirname, "service-account.json"),
    });
}

export const bucket = gcs.bucket("polaris-tech_cloudbuild");
