import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { bucket } from "../config/google-cloud-storage";

// ✅ SANITIZER for file names
function sanitizeFileName(originalName: string) {
    const extIndex = originalName.lastIndexOf(".");
    const ext = extIndex !== -1 ? originalName.slice(extIndex) : "";
    const base = extIndex !== -1 ? originalName.slice(0, extIndex) : originalName;
    const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "_");
    return safeBase + ext;
}

// ✅ GENERATE SIGNED URL for documents
async function generateSignedUrl(gcsPath: string) {
    const [url] = await bucket.file(gcsPath).getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days for job documents
    });
    return url;
}

// ✅ UPLOAD JOB DOCUMENT to GCS
async function uploadJobDocument(file: Express.Multer.File, jobId: string) {
    const sanitizedName = sanitizeFileName(file.originalname);
    const gcsFileName = `job-documents/${jobId}/${Date.now()}_${sanitizedName}`;

    // Upload to Google Cloud Storage
    await bucket.upload(file.path, {
        destination: gcsFileName,
        resumable: false,
        metadata: {
            contentType: file.mimetype,
        },
    });

    // Generate signed URL
    const downloadUrl = await generateSignedUrl(gcsFileName);

    return {
        name: file.originalname,
        gcs_path: gcsFileName,
        url: downloadUrl,
    };
}

// ============================================
// 🔥 ADMIN ENDPOINTS - JOB MANAGEMENT
// ============================================

// ✅ CREATE JOB (with actual file uploads)
export const createJob = async (req: Request, res: Response) => {
    try {
        const {
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
            aboutRole,
            additionalInformation,
            requiredSkills = [],
            minimumCGPA,
            preferredQualifications = [],
        } = req.body;

        // ✅ Validate required fields
        if (!company || !title || !location || !type || !mode || !batch_id || !category_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: company, title, location, type, mode, batch_id, and category_id are required"
            });
        }

        // ✅ Insert into main jobs table
        const { data: job, error: jobError } = await supabase
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

        if (jobError) throw new Error(jobError.message);

        const jobId = job.id;

        // ✅ Insert description
        if (aboutRole || additionalInformation) {
            const { error: descError } = await supabase
                .from("job_descriptions")
                .insert({
                    job_id: jobId,
                    about_role: aboutRole || "",
                    additional_information: additionalInformation || "No additional information added for this job profile."
                });

            if (descError) throw new Error(descError.message);
        }

        // ✅ Insert required skills
        if (requiredSkills.length > 0) {
            const { error: skillsError } = await supabase
                .from("job_required_skills")
                .insert(
                    requiredSkills.map((skill: string) => ({
                        job_id: jobId,
                        skill_name: skill
                    }))
                );

            if (skillsError) throw new Error(skillsError.message);
        }

        // ✅ Insert eligibility
        if (minimumCGPA || preferredQualifications.length > 0) {
            const { error: eligibilityError } = await supabase
                .from("job_eligibility")
                .insert({
                    job_id: jobId,
                    minimum_cgpa: minimumCGPA || null,
                    preferred_qualifications: preferredQualifications
                });

            if (eligibilityError) throw new Error(eligibilityError.message);
        }

        // ✅ UPLOAD DOCUMENTS (if any files are attached)
        const uploadedDocs = [];
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            for (const file of req.files as Express.Multer.File[]) {
                const docData = await uploadJobDocument(file, jobId);
                uploadedDocs.push(docData);
            }

            // ✅ Insert uploaded documents into DB
            if (uploadedDocs.length > 0) {
                const { error: docsError } = await supabase
                    .from("job_documents")
                    .insert(
                        uploadedDocs.map((doc) => ({
                            job_id: jobId,
                            name: doc.name,
                            gcs_path: doc.gcs_path,
                            url: doc.url
                        }))
                    );

                if (docsError) throw new Error(docsError.message);
            }
        }

        return res.status(201).json({
            success: true,
            message: "Job created successfully",
            jobId,
            uploadedDocuments: uploadedDocs.length
        });

    } catch (error) {
        const err = error as Error;
        console.error("Create job error:", err.message);

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to create job"
        });
    }
};

