// src/components/JobDetails.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './jobDetails.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface JobDetailsData {
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

    const [job, setJob] = useState<JobDetailsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchJobDetails = useCallback(async () => {
        if (!jobId) return;

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
    }, [jobId]);

    useEffect(() => {
        fetchJobDetails();
    }, [fetchJobDetails]);

    // ---- UI ----

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
            {/* rest of your JSX unchanged */}
        </div>
    );
};

export default JobDetails;
