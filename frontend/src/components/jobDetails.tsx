// src/components/JobDetails.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './jobDetails.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface JobDetails {
    id: string;
    company: string;
    title: string;
    location: string;
    mode: string;
    type: string;
    package: string;
    description: {
        aboutRole: string;
        additionalInformation: string;
    };
    attachedDocuments: Array<{
        name: string;
        url: string;
    }>;
    eligibilityCriteria: {
        requiredSkills: string[][];
        academicRequirements: {
            minimumCGPA: string;
            preferredQualifications: string[];
        };
    };
}

const JobDetails: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [job, setJob] = useState<JobDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchJobDetails();
    }, [jobId]);

    const fetchJobDetails = async () => {
        try {
            setLoading(true);
            setError('');

            const { data } = await axios.get(
                `${API_BASE_URL}/api/jobs/admin/jobs/${jobId}`
            );

            console.log('Job details response:', data);
            setJob(data.data);
        } catch (err: any) {
            console.error('Error fetching job details:', err);
            setError(err.response?.data?.message || 'Failed to load job details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="job-details-container">
                <div className="loading-spinner">Loading job details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="job-details-container">
                <div className="error-message">{error}</div>
                <button onClick={() => navigate('/admin/jobs')} className="back-btn">
                    ← Back to Jobs
                </button>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="job-details-container">
                <div className="error-message">Job not found</div>
                <button onClick={() => navigate('/admin/jobs')} className="back-btn">
                    ← Back to Jobs
                </button>
            </div>
        );
    }

    return (
        <div className="job-details-container">
            <div className="header-section">
                <button onClick={() => navigate('/admin/jobs')} className="back-btn">
                    ← Back to Jobs
                </button>
                <div className="header-actions">
                    <button
                        onClick={() => navigate(`/admin/jobs/${jobId}/applications`)}
                        className="applications-btn"
                    >
                        👥 View Applications
                    </button>
                    <button
                        onClick={() => navigate(`/admin/jobs/${jobId}/edit`)}
                        className="edit-btn"
                    >
                        ✏️ Edit Job
                    </button>
                </div>
            </div>

            <div className="job-header">
                <div className="company-logo">
                    {job.company.charAt(0).toUpperCase()}
                </div>
                <div className="job-title-section">
                    <h1>{job.title}</h1>
                    <h2>{job.company}</h2>
                </div>
            </div>

            <div className="job-info-grid">
                <div className="info-card">
                    <span className="info-label">📍 Location</span>
                    <span className="info-value">{job.location}</span>
                </div>
                <div className="info-card">
                    <span className="info-label">💼 Job Type</span>
                    <span className="info-value">{job.type}</span>
                </div>
                <div className="info-card">
                    <span className="info-label">🏢 Work Mode</span>
                    <span className="info-value">{job.mode}</span>
                </div>
                <div className="info-card">
                    <span className="info-label">💰 Package</span>
                    <span className="info-value">{job.package}</span>
                </div>
            </div>

            <div className="content-section">
                <div className="section">
                    <h3>About the Role</h3>
                    <p>{job.description.aboutRole}</p>
                </div>

                {job.description.additionalInformation !== 'No additional information added for this job profile.' && (
                    <div className="section">
                        <h3>Additional Information</h3>
                        <p>{job.description.additionalInformation}</p>
                    </div>
                )}

                <div className="section">
                    <h3>Eligibility Criteria</h3>

                    {job.eligibilityCriteria.requiredSkills.length > 0 && (
                        <div className="subsection">
                            <h4>Required Skills</h4>
                            <div className="skills-container">
                                {job.eligibilityCriteria.requiredSkills.flat().map((skill, index) => (
                                    <span key={index} className="skill-badge">{skill}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="subsection">
                        <h4>Academic Requirements</h4>
                        <p><strong>Minimum CGPA:</strong> {job.eligibilityCriteria.academicRequirements.minimumCGPA}</p>

                        {job.eligibilityCriteria.academicRequirements.preferredQualifications.length > 0 && (
                            <>
                                <p><strong>Preferred Qualifications:</strong></p>
                                <ul>
                                    {job.eligibilityCriteria.academicRequirements.preferredQualifications.map((qual, index) => (
                                        <li key={index}>{qual}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>

                {job.attachedDocuments.length > 0 && (
                    <div className="section">
                        <h3>Attached Documents</h3>
                        <div className="documents-list">
                            {job.attachedDocuments.map((doc, index) => (
                                <a
                                    key={index}
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="document-link"
                                >
                                    📄 {doc.name}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobDetails;