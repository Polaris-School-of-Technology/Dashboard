// JobApplications.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './jobApplications.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Application {
    id: string;
    userId: string;
    studentName: string;
    studentEmail: string;
    resumeUrl: string | null;
    coverLetter: string | null;
    status: string;
    appliedAt: string;
    lastUpdated: string;
}

const JobApplications: React.FC = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const navigate = useNavigate();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [newStatus, setNewStatus] = useState('');
    const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
    const [downloadError, setDownloadError] = useState('');

    useEffect(() => {
        fetchApplications();
    }, [jobId]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_BASE_URL}/api/jobs/admin/jobs/${jobId}/applications`);
            setApplications(data.data);
            setError('');
        } catch (err) {
            setError('Failed to load applications');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async () => {
        if (!selectedApp || !newStatus) return;

        try {
            await axios.patch(
                `${API_BASE_URL}/api/jobs/admin/applications/${selectedApp.id}/status`,
                { status: newStatus }
            );

            alert(`✅ Status updated to ${newStatus}`);
            setSelectedApp(null);
            setNewStatus('');
            fetchApplications();
        } catch (err) {
            console.error(err);
            alert('❌ Failed to update status');
        }
    };

    const openStatusModal = (app: Application) => {
        setSelectedApp(app);
        setNewStatus(app.status);
    };

    // ✅ Download Applications as CSV
    const downloadCSV = async () => {
        if (applications.length === 0) {
            setDownloadError('No applications to download');
            return;
        }

        setDownloadError('');
        setIsDownloadingCSV(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/api/jobs/admin/jobs/${jobId}/applications/csv`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || `Failed to download: ${response.status} ${response.statusText}`
                );
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'job_applications.csv';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading CSV:', err);
            setDownloadError(err instanceof Error ? err.message : 'Failed to download CSV');
        } finally {
            setIsDownloadingCSV(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Applied':
                return '#4299e1';
            case 'Interview':
                return '#ed8936';
            case 'Selected':
                return '#48bb78';
            case 'Rejected':
                return '#f56565';
            default:
                return '#718096';
        }
    };

    return (
        <div className="applications-container">
            <div className="header">
                <button onClick={() => navigate('/admin/jobs')} className="back-btn">
                    ← Back to Jobs
                </button>
                <h1>Job Applications</h1>
                <button
                    onClick={downloadCSV}
                    disabled={isDownloadingCSV || applications.length === 0}
                    className="download-csv-btn"
                    title="Download applications as CSV file"
                >
                    {isDownloadingCSV ? '⏳ Generating CSV...' : '📥 Download CSV'}
                </button>
            </div>

            {loading && <p className="loading-text">Loading applications...</p>}
            {error && <p className="error">{error}</p>}
            {downloadError && <p className="error">{downloadError}</p>}

            {!loading && applications.length === 0 && (
                <p className="no-data">No applications found for this job.</p>
            )}

            <table className="applications-table">
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Applied At</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {applications.map((app) => (
                        <tr key={app.id}>
                            <td>{app.studentName}</td>
                            <td>{app.studentEmail}</td>
                            <td>
                                <span
                                    className="status-badge"
                                    style={{ backgroundColor: getStatusColor(app.status) }}
                                >
                                    {app.status}
                                </span>
                            </td>
                            <td>{new Date(app.appliedAt).toLocaleString()}</td>
                            <td>{new Date(app.lastUpdated).toLocaleString()}</td>
                            <td>
                                <div className="action-buttons">
                                    {app.resumeUrl && (
                                        <a
                                            href={app.resumeUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="table-btn resume-btn"
                                        >
                                            📄 Resume
                                        </a>
                                    )}
                                    <button
                                        onClick={() => openStatusModal(app)}
                                        className="table-btn status-btn"
                                    >
                                        🔄 Update Status
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Status Update Modal */}
            {selectedApp && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Update Application Status</h3>
                        <p>
                            Student: <strong>{selectedApp.studentName}</strong>
                        </p>
                        <p>
                            Current Status: <strong>{selectedApp.status}</strong>
                        </p>

                        <label>New Status</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                        >
                            <option value="Applied">Applied</option>
                            <option value="Interview">Interview</option>
                            <option value="Selected">Selected</option>
                            <option value="Rejected">Rejected</option>
                        </select>

                        <div className="modal-actions">
                            <button className="save-btn" onClick={handleStatusChange}>
                                Save
                            </button>
                            <button
                                className="cancel-btn"
                                onClick={() => setSelectedApp(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobApplications;
