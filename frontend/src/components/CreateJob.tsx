// CreateJob.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './createJob.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface DropdownOptions {
    categories: Array<{ id: number; name: string }>;
    batches: Array<{
        id: number;
        batch_name: string;
        graduation_year: string;
    }>;
    cities: Array<{ id: number; name: string }>;
    jobTypes: string[];
    workModes: string[];
    jobStatuses: string[];
}

const CreateJob: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [options, setOptions] = useState<DropdownOptions | null>(null);
    const [documents, setDocuments] = useState<File[]>([]);

    // Form state
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
    }, []);

    const fetchDropdownOptions = async () => {
        try {
            console.log('Fetching dropdown options from individual endpoints...');

            // Fetch all data in parallel using individual endpoints
            const [
                categoriesRes,
                batchesRes,
                citiesRes,
                jobTypesRes,
                workModesRes,
                jobStatusesRes
            ] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/jobs/categories`),
                axios.get(`${API_BASE_URL}/api/jobs/batches`),
                axios.get(`${API_BASE_URL}/api/jobs/cities`),
                axios.get(`${API_BASE_URL}/api/jobs/job-types`),
                axios.get(`${API_BASE_URL}/api/jobs/work-modes`),
                axios.get(`${API_BASE_URL}/api/jobs/job-statuses`)
            ]);

            console.log('Categories:', categoriesRes.data);
            console.log('Batches:', batchesRes.data);
            console.log('Cities:', citiesRes.data);
            console.log('Job Types:', jobTypesRes.data);
            console.log('Work Modes:', workModesRes.data);
            console.log('Job Statuses:', jobStatusesRes.data);

            setOptions({
                categories: categoriesRes.data.data || [],
                batches: batchesRes.data.batches || [], // getAllBatches returns "batches" not "data"
                cities: citiesRes.data.data || [],
                jobTypes: jobTypesRes.data.data || [],
                workModes: workModesRes.data.data || [],
                jobStatuses: jobStatusesRes.data.data || []
            });

            console.log('✅ All dropdown options loaded successfully');
        } catch (err: any) {
            console.error('Error fetching dropdown options:', err);
            console.error('Error response:', err.response?.data);
            alert(`Failed to load form options: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setDocuments(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const submitData = new FormData();

            // Add form fields
            Object.entries(formData).forEach(([key, value]) => {

                // FIXED: requiredSkills & preferredQualifications → proper Postgres text[] handling
                if (key === "requiredSkills" || key === "preferredQualifications") {

                    // Convert comma-separated string → array
                    const array = value
                        .split(',')
                        .map((item: string) => item.trim())
                        .filter(Boolean);

                    // Append as multiple fields: requiredSkills[] = "React"
                    array.forEach((item) => {
                        submitData.append(`${key}[]`, item);
                    });

                } else {
                    // Normal fields
                    submitData.append(key, value);
                }
            });

            // Add documents
            documents.forEach((file) => {
                submitData.append("documents", file);
            });

            await axios.post(`${API_BASE_URL}/api/jobs/admin/jobs`, submitData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            alert("✅ Job created successfully!");
            navigate("/admin/jobs");

        } catch (err) {
            console.error("Error creating job:", err);
            alert("❌ Failed to create job");
        } finally {
            setLoading(false);
        }
    };


    if (!options) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className="create-job-container">
            <h1>Create New Job</h1>

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

                    <div className="form-group">
                        <label>Upload Documents (PDF, DOC, DOCX - Max 5 files)</label>
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="file-input"
                        />
                        {documents.length > 0 && (
                            <div className="file-list">
                                <p>Selected files:</p>
                                <ul>
                                    {documents.map((file, index) => (
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
                        {loading ? 'Creating...' : 'Create Job'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateJob;