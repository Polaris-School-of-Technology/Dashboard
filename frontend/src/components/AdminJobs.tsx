import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './adminJobs.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Job {
    id: string;
    company: string;
    title: string;
    location: string;
    type: string;
    mode: string;
    package: string;
    status: string;
    category: string;
    batch: string;
    createdAt: string;
}

const AdminJobs: React.FC = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'category' | 'city'>('category');

    // Form states
    const [newCategory, setNewCategory] = useState('');
    const [newCity, setNewCity] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const { data } = await axios.get(`${API_BASE_URL}/api/jobs/admin/jobs`);
            setJobs(data.data);
            setError('');
        } catch (err) {
            setError('Failed to load jobs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) {
            setSubmitMessage('Please enter a category name');
            return;
        }

        try {
            setSubmitLoading(true);
            await axios.post(`${API_BASE_URL}/api/jobs/categories`, {
                category: newCategory
            });
            setSubmitMessage('✅ Category created successfully!');
            setNewCategory('');
            setTimeout(() => setSubmitMessage(''), 3000);
        } catch (err) {
            setSubmitMessage('❌ Failed to create category');
            console.error(err);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateCity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCity.trim()) {
            setSubmitMessage('Please enter a city name');
            return;
        }

        try {
            setSubmitLoading(true);
            await axios.post(`${API_BASE_URL}/api/jobs/cities`, {
                city: newCity
            });
            setSubmitMessage('✅ City added successfully!');
            setNewCity('');
            setTimeout(() => setSubmitMessage(''), 3000);
        } catch (err) {
            setSubmitMessage('❌ Failed to add city');
            console.error(err);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleViewApplications = (jobId: string) => {
        navigate(`/admin/jobs/${jobId}/applications`);
    };

    const handleViewDetails = (jobId: string) => {
        navigate(`/admin/jobs/${jobId}`);
    };

    // 🆕 NEW FUNCTION - Edit Job
    const handleEditJob = (jobId: string) => {
        navigate(`/admin/jobs/${jobId}/edit`);
    };

    return (
        <div className="jobs-container">
            <div className="jobs-header">
                <h1>Job Management Dashboard</h1>
                <div className="top-actions">
                    <button
                        onClick={() => navigate('/admin/jobs/create')}
                        className="create-job-btn"
                    >
                        + Create New Job
                    </button>

                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="settings-btn"
                    >
                        ⚙️ Admin Settings
                    </button>
                </div>
            </div>

            {loading && <p className="loading-text">Loading jobs...</p>}
            {error && <p className="error">{error}</p>}

            <div className="table-scroll">
                <table className="jobs-table">
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Title</th>
                            <th>Location</th>
                            <th>Type</th>
                            <th>Mode</th>
                            <th>Package</th>
                            <th>Status</th>
                            <th>Category</th>
                            <th>Batch</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((job) => (
                            <tr key={job.id}>
                                <td>{job.company}</td>
                                <td>{job.title}</td>
                                <td>{job.location}</td>
                                <td>{job.type}</td>
                                <td>{job.mode}</td>
                                <td>{job.package}</td>
                                <td>
                                    <span className={`badge ${job.status === 'Campus' ? 'badge-campus' : 'badge-external'}`}>
                                        {job.status}
                                    </span>
                                </td>
                                <td>{job.category}</td>
                                <td>{job.batch}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            onClick={() => handleViewDetails(job.id)}
                                            className="icon-btn view-btn"
                                            title="View job details"
                                            aria-label="View job details"
                                        >
                                            📄
                                        </button>
                                        <button
                                            onClick={() => handleEditJob(job.id)}
                                            className="icon-btn edit-btn"
                                            title="Edit job"
                                            aria-label="Edit job"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleViewApplications(job.id)}
                                            className="icon-btn applications-btn"
                                            title="View applications"
                                            aria-label="View applications"
                                        >
                                            👥
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showSettingsModal && (
                <div className="modal" onClick={() => setShowSettingsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Admin Settings</h2>
                            <button
                                className="close-btn"
                                onClick={() => setShowSettingsModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div className="tab-container">
                            <button
                                className={`tab ${activeSettingsTab === 'category' ? 'active-tab' : ''}`}
                                onClick={() => {
                                    setActiveSettingsTab('category');
                                    setSubmitMessage('');
                                }}
                            >
                                📂 Categories
                            </button>
                            <button
                                className={`tab ${activeSettingsTab === 'city' ? 'active-tab' : ''}`}
                                onClick={() => {
                                    setActiveSettingsTab('city');
                                    setSubmitMessage('');
                                }}
                            >
                                🏙️ Cities
                            </button>
                        </div>

                        <div className="modal-body">
                            {activeSettingsTab === 'category' && (
                                <form onSubmit={handleCreateCategory} className="form">
                                    <h3 className="form-title">Add New Category</h3>
                                    <input
                                        type="text"
                                        placeholder="Enter category name (e.g., Technology & IT)"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        className="input"
                                    />
                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={submitLoading}
                                    >
                                        {submitLoading ? 'Adding...' : 'Add Category'}
                                    </button>
                                </form>
                            )}

                            {activeSettingsTab === 'city' && (
                                <form onSubmit={handleCreateCity} className="form">
                                    <h3 className="form-title">Add New City</h3>
                                    <input
                                        type="text"
                                        placeholder="Enter city name (e.g., Bengaluru)"
                                        value={newCity}
                                        onChange={(e) => setNewCity(e.target.value)}
                                        className="input"
                                    />
                                    <button
                                        type="submit"
                                        className="submit-btn"
                                        disabled={submitLoading}
                                    >
                                        {submitLoading ? 'Adding...' : 'Add City'}
                                    </button>
                                </form>
                            )}

                            {submitMessage && (
                                <p className={`message ${submitMessage.includes('✅') ? 'success' : 'error-message'}`}>
                                    {submitMessage}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminJobs;
