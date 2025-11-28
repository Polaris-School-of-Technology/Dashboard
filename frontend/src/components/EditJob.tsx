// src/components/EditJob.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import './createJob.css'; // Reuse the same CSS

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface DropdownOptions {
    categories: Array<{ id: number; name: string }>;
    batches: Array<{ id: number; batch_name: string; graduation_year: string }>;
    cities: Array<{ id: number; name: string }>;
    jobTypes: string[];
    workModes: string[];
    jobStatuses: string[];
}

interface ExistingDocument {
    id: string;
    name: string;
    url: string;
}

const EditJob: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetchingJob, setFetchingJob] = useState(true);
    const [options, setOptions] = useState<DropdownOptions | null>(null);
    const [newDocuments, setNewDocuments] = useState<File[]>([]);
    const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([]);
    const [documentsToDelete, setDocumentsToDelete] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        company: '',
        title: '',
        location: '',
        type: '',
        mode: '',
        package_min_lpa: '',
        package_max_lpa: '',
        status: '',
        category_id: '',
        batch_id: '',
        form_link: '',
        aboutRole: '',
        additionalInformation: '',
        requiredSkills: '',
        minimumCGPA: '',
        preferredQualifications: ''
    });

    useEffect(() => {
        fetchDropdownOptions();
        fetchJobDetails();
    }, [jobId]);

    const fetchDropdownOptions = async () => {
        try {
            const [categoriesRes, batchesRes, citiesRes, jobTypesRes, workModesRes, jobStatusesRes] =
                await Promise.all([
                    axios.get(`${API_BASE_URL}/api/jobs/categories`),
                    axios.get(`${API_BASE_URL}/api/jobs/batches`),
                    axios.get(`${API_BASE_URL}/api/jobs/cities`),
                    axios.get(`${API_BASE_URL}/api/jobs/job-types`),
                    axios.get(`${API_BASE_URL}/api/jobs/work-modes`),
                    axios.get(`${API_BASE_URL}/api/jobs/job-statuses`)
                ]);

            setOptions({
                categories: categoriesRes.data.data || [],
                batches: batchesRes.data.batches || [],
                cities: citiesRes.data.data || [],
                jobTypes: jobTypesRes.data.data || [],
                workModes: workModesRes.data.data || [],
                jobStatuses: jobStatusesRes.data.data || []
            });
        } catch (err: any) {
            console.error('Error fetching dropdown options:', err);
            alert('Failed to load form options');
        }
    };

    const fetchJobDetails = async () => {
        try {
            setFetchingJob(true);

            // Use the full-details endpoint
            const { data } = await axios.get(
                `${API_BASE_URL}/api/jobs/admin/jobs/${jobId}/full-details`
            );

            const job = data.data;

            // Populate form with existing data
            setFormData({
                company: job.company || '',
                title: job.title || '',
                location: job.location || '',
                type: job.type || '',
                mode: job.mode || '',
                package_min_lpa: job.package_min_lpa || '',
                package_max_lpa: job.package_max_lpa || '',
                status: job.status || '',
                category_id: job.category_id || '',
                batch_id: job.batch_id || '',
                form_link: job.form_link || '',
                aboutRole: job.aboutRole || '',
                additionalInformation: job.additionalInformation || '',
                requiredSkills: Array.isArray(job.requiredSkills)
                    ? job.requiredSkills.join(', ')
                    : '',
                minimumCGPA: job.minimumCGPA || '',
                preferredQualifications: Array.isArray(job.preferredQualifications)
                    ? job.preferredQualifications.join(', ')
                    : ''
            });

            // Set existing documents
            setExistingDocuments(job.attachedDocuments || []);

        } catch (err: any) {
            console.error('Error fetching job details:', err);
            alert('Failed to load job details');
            navigate('/admin/jobs');
        } finally {
            setFetchingJob(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewDocuments(Array.from(e.target.files));
        }
    };

    const handleDeleteExistingDocument = (docId: string) => {
        setDocumentsToDelete([...documentsToDelete, docId]);
        setExistingDocuments(existingDocuments.filter(doc => doc.id !== docId));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const submitData = new FormData();

            // Add form fields
            Object.entries(formData).forEach(([key, value]) => {
                if (key === "requiredSkills" || key === "preferredQualifications") {
                    const array = value.split(',').map((item: string) => item.trim()).filter(Boolean);
                    array.forEach((item) => {
                        submitData.append(`${key}[]`, item);
                    });
                } else {
                    submitData.append(key, value);
                }
            });

            // Add deleted document IDs
            documentsToDelete.forEach(id => {
                submitData.append('deletedDocumentIds[]', id);
            });

            // Add new documents
            newDocuments.forEach((file) => {
                submitData.append("documents", file);
            });

            await axios.put(
                `${API_BASE_URL}/api/jobs/admin/jobs/${jobId}`,
                submitData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            alert("✅ Job updated successfully!");
            navigate("/admin/jobs");

        } catch (err: any) {
            console.error("Error updating job:", err);
            alert("❌ Failed to update job");
        } finally {
            setLoading(false);
        }
    };

    if (fetchingJob || !options) {
        return <div className="loading-container">Loading job details...</div>;
    }

    return (
        <div className="create-job-container">
            <h1>Edit Job</h1>

            <form onSubmit={handleSubmit} className="job-form">
                {/* Basic Information */}
                <div className="form-section">
                    <h2>Basic Information</h2>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Company *</label>
                            <input
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Job Title *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Location *</label>
                            <select
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Location</option>
                                {options.cities.map((city) => (
                                    <option key={city.id} value={city.name}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Category *</label>
                            <select
                                name="category_id"
                                value={formData.category_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Category</option>
                                {options.categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Job Type *</label>
                            <select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Type</option>
                                {options.jobTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Work Mode *</label>
                            <select
                                name="mode"
                                value={formData.mode}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Mode</option>
                                {options.workModes.map((mode) => (
                                    <option key={mode} value={mode}>
                                        {mode}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Min Package (LPA) *</label>
                            <input
                                type="number"
                                name="package_min_lpa"
                                value={formData.package_min_lpa}
                                onChange={handleChange}
                                step="0.1"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Max Package (LPA) *</label>
                            <input
                                type="number"
                                name="package_max_lpa"
                                value={formData.package_max_lpa}
                                onChange={handleChange}
                                step="0.1"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Status *</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Status</option>
                                {options.jobStatuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Batch *</label>
                            <select
                                name="batch_id"
                                value={formData.batch_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Batch</option>
                                {options.batches.map((batch) => (
                                    <option key={batch.id} value={batch.id}>
                                        {batch.batch_name} ({batch.graduation_year})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Application Form Link</label>
                        <input
                            type="url"
                            name="form_link"
                            value={formData.form_link}
                            onChange={handleChange}
                            placeholder="https://forms.google.com/..."
                        />
                    </div>
                </div>

                {/* Job Description */}
                <div className="form-section">
                    <h2>Job Description</h2>

                    <div className="form-group">
                        <label>About Role</label>
                        <textarea
                            name="aboutRole"
                            value={formData.aboutRole}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Describe the role..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Additional Information</label>
                        <textarea
                            name="additionalInformation"
                            value={formData.additionalInformation}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Any additional information..."
                        />
                    </div>
                </div>

                {/* Eligibility */}
                <div className="form-section">
                    <h2>Eligibility Criteria</h2>

                    <div className="form-group">
                        <label>Required Skills (comma-separated)</label>
                        <input
                            type="text"
                            name="requiredSkills"
                            value={formData.requiredSkills}
                            onChange={handleChange}
                            placeholder="React, Node.js, MongoDB"
                        />
                    </div>

                    <div className="form-group">
                        <label>Minimum CGPA</label>
                        <input
                            type="number"
                            name="minimumCGPA"
                            value={formData.minimumCGPA}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            max="10"
                            placeholder="7.5"
                        />
                    </div>

                    <div className="form-group">
                        <label>Preferred Qualifications (comma-separated)</label>
                        <input
                            type="text"
                            name="preferredQualifications"
                            value={formData.preferredQualifications}
                            onChange={handleChange}
                            placeholder="B.Tech CSE, M.Tech"
                        />
                    </div>
                </div>

                {/* Documents */}
                <div className="form-section">
                    <h2>Attachments</h2>

                    {/* Existing Documents */}
                    {existingDocuments.length > 0 && (
                        <div className="form-group">
                            <label>Existing Documents</label>
                            <div className="existing-documents">
                                {existingDocuments.map((doc) => (
                                    <div key={doc.id} className="document-item">
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                            📄 {doc.name}
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteExistingDocument(doc.id)}
                                            className="delete-doc-btn"
                                        >
                                            ✕ Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Upload New Documents */}
                    <div className="form-group">
                        <label>Upload New Documents (PDF, DOC, DOCX - Max 5 files)</label>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        {newDocuments.length > 0 && (
                            <div className="file-list">
                                <p>New files to upload:</p>
                                <ul>
                                    {newDocuments.map((file, index) => (
                                        <li key={index}>{file.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/jobs')}
                        className="cancel-btn"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                    >
                        {loading ? 'Updating...' : 'Update Job'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditJob;