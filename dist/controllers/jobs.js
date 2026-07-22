"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateJob = exports.getJobFullDetails = exports.getAllDropdownOptions = exports.getJobStatuses = exports.getWorkModes = exports.getJobTypes = exports.getAllBatches = exports.getCities = exports.addCity = exports.viewCategory = exports.createCategory = exports.updateApplicationStatus = exports.getJobApplications = exports.getJobById = exports.getAllJobsAdmin = exports.createJob = void 0;
const supabase_1 = require("../config/supabase");
const google_cloud_storage_1 = require("../config/google-cloud-storage");
// ✅ SANITIZER for file names
function sanitizeFileName(originalName) {
    const extIndex = originalName.lastIndexOf(".");
    const ext = extIndex !== -1 ? originalName.slice(extIndex) : "";
    const base = extIndex !== -1 ? originalName.slice(0, extIndex) : originalName;
    const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "_");
    return safeBase + ext;
}
// ✅ GENERATE SIGNED URL for documents
function generateSignedUrl(gcsPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const [url] = yield google_cloud_storage_1.bucket.file(gcsPath).getSignedUrl({
            action: "read",
            expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days for job documents
        });
        return url;
    });
}
// ✅ UPLOAD JOB DOCUMENT to GCS
function uploadJobDocument(file, jobId) {
    return __awaiter(this, void 0, void 0, function* () {
        const sanitizedName = sanitizeFileName(file.originalname);
        const gcsFileName = `job-documents/${jobId}/${Date.now()}_${sanitizedName}`;
        // Upload to Google Cloud Storage
        yield google_cloud_storage_1.bucket.upload(file.path, {
            destination: gcsFileName,
            resumable: false,
            metadata: {
                contentType: file.mimetype,
            },
        });
        // Generate signed URL
        const downloadUrl = yield generateSignedUrl(gcsFileName);
        return {
            name: file.originalname,
            gcs_path: gcsFileName,
            url: downloadUrl,
        };
    });
}
// ============================================
// 🔥 ADMIN ENDPOINTS - JOB MANAGEMENT
// ============================================
// ✅ CREATE JOB (with actual file uploads)
const createJob = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { company, title, location, type, mode, package_min_lpa, package_max_lpa, status, category_id, batch_id, form_link, aboutRole, additionalInformation, requiredSkills = [], minimumCGPA, preferredQualifications = [], } = req.body;
        // ✅ Validate required fields
        if (!company || !title || !location || !type || !mode || !batch_id || !category_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: company, title, location, type, mode, batch_id, and category_id are required"
            });
        }
        // ✅ Insert into main jobs table
        const { data: job, error: jobError } = yield supabase_1.supabase
            .from("jobs")
            .insert({
            company,
            title,
            location,
            type,
            mode,
            package_min_lpa,
            package_max_lpa,
            status,
            category_id,
            batch_id,
            form_link
        })
            .select()
            .single();
        if (jobError)
            throw new Error(jobError.message);
        const jobId = job.id;
        // ✅ Insert description
        if (aboutRole || additionalInformation) {
            const { error: descError } = yield supabase_1.supabase
                .from("job_descriptions")
                .insert({
                job_id: jobId,
                about_role: aboutRole || "",
                additional_information: additionalInformation || "No additional information added for this job profile."
            });
            if (descError)
                throw new Error(descError.message);
        }
        // ✅ Insert required skills
        if (requiredSkills && requiredSkills.length > 0) {
            const { error: requiredSkillsError } = yield supabase_1.supabase
                .from("job_required_skills")
                .insert({
                job_id: jobId,
                skill_name: requiredSkills, // this is the text[] array
            });
            if (requiredSkillsError) {
                console.error("Error saving required skills:", requiredSkillsError);
                return res.status(500).json({ error: "Failed to save required skills" });
            }
        }
        // ✅ Insert eligibility
        if (minimumCGPA || preferredQualifications.length > 0) {
            const { error: eligibilityError } = yield supabase_1.supabase
                .from("job_eligibility")
                .insert({
                job_id: jobId,
                minimum_cgpa: minimumCGPA || null,
                preferred_qualifications: preferredQualifications
            });
            if (eligibilityError)
                throw new Error(eligibilityError.message);
        }
        // ✅ UPLOAD DOCUMENTS (if any files are attached)
        const uploadedDocs = [];
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files) {
                const docData = yield uploadJobDocument(file, jobId);
                uploadedDocs.push(docData);
            }
            // ✅ Insert uploaded documents into DB
            if (uploadedDocs.length > 0) {
                const { error: docsError } = yield supabase_1.supabase
                    .from("job_documents")
                    .insert(uploadedDocs.map((doc) => ({
                    job_id: jobId,
                    name: doc.name,
                    gcs_path: doc.gcs_path,
                    url: doc.url
                })));
                if (docsError)
                    throw new Error(docsError.message);
            }
        }
        return res.status(201).json({
            success: true,
            message: "Job created successfully",
            jobId,
            uploadedDocuments: uploadedDocs.length
        });
    }
    catch (error) {
        const err = error;
        console.error("Create job error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to create job"
        });
    }
});
exports.createJob = createJob;
// ✅ GET ALL JOBS (Admin Dashboard)
const getAllJobsAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase
            .from('jobs')
            .select(`
                id,
                company,
                title,
                location,
                type,
                mode,
                package_min_lpa,
                package_max_lpa,
                status,
                created_at,
                job_categories!inner(name),
                batches!batch_id(batch_name)
            `)
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(error.message);
        const transformedJobs = data.map((job) => {
            var _a, _b;
            return ({
                id: job.id,
                company: job.company,
                title: job.title,
                location: job.location,
                type: job.type,
                mode: job.mode,
                package: `${job.package_min_lpa}–${job.package_max_lpa} LPA`,
                status: job.status,
                category: ((_a = job.job_categories) === null || _a === void 0 ? void 0 : _a.name) || 'N/A',
                batch: ((_b = job.batches) === null || _b === void 0 ? void 0 : _b.batch_name) || 'N/A',
                createdAt: job.created_at
            });
        });
        return res.status(200).json({
            success: true,
            data: transformedJobs
        });
    }
    catch (error) {
        const err = error;
        console.error("Get all jobs admin error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch jobs"
        });
    }
});
exports.getAllJobsAdmin = getAllJobsAdmin;
// ✅ GET JOB BY ID (with documents)
const getJobById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    try {
        const { jobId } = req.params;
        const { data, error } = yield supabase_1.supabase
            .from('jobs')
            .select(`
                *,
                job_categories!inner(name),
                job_descriptions(*),
                job_documents(*),
                job_eligibility(*),
                job_required_skills(*)
            `)
            .eq('id', jobId)
            .single();
        if (error)
            throw new Error(error.message);
        // ✅ Refresh signed URLs for documents
        const documentsWithUrls = yield Promise.all((data.job_documents || []).map((doc) => __awaiter(void 0, void 0, void 0, function* () {
            const freshUrl = doc.gcs_path
                ? yield generateSignedUrl(doc.gcs_path)
                : doc.url;
            return {
                name: doc.name,
                url: freshUrl
            };
        })));
        const response = {
            success: true,
            data: {
                id: data.id,
                company: data.company,
                title: data.title,
                location: data.location,
                mode: data.mode,
                type: data.type,
                package: `${data.package_min_lpa}–${data.package_max_lpa} LPA`,
                description: {
                    aboutRole: ((_b = (_a = data.job_descriptions) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.about_role) || 'No description available.',
                    additionalInformation: ((_d = (_c = data.job_descriptions) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.additional_information) || 'No additional information added for this job profile.'
                },
                attachedDocuments: documentsWithUrls,
                eligibilityCriteria: {
                    requiredSkills: ((_e = data.job_required_skills) === null || _e === void 0 ? void 0 : _e.map((skill) => skill.skill_name)) || [],
                    academicRequirements: {
                        minimumCGPA: ((_g = (_f = data.job_eligibility) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.minimum_cgpa)
                            ? `${data.job_eligibility[0].minimum_cgpa}/10`
                            : 'N/A',
                        preferredQualifications: ((_j = (_h = data.job_eligibility) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.preferred_qualifications) || []
                    }
                }
            }
        };
        return res.status(200).json(response);
    }
    catch (error) {
        const err = error;
        console.error("Get job error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch job"
        });
    }
});
exports.getJobById = getJobById;
// ============================================
// 🔥 ADMIN ENDPOINTS - APPLICATION TRACKING
// ============================================
// ✅ GET ALL APPLICATIONS FOR A SPECIFIC JOB (Admin sees who applied)
const getJobApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId } = req.params;
        const { data, error } = yield supabase_1.supabase
            .from('job_applications')
            .select(`
                id,
                user_id,
                resume_url,
                cover_letter,
                status,
                created_at,
                last_updated,
                users!inner(id, email, full_name)
            `)
            .eq('job_id', jobId)
            .order('created_at', { ascending: false });
        if (error)
            throw new Error(error.message);
        const applications = data.map((app) => {
            var _a, _b;
            return ({
                id: app.id,
                userId: app.user_id,
                studentName: ((_a = app.users) === null || _a === void 0 ? void 0 : _a.full_name) || 'N/A',
                studentEmail: ((_b = app.users) === null || _b === void 0 ? void 0 : _b.email) || 'N/A',
                resumeUrl: app.resume_url,
                coverLetter: app.cover_letter,
                status: app.status,
                appliedAt: app.created_at,
                lastUpdated: app.last_updated
            });
        });
        return res.status(200).json({
            success: true,
            data: applications,
            total: applications.length
        });
    }
    catch (error) {
        const err = error;
        console.error("Get job applications error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch applications"
        });
    }
});
exports.getJobApplications = getJobApplications;
// ✅ UPDATE APPLICATION STATUS (Admin moves student: Applied → Interview → Selected/Rejected)
const updateApplicationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { applicationId } = req.params;
        const { status } = req.body;
        // Valid statuses: Applied, Interview, Selected, Rejected
        const validStatuses = ['Applied', 'Interview', 'Selected', 'Rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }
        const { error } = yield supabase_1.supabase
            .from('job_applications')
            .update({
            status,
            last_updated: new Date().toISOString()
        })
            .eq('id', applicationId);
        if (error)
            throw new Error(error.message);
        return res.status(200).json({
            success: true,
            message: `Application status updated to ${status}`
        });
    }
    catch (error) {
        const err = error;
        console.error("Update application status error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to update application status"
        });
    }
});
exports.updateApplicationStatus = updateApplicationStatus;
const createCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { category } = req.body;
    if (!category) {
        return res.status(400).json({ message: "Category is required" });
    }
    try {
        const { data, error } = yield supabase_1.supabase
            .from('job_categories')
            .insert({ name: category })
            .select()
            .single();
        if (error) {
            throw error;
        }
        return res.status(201).json({
            success: true,
            message: "Category added successfully",
            data,
        });
    }
    catch (error) {
        const err = error;
        console.error("Error inserting category:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to add category",
        });
    }
});
exports.createCategory = createCategory;
const viewCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase
            .from("job_categories").select("*");
        if (error) {
            throw error;
        }
        return res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        const err = error;
        console.error("Error fetching  category:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to view category",
        });
    }
});
exports.viewCategory = viewCategory;
const addCity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { city } = req.body;
    try {
        const { data, error } = yield supabase_1.supabase
            .from('cities')
            .insert({ city_name: city })
            .select()
            .single();
        if (error) {
            throw error;
        }
        return res.status(201).json({
            success: true,
            message: "City added successfully",
            data,
        });
    }
    catch (error) {
        const err = error;
        console.error("Error inserting city:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to add city",
        });
    }
});
exports.addCity = addCity;
const getCities = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🔥 getCities CALLED");
    try {
        console.log("📍 Fetching from cities table...");
        const { data, error } = yield supabase_1.supabase
            .from('cities')
            .select("id, city_name")
            .order("city_name", { ascending: true });
        console.log("Raw Supabase response:", { data, error });
        if (error) {
            console.error("❌ Supabase error:", error);
            throw error;
        }
        console.log("✅ Data fetched successfully:", data);
        // Map city_name to name for consistency with frontend
        const mappedCities = data.map(city => ({
            id: city.id,
            name: city.city_name
        }));
        console.log("✅ Mapped cities:", mappedCities);
        return res.status(200).json({
            success: true,
            data: mappedCities
        });
    }
    catch (error) {
        const err = error;
        console.error("❌ Error fetching cities:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch cities",
        });
    }
});
exports.getCities = getCities;
const getAllBatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase
            .from("batches")
            .select("*");
        if (error)
            throw error;
        res.status(200).json({
            success: true,
            batches: data
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.getAllBatches = getAllBatches;
const getJobTypes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const jobTypes = ['Fulltime', 'Internship', 'Part Time', 'Contract'];
        res.status(200).json({
            success: true,
            data: jobTypes
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch job types"
        });
    }
});
exports.getJobTypes = getJobTypes;
const getWorkModes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workModes = ['Onsite', 'Hybrid', 'Remote'];
        res.status(200).json({
            success: true,
            data: workModes
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch work modes"
        });
    }
});
exports.getWorkModes = getWorkModes;
const getJobStatuses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const jobStatuses = ['Campus', 'External'];
        res.status(200).json({
            success: true,
            data: jobStatuses
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch job statuses"
        });
    }
});
exports.getJobStatuses = getJobStatuses;
const getAllDropdownOptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Fetching categories...");
        const { data: categories, error: catError } = yield supabase_1.supabase
            .from("job_categories")
            .select("id, name")
            .order("name", { ascending: true });
        if (catError) {
            console.error("Category error:", catError);
            throw catError;
        }
        console.log("Categories fetched successfully:", categories === null || categories === void 0 ? void 0 : categories.length);
        console.log("Fetching batches...");
        const { data: batches, error: batchError } = yield supabase_1.supabase
            .from("batches")
            .select("id, batch_name, graduation_year"); // Removed .order() since year column doesn't exist
        if (batchError) {
            console.error("Batch error:", batchError);
            throw batchError;
        }
        console.log("Batches fetched successfully:", batches === null || batches === void 0 ? void 0 : batches.length);
        console.log("Fetching cities...");
        const { data: cities, error: cityError } = yield supabase_1.supabase
            .from("cities")
            .select("*")
            .order("name", { ascending: true });
        if (cityError) {
            console.error("City error:", cityError);
            throw cityError;
        }
        console.log("Cities fetched successfully:", cities === null || cities === void 0 ? void 0 : cities.length);
        const jobTypes = ['Fulltime', 'Internship', 'Part Time', 'Contract'];
        const workModes = ['Onsite', 'Hybrid', 'Remote'];
        const jobStatuses = ['Campus', 'External'];
        console.log("All dropdown options prepared successfully");
        res.status(200).json({
            success: true,
            data: {
                categories,
                batches,
                cities,
                jobTypes,
                workModes,
                jobStatuses
            }
        });
    }
    catch (err) {
        console.error("ERROR in getAllDropdownOptions:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dropdown options",
            error: err instanceof Error ? err.message : String(err)
        });
    }
});
exports.getAllDropdownOptions = getAllDropdownOptions;
// Add these new controllers to your jobController.ts file
// ✅ GET JOB FULL DETAILS (Everything from create job form)
const getJobFullDetails = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        const { jobId } = req.params;
        console.log(`📍 Fetching full details for jobId: ${jobId}`);
        // Fetch job with all related data
        const { data, error } = yield supabase_1.supabase
            .from('jobs')
            .select(`
                *,
                job_categories!inner(id, name),
                batches!batch_id(id, batch_name),
                job_descriptions(*),
                job_documents(*),
                job_eligibility(*),
                job_required_skills(*)
            `)
            .eq('id', jobId)
            .single();
        if (error) {
            console.error('Supabase error:', error);
            throw new Error(error.message);
        }
        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }
        console.log('✅ Job data fetched successfully');
        // ✅ Refresh signed URLs for documents
        const documentsWithUrls = yield Promise.all((data.job_documents || []).map((doc) => __awaiter(void 0, void 0, void 0, function* () {
            const freshUrl = doc.gcs_path
                ? yield generateSignedUrl(doc.gcs_path)
                : doc.url;
            return {
                id: doc.id,
                name: doc.name,
                url: freshUrl,
                gcs_path: doc.gcs_path
            };
        })));
        // Extract required skills (it's stored as text[] in single row)
        const requiredSkillsArray = ((_b = (_a = data.job_required_skills) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.skill_name) || [];
        // Extract preferred qualifications (text[] in single row)
        const preferredQualificationsArray = ((_d = (_c = data.job_eligibility) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.preferred_qualifications) || [];
        // Build complete response matching the create job form structure
        const response = {
            success: true,
            data: {
                // Basic Information
                id: data.id,
                company: data.company,
                title: data.title,
                location: data.location,
                category_id: data.category_id,
                category_name: ((_e = data.job_categories) === null || _e === void 0 ? void 0 : _e.name) || '',
                type: data.type,
                mode: data.mode,
                package_min_lpa: data.package_min_lpa,
                package_max_lpa: data.package_max_lpa,
                status: data.status,
                batch_id: data.batch_id,
                batch_name: ((_f = data.batches) === null || _f === void 0 ? void 0 : _f.batch_name) || '',
                graduation_year: ((_g = data.batches) === null || _g === void 0 ? void 0 : _g.graduation_year) || '',
                form_link: data.form_link || '',
                // Job Description
                aboutRole: ((_j = (_h = data.job_descriptions) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.about_role) || '',
                additionalInformation: ((_l = (_k = data.job_descriptions) === null || _k === void 0 ? void 0 : _k[0]) === null || _l === void 0 ? void 0 : _l.additional_information) || '',
                // Eligibility Criteria
                requiredSkills: requiredSkillsArray,
                minimumCGPA: ((_o = (_m = data.job_eligibility) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o.minimum_cgpa) || '',
                preferredQualifications: preferredQualificationsArray,
                // Documents
                attachedDocuments: documentsWithUrls,
                // Metadata
                created_at: data.created_at,
                updated_at: data.updated_at
            }
        };
        return res.status(200).json(response);
    }
    catch (error) {
        const err = error;
        console.error("Get job full details error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch job details"
        });
    }
});
exports.getJobFullDetails = getJobFullDetails;
// ✅ EDIT/UPDATE JOB (with document handling)
const updateJob = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId } = req.params;
        const { company, title, location, type, mode, package_min_lpa, package_max_lpa, status, category_id, batch_id, form_link, aboutRole, additionalInformation, requiredSkills = [], minimumCGPA, preferredQualifications = [], deletedDocumentIds = [] // Array of document IDs to delete
         } = req.body;
        console.log(`📝 Updating job ${jobId}`);
        // ✅ Update main jobs table
        const { error: jobError } = yield supabase_1.supabase
            .from("jobs")
            .update({
            company,
            title,
            location,
            type,
            mode,
            package_min_lpa,
            package_max_lpa,
            status,
            category_id,
            batch_id,
            form_link,
            updated_at: new Date().toISOString()
        })
            .eq('id', jobId);
        if (jobError)
            throw new Error(jobError.message);
        // ✅ Update job description
        // First check if description exists
        const { data: existingDesc } = yield supabase_1.supabase
            .from("job_descriptions")
            .select("id")
            .eq("job_id", jobId)
            .single();
        if (existingDesc) {
            // Update existing description
            const { error: descUpdateError } = yield supabase_1.supabase
                .from("job_descriptions")
                .update({
                about_role: aboutRole || "",
                additional_information: additionalInformation || "No additional information added for this job profile."
            })
                .eq("job_id", jobId);
            if (descUpdateError)
                throw new Error(descUpdateError.message);
        }
        else {
            // Insert new description
            const { error: descInsertError } = yield supabase_1.supabase
                .from("job_descriptions")
                .insert({
                job_id: jobId,
                about_role: aboutRole || "",
                additional_information: additionalInformation || "No additional information added for this job profile."
            });
            if (descInsertError)
                throw new Error(descInsertError.message);
        }
        // ✅ Update required skills
        // Delete existing skills
        yield supabase_1.supabase
            .from("job_required_skills")
            .delete()
            .eq("job_id", jobId);
        // Insert new skills (if any)
        if (requiredSkills && requiredSkills.length > 0) {
            const { error: skillsError } = yield supabase_1.supabase
                .from("job_required_skills")
                .insert({
                job_id: jobId,
                skill_name: requiredSkills
            });
            if (skillsError)
                throw new Error(skillsError.message);
        }
        // ✅ Update eligibility
        const { data: existingEligibility } = yield supabase_1.supabase
            .from("job_eligibility")
            .select("id")
            .eq("job_id", jobId)
            .single();
        if (existingEligibility) {
            // Update existing eligibility
            const { error: eligibilityUpdateError } = yield supabase_1.supabase
                .from("job_eligibility")
                .update({
                minimum_cgpa: minimumCGPA || null,
                preferred_qualifications: preferredQualifications
            })
                .eq("job_id", jobId);
            if (eligibilityUpdateError)
                throw new Error(eligibilityUpdateError.message);
        }
        else {
            // Insert new eligibility
            const { error: eligibilityInsertError } = yield supabase_1.supabase
                .from("job_eligibility")
                .insert({
                job_id: jobId,
                minimum_cgpa: minimumCGPA || null,
                preferred_qualifications: preferredQualifications
            });
            if (eligibilityInsertError)
                throw new Error(eligibilityInsertError.message);
        }
        // ✅ Handle document deletions
        if (deletedDocumentIds && deletedDocumentIds.length > 0) {
            // Get document details before deletion
            const { data: docsToDelete } = yield supabase_1.supabase
                .from("job_documents")
                .select("gcs_path")
                .in("id", deletedDocumentIds);
            // Delete from GCS
            if (docsToDelete) {
                for (const doc of docsToDelete) {
                    if (doc.gcs_path) {
                        try {
                            yield google_cloud_storage_1.bucket.file(doc.gcs_path).delete();
                        }
                        catch (err) {
                            console.error(`Failed to delete file from GCS: ${doc.gcs_path}`, err);
                        }
                    }
                }
            }
            // Delete from database
            yield supabase_1.supabase
                .from("job_documents")
                .delete()
                .in("id", deletedDocumentIds);
        }
        // ✅ Upload new documents (if any)
        const uploadedDocs = [];
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files) {
                const docData = yield uploadJobDocument(file, jobId);
                uploadedDocs.push(docData);
            }
            // Insert new documents into DB
            if (uploadedDocs.length > 0) {
                const { error: docsError } = yield supabase_1.supabase
                    .from("job_documents")
                    .insert(uploadedDocs.map((doc) => ({
                    job_id: jobId,
                    name: doc.name,
                    gcs_path: doc.gcs_path,
                    url: doc.url
                })));
                if (docsError)
                    throw new Error(docsError.message);
            }
        }
        return res.status(200).json({
            success: true,
            message: "Job updated successfully",
            jobId,
            newDocumentsUploaded: uploadedDocs.length,
            documentsDeleted: deletedDocumentIds.length
        });
    }
    catch (error) {
        const err = error;
        console.error("Update job error:", err.message);
        return res.status(500).json({
            success: false,
            message: err.message || "Failed to update job"
        });
    }
});
exports.updateJob = updateJob;
