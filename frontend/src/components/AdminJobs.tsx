import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, FileText, Pencil, Plus, Search, Settings, UsersRound } from 'lucide-react';
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

const normalizeOption = (value?: string | number | null) => String(value ?? '').trim().toLowerCase();

const normalizeJob = (job: any): Job => ({
    id: String(job.id ?? job._id ?? ''),
    company: String(job.company ?? ''),
    title: String(job.title ?? ''),
    location: String(job.location ?? ''),
    type: String(job.type ?? ''),
    mode: String(job.mode ?? ''),
    package: String(job.package ?? job.package_lpa ?? ''),
    status: String(job.status ?? ''),
    category: String(job.category ?? job.job_categories?.name ?? ''),
    batch: String(
        job.batch ??
        job.batch_name ??
        job.graduation_year ??
        job.year ??
        job.batches?.batch_name ??
        job.batches?.graduation_year ??
        job.batches?.year ??
        ''
    ),
    createdAt: String(job.createdAt ?? job.created_at ?? '')
});

const AdminJobs: React.FC = () => {
    const navigate = useNavigate();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [activeSettingsTab, setActiveSettingsTab] = useState<'category' | 'city'>('category');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [batchFilter, setBatchFilter] = useState('All');

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
            const rawJobs = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            setJobs(rawJobs.map(normalizeJob));
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

    const uniqueStatuses = useMemo(() => Array.from(new Set(jobs.map((job) => job.status).filter(Boolean))), [jobs]);
    const uniqueTypes = useMemo(() => Array.from(new Set(jobs.map((job) => job.type).filter(Boolean))), [jobs]);
    const uniqueBatches = useMemo(() => Array.from(new Set(jobs.map((job) => job.batch).filter(Boolean))).sort().reverse(), [jobs]);

    const filteredJobs = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return jobs.filter((job) => {
            const matchesSearch = !query || [job.company, job.title, job.batch, job.category].some((value) =>
                value?.toLowerCase().includes(query)
            );
            const matchesStatus = statusFilter === 'All' || normalizeOption(job.status) === normalizeOption(statusFilter);
            const matchesType = typeFilter === 'All' || normalizeOption(job.type) === normalizeOption(typeFilter);
            const matchesBatch = batchFilter === 'All' || normalizeOption(job.batch) === normalizeOption(batchFilter);

            return matchesSearch && matchesStatus && matchesType && matchesBatch;
        });
    }, [batchFilter, jobs, searchTerm, statusFilter, typeFilter]);

    const getInitials = (company: string) => {
        const words = company.trim().split(/\s+/).filter(Boolean);
        if (!words.length) {
            return '--';
        }

        if (words.length === 1) {
            return words[0].slice(0, 2).toUpperCase();
        }

        return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
    };

    const formatStatus = (status: string) => status.replace(/-/g, '-\n').toUpperCase();
    const openCampusCount = jobs.filter((job) => normalizeOption(job.status).includes('campus')).length;

    return (
        <div className="jobs-container">
            <div className="jobs-header">
                <div>
                    <nav className="jobs-breadcrumb" aria-label="Breadcrumb">
                        <span>Admin</span>
                        <span>/</span>
                        <span>Job Portal</span>
                        <span>/</span>
                        <strong>All Postings</strong>
                    </nav>
                    <h1>Job Management</h1>
                    <p className="jobs-subtitle">{jobs.length} active postings · Updated 2 minutes ago</p>
                </div>
                <div className="top-actions">
                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="settings-btn"
                    >
                        <Settings size={18} aria-hidden="true" />
                        <span>Admin Settings</span>
                    </button>

                    <button
                        onClick={() => navigate('/admin/jobs/create')}
                        className="create-job-btn"
                    >
                        <Plus size={19} aria-hidden="true" />
                        <span>Create New Job</span>
                    </button>
                </div>
            </div>

            <section className="jobs-stats" aria-label="Job statistics">
                <article className="stat-card">
                    <span>Total Postings</span>
                    <strong>{jobs.length}</strong>
                    <small>+2 this week</small>
                </article>
                <article className="stat-card">
                    <span>Open Campus</span>
                    <strong>{openCampusCount}</strong>
                    <small>3 closing soon</small>
                </article>
                <article className="stat-card">
                    <span>Applications</span>
                    <strong>1,284</strong>
                    <small className="stat-positive">+18% MoM</small>
                </article>
                <article className="stat-card">
                    <span>Hired</span>
                    <strong>32</strong>
                    <small className="stat-positive">+5 this month</small>
                </article>
            </section>

            {loading && <p className="loading-text">Loading jobs...</p>}
            {error && <p className="error">{error}</p>}

            <section className="jobs-panel">
                <div className="jobs-toolbar">
                    <label className="jobs-search">
                        <Search size={19} aria-hidden="true" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search company, title, batch..."
                        />
                    </label>

                    <div className="filter-group">
                        <label className="filter-select">
                            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                <option value="All">Status: All</option>
                                {(uniqueStatuses.length ? uniqueStatuses : ['Campus', 'Off-Campus']).map((status) => (
                                    <option key={status} value={status}>Status: {status}</option>
                                ))}
                            </select>
                            <ChevronDown size={15} aria-hidden="true" />
                        </label>
                        <label className="filter-select">
                            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                                <option value="All">Type: All</option>
                                {uniqueTypes.map((type) => (
                                    <option key={type} value={type}>Type: {type}</option>
                                ))}
                            </select>
                            <ChevronDown size={15} aria-hidden="true" />
                        </label>
                        <label className="filter-select">
                            <select value={batchFilter} onChange={(event) => setBatchFilter(event.target.value)}>
                                <option value="All">Batch: All</option>
                                {(uniqueBatches.length ? uniqueBatches : ['2026', '2025']).map((batch) => (
                                    <option key={batch} value={batch}>Batch: {batch}</option>
                                ))}
                            </select>
                            <ChevronDown size={15} aria-hidden="true" />
                        </label>
                    </div>

                    <span className="jobs-showing">Showing {filteredJobs.length} of {jobs.length}</span>
                </div>

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
                            {filteredJobs.map((job, index) => (
                                <tr key={job.id || `${job.company}-${job.title}-${index}`}>
                                    <td>
                                        <div className="company-cell">
                                            <span className="company-logo">{getInitials(job.company)}</span>
                                            <strong>{job.company}</strong>
                                        </div>
                                    </td>
                                    <td>{job.title}</td>
                                    <td>{job.location}</td>
                                    <td>{job.type}</td>
                                    <td>{job.mode}</td>
                                    <td className="package-cell">{job.package}</td>
                                    <td>
                                        <span className={`badge ${normalizeOption(job.status).includes('campus') && !normalizeOption(job.status).includes('off') ? 'badge-campus' : 'badge-external'}`}>
                                            {formatStatus(job.status)}
                                        </span>
                                    </td>
                                    <td>{job.category}</td>
                                    <td>{job.batch}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => handleViewDetails(job.id)}
                                                className="icon-btn"
                                                data-tooltip="View"
                                                aria-label="View"
                                            >
                                                <FileText size={18} aria-hidden="true" />
                                            </button>
                                            <button
                                                onClick={() => handleEditJob(job.id)}
                                                className="icon-btn"
                                                data-tooltip="Edit"
                                                aria-label="Edit"
                                            >
                                                <Pencil size={18} aria-hidden="true" />
                                            </button>
                                            <button
                                                onClick={() => handleViewApplications(job.id)}
                                                className="icon-btn"
                                                data-tooltip="Applications"
                                                aria-label="Applications"
                                            >
                                                <UsersRound size={18} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

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