// ✅ GET ALL JOBS (Admin Dashboard)
export const getAllJobsAdmin = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
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
                job_categories(name),
                batches(year)
            `)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        const transformedJobs = data.map((job: any) => ({
            id: job.id,
            company: job.company,
            title: job.title,
            location: job.location,
            type: job.type,
            mode: job.mode,
            package: `${job.package_min_lpa}–${job.package_max_lpa} LPA`,
            status: job.status,
            category: job.job_categories?.name || 'N/A',
            batch: job.batches?.year || 'N/A',
            createdAt: job.created_at
        }));

        return res.status(200).json({
            success: true,
            data: transformedJobs
        });

    } catch (error) {
        const err = error as Error;
        console.error("Get all jobs admin error:", err.message);

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch jobs"
        });
    }
};

// ✅ GET JOB BY ID (with documents)
export const getJobById = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        const { data, error } = await supabase
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

        if (error) throw new Error(error.message);

        // ✅ Refresh signed URLs for documents
        const documentsWithUrls = await Promise.all(
            (data.job_documents || []).map(async (doc: any) => {
                const freshUrl = doc.gcs_path
                    ? await generateSignedUrl(doc.gcs_path)
                    : doc.url;

                return {
                    name: doc.name,
                    url: freshUrl
                };
            })
        );

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
                    aboutRole: data.job_descriptions?.[0]?.about_role || 'No description available.',
                    additionalInformation: data.job_descriptions?.[0]?.additional_information || 'No additional information added for this job profile.'
                },
                attachedDocuments: documentsWithUrls,
                eligibilityCriteria: {
                    requiredSkills: data.job_required_skills?.map((skill: any) => skill.skill_name) || [],
                    academicRequirements: {
                        minimumCGPA: data.job_eligibility?.[0]?.minimum_cgpa
                            ? `${data.job_eligibility[0].minimum_cgpa}/10`
                            : 'N/A',
                        preferredQualifications: data.job_eligibility?.[0]?.preferred_qualifications || []
                    }
                }
            }
        };

        return res.status(200).json(response);

    } catch (error) {
        const err = error as Error;
        console.error("Get job error:", err.message);

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch job"
        });
    }
};

// ============================================
// 🔥 ADMIN ENDPOINTS - APPLICATION TRACKING
// ============================================



// ✅ GET ALL APPLICATIONS FOR A SPECIFIC JOB (Admin sees who applied)
export const getJobApplications = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        const { data, error } = await supabase
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

        if (error) throw new Error(error.message);

        const applications = data.map((app: any) => ({
            id: app.id,
            userId: app.user_id,
            studentName: app.users?.full_name || 'N/A',
            studentEmail: app.users?.email || 'N/A',
            resumeUrl: app.resume_url,
            coverLetter: app.cover_letter,
            status: app.status,
            appliedAt: app.created_at,
            lastUpdated: app.last_updated
        }));

        return res.status(200).json({
            success: true,
            data: applications,
            total: applications.length
        });

    } catch (error) {
        const err = error as Error;
        console.error("Get job applications error:", err.message);

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to fetch applications"
        });
    }
};

// ✅ UPDATE APPLICATION STATUS (Admin moves student: Applied → Interview → Selected/Rejected)
export const updateApplicationStatus = async (req: Request, res: Response) => {
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

        const { error } = await supabase
            .from('job_applications')
            .update({
                status,
                last_updated: new Date().toISOString()
            })
            .eq('id', applicationId);

        if (error) throw new Error(error.message);

        return res.status(200).json({
            success: true,
            message: `Application status updated to ${status}`
        });

    } catch (error) {
        const err = error as Error;
        console.error("Update application status error:", err.message);

        return res.status(500).json({
            success: false,
            message: err.message || "Failed to update application status"
        });
    }
};


