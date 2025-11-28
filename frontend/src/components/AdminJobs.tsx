import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
        <div style={styles.container}>
            <h1 style={styles.title}>Job Management Dashboard</h1>

            <div style={styles.topActions}>
                <button
                    onClick={() => navigate('/admin/jobs/create')}
                    style={styles.createButton}
                >
                    + Create New Job
                </button>

                <button
                    onClick={() => setShowSettingsModal(true)}
                    style={styles.settingsButton}
                >
                    ⚙️ Admin Settings
                </button>
            </div>

            {loading && <p style={styles.loading}>Loading jobs...</p>}
            {error && <p style={styles.error}>{error}</p>}

            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Company</th>
                        <th style={styles.th}>Title</th>
                        <th style={styles.th}>Location</th>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>Mode</th>
                        <th style={styles.th}>Package</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Batch</th>
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map((job) => (
                        <tr key={job.id} style={styles.tr}>
                            <td style={styles.td}>{job.company}</td>
                            <td style={styles.td}>{job.title}</td>
                            <td style={styles.td}>{job.location}</td>
                            <td style={styles.td}>{job.type}</td>
                            <td style={styles.td}>{job.mode}</td>
                            <td style={styles.td}>{job.package}</td>
                            <td style={styles.td}>
                                <span style={{
                                    ...styles.badge,
                                    background: job.status === 'Campus' ? '#48bb78' : '#ed8936'
                                }}>
                                    {job.status}
                                </span>
                            </td>
                            <td style={styles.td}>{job.category}</td>
                            <td style={styles.td}>{job.batch}</td>
                            <td style={styles.td}>
                                {/* 🆕 UPDATED - Added Edit Button */}
                                <div style={styles.actionButtons}>
                                    <button
                                        onClick={() => handleViewDetails(job.id)}
                                        style={{ ...styles.button, ...styles.viewButton }}
                                    >
                                        📄 View
                                    </button>
                                    <button
                                        onClick={() => handleEditJob(job.id)}
                                        style={{ ...styles.button, ...styles.editButton }}
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleViewApplications(job.id)}
                                        style={{ ...styles.button, ...styles.applicationsButton }}
                                    >
                                        👥 Applications
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Settings Modal */}
            {showSettingsModal && (
                <div style={styles.modalOverlay} onClick={() => setShowSettingsModal(false)}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h2 style={styles.modalTitle}>Admin Settings</h2>
                            <button
                                style={styles.closeButton}
                                onClick={() => setShowSettingsModal(false)}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={styles.tabContainer}>
                            <button
                                style={{
                                    ...styles.tab,
                                    ...(activeSettingsTab === 'category' ? styles.activeTab : {})
                                }}
                                onClick={() => {
                                    setActiveSettingsTab('category');
                                    setSubmitMessage('');
                                }}
                            >
                                📂 Categories
                            </button>
                            <button
                                style={{
                                    ...styles.tab,
                                    ...(activeSettingsTab === 'city' ? styles.activeTab : {})
                                }}
                                onClick={() => {
                                    setActiveSettingsTab('city');
                                    setSubmitMessage('');
                                }}
                            >
                                🏙️ Cities
                            </button>
                        </div>

                        <div style={styles.modalBody}>
                            {activeSettingsTab === 'category' && (
                                <form onSubmit={handleCreateCategory} style={styles.form}>
                                    <h3 style={styles.formTitle}>Add New Category</h3>
                                    <input
                                        type="text"
                                        placeholder="Enter category name (e.g., Technology & IT)"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        style={styles.input}
                                    />
                                    <button
                                        type="submit"
                                        style={styles.submitButton}
                                        disabled={submitLoading}
                                    >
                                        {submitLoading ? 'Adding...' : 'Add Category'}
                                    </button>
                                </form>
                            )}

                            {activeSettingsTab === 'city' && (
                                <form onSubmit={handleCreateCity} style={styles.form}>
                                    <h3 style={styles.formTitle}>Add New City</h3>
                                    <input
                                        type="text"
                                        placeholder="Enter city name (e.g., Bengaluru)"
                                        value={newCity}
                                        onChange={(e) => setNewCity(e.target.value)}
                                        style={styles.input}
                                    />
                                    <button
                                        type="submit"
                                        style={styles.submitButton}
                                        disabled={submitLoading}
                                    >
                                        {submitLoading ? 'Adding...' : 'Add City'}
                                    </button>
                                </form>
                            )}

                            {submitMessage && (
                                <p style={{
                                    ...styles.message,
                                    color: submitMessage.includes('✅') ? '#48bb78' : '#f56565'
                                }}>
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

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        maxWidth: '1400px',
        margin: '20px auto',
        padding: '32px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
    },
    title: {
        textAlign: 'center',
        fontSize: '2.5rem',
        fontWeight: '800',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        marginBottom: '32px',
        letterSpacing: '-0.025em',
    },
    topActions: {
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
    },
    createButton: {
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: '600',
        cursor: 'pointer',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '0.875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    },
    settingsButton: {
        padding: '12px 24px',
        borderRadius: '12px',
        border: '2px solid #667eea',
        fontWeight: '600',
        cursor: 'pointer',
        background: 'white',
        color: '#667eea',
        fontSize: '0.875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    },
    loading: {
        textAlign: 'center',
        fontSize: '1.125rem',
        color: '#667eea',
        fontWeight: '600',
        padding: '32px',
    },
    error: {
        textAlign: 'center',
        color: '#f56565',
        fontWeight: '600',
        padding: '16px',
        backgroundColor: 'rgba(245, 101, 101, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(245, 101, 101, 0.2)',
        margin: '16px 0',
    },
    table: {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: '0',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        marginTop: '24px',
    },
    th: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px 16px',
        textAlign: 'left',
        fontWeight: '700',
        textTransform: 'uppercase',
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        border: 'none',
    },
    tr: {
        transition: 'all 0.2s ease',
    },
    td: {
        padding: '20px 16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white',
        verticalAlign: 'middle',
    },
    badge: {
        padding: '4px 12px',
        borderRadius: '12px',
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    actionButtons: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    button: {
        padding: '8px 12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        minWidth: '90px',
    },
    viewButton: {
        background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
        color: 'white',
    },
    // 🆕 NEW STYLE - Orange Edit Button
    editButton: {
        background: 'linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)',
        color: 'white',
    },
    applicationsButton: {
        background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
        color: 'white',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '0',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 32px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
    },
    modalTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        margin: 0,
    },
    closeButton: {
        background: 'rgba(255, 255, 255, 0.2)',
        border: 'none',
        color: 'white',
        fontSize: '1.5rem',
        cursor: 'pointer',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContainer: {
        display: 'flex',
        borderBottom: '2px solid #e2e8f0',
        backgroundColor: '#f7fafc',
    },
    tab: {
        flex: 1,
        padding: '16px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#718096',
        transition: 'all 0.2s ease',
    },
    activeTab: {
        color: '#667eea',
        borderBottom: '3px solid #667eea',
        backgroundColor: 'white',
    },
    modalBody: {
        padding: '32px',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    formTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#2d3748',
        marginBottom: '8px',
    },
    input: {
        padding: '14px 16px',
        fontSize: '1rem',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        outline: 'none',
        transition: 'all 0.2s ease',
    },
    submitButton: {
        padding: '14px 24px',
        borderRadius: '12px',
        border: 'none',
        fontWeight: '600',
        cursor: 'pointer',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '1rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    },
    message: {
        padding: '12px 16px',
        borderRadius: '12px',
        fontWeight: '600',
        textAlign: 'center',
        marginTop: '16px',
    },
};

export default AdminJobs;