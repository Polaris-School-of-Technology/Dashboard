import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Notification.css';

type NotificationCategory = 'notice' | 'fees' | 'reminder' | 'general' | 'Hosteller';
type NotificationType = 'batch' | 'global' | 'users' | 'parents';

interface ResponseState {
    message: string;
    type: 'success' | 'error' | '';
}

interface Batch {
    id: number;
    batch_name: string;
}

const AdminNotifications: React.FC = () => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || '';

    const [type, setType] = useState<NotificationType>('batch');
    const [batchId, setBatchId] = useState<number | ''>('');
    const [batches, setBatches] = useState<Batch[]>([]);
    const [batchesLoading, setBatchesLoading] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<NotificationCategory>('general');
    const [isHeader, setIsHeader] = useState(false);
    const [recipientIds, setRecipientIds] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [response, setResponse] = useState<ResponseState>({ message: '', type: '' });
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Fetch batches on mount
    useEffect(() => {
        const fetchBatches = async () => {
            setBatchesLoading(true);
            try {
                const res = await axios.get(`${API_BASE_URL}/api/schedule/getAllBatches`);

                let arr: any[] = [];
                if (Array.isArray(res.data)) arr = res.data;
                else if (res.data?.data) arr = res.data.data;
                else if (res.data?.batches) arr = res.data.batches;
                else if (res.data?.result) arr = res.data.result;

                const normalized: Batch[] = arr.map((it: any) => ({
                    id: Number(it.id),
                    batch_name: it.batch_name ?? it.name ?? String(it.id),
                }));

                setBatches(normalized);
                if (normalized.length > 0 && batchId === '') setBatchId(normalized[0].id);
            } catch (err) {
                console.error('Error fetching batches:', err);
            } finally {
                setBatchesLoading(false);
            }
        };

        fetchBatches();
    }, [API_BASE_URL]);

    // --- Handlers ---
    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) setCsvFile(e.target.files[0]);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            const file = e.target.files[0];
            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please select a valid image file');
                return;
            }
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }
            setImageFile(file);
        }
    };

    const removeCsvFile = () => {
        setCsvFile(null);
        const fileInput = document.getElementById('csvFileInput') as HTMLInputElement | null;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const removeImageFile = () => {
        setImageFile(null);
        const fileInput = document.getElementById('imageFileInput') as HTMLInputElement | null;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'text/csv') setCsvFile(files[0]);
    };

    const handleTypeChange = (newType: NotificationType) => {
        setType(newType);
        if (newType !== 'users') {
            setRecipientIds('');
            setCsvFile(null);
        }
        if (newType !== 'batch') setBatchId('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResponse({ message: '', type: '' });

        try {
            let url = '';
            const token = localStorage.getItem('token');
            const headers: any = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            // Create FormData for all requests
            const formData = new FormData();
            formData.append('title', title);
            formData.append('content', content);
            formData.append('category', category);
            formData.append('is_header', String(isHeader));

            // Add image if present
            if (imageFile) {
                formData.append('image', imageFile);
            }

            if (type === 'batch') {
                if (batchId === '') throw new Error('Please select a batch.');
                url = `${API_BASE_URL}/api/notifications/batch/${batchId}`;
            } else if (type === 'global') {
                url = `${API_BASE_URL}/api/notifications/global`;
            } else if (type === 'parents') {
                url = `${API_BASE_URL}/api/notifications/parents`;
            } else if (type === 'users') {
                url = `${API_BASE_URL}/api/notifications/users`;

                if (csvFile) {
                    formData.append('recipients_file', csvFile);
                } else if (recipientIds.trim()) {
                    // For JSON recipient_ids, we need to send as array
                    const ids = recipientIds
                        .split(',')
                        .map((v) => v.trim())
                        .filter((v) => v);

                    // Append each ID individually for proper FormData handling
                    ids.forEach(id => formData.append('recipient_ids[]', id));
                } else {
                    throw new Error('Please provide recipient IDs or upload a CSV file.');
                }
            }

            const res = await axios.post(url, formData, {
                headers: { ...headers, 'Content-Type': 'multipart/form-data' },
            });

            setResponse({
                message: `✅ Notification sent successfully!\n${JSON.stringify(res.data, null, 2)}`,
                type: 'success',
            });
            resetForm();
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred';
            setResponse({ message: `❌ Error sending notification:\n${errorMessage}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setCategory('general');
        setIsHeader(false);
        setRecipientIds('');
        setCsvFile(null);
        setImageFile(null);
        setBatchId('');
        const csvInput = document.getElementById('csvFileInput') as HTMLInputElement | null;
        const imageInput = document.getElementById('imageFileInput') as HTMLInputElement | null;
        if (csvInput) csvInput.value = '';
        if (imageInput) imageInput.value = '';
    };

    return (
        <div className="notifications-container">
            <div className="notifications-card">
                <div className="notifications-header">
                    <h1>📢 Admin Notification Panel</h1>
                    <p>Send targeted notifications to your users efficiently</p>
                </div>

                <div className="notifications-form-container">
                    <form onSubmit={handleSubmit} className="notifications-form">
                        {/* Notification Type Selector */}
                        <div className="notification-type-selector">
                            {['batch', 'global', 'parents', 'users'].map((t) => (
                                <label key={t} className={`type-option ${type === t ? 'active' : ''}`} onClick={() => handleTypeChange(t as NotificationType)}>
                                    <input type="radio" name="type" value={t} checked={type === t} onChange={() => handleTypeChange(t as NotificationType)} />
                                    <span className="type-icon">
                                        {t === 'batch' ? '👥' : t === 'global' ? '🌍' : t === 'parents' ? '👨‍👩‍👧' : '🎯'}
                                    </span>
                                    <div>{t === 'batch' ? 'Batch' : t === 'global' ? 'Global' : t === 'parents' ? 'All Parents' : 'Specific Users'}</div>
                                </label>
                            ))}
                        </div>

                        {/* Batch Dropdown */}
                        {type === 'batch' && (
                            <div className="form-group full batch-id-group">
                                <label className="form-label">Batch Name</label>
                                <select className="form-select" value={batchId} onChange={(e) => setBatchId(Number(e.target.value))} required>
                                    <option value="">-- Select Batch --</option>
                                    {batchesLoading ? (
                                        <option value="" disabled>Loading batches...</option>
                                    ) : (
                                        batches.map((batch) => (
                                            <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                                        ))
                                    )}
                                </select>
                            </div>
                        )}

                        <div className="form-grid">
                            <div className="form-group full">
                                <label className="form-label">Notification Title</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    placeholder="Enter notification title..."
                                    maxLength={30}
                                />
                            </div>

                            <div className="form-group full">
                                <label className="form-label">Content</label>
                                <textarea
                                    className="form-textarea"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    required
                                    placeholder="Write your notification message here..."
                                />
                            </div>

                            <div className="form-group half">
                                <label className="form-label">Category</label>
                                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value as NotificationCategory)}>
                                    <option value="notice">📋 Notice</option>
                                    <option value="fees">💳 Fees</option>
                                    <option value="reminder">⏰ Reminder</option>
                                    <option value="general">📝 General</option>
                                    <option value="Hosteller">🏠 Hosteller</option>
                                </select>
                            </div>

                            <div className="form-group half">
                                <label className="form-label">Display Options</label>
                                <div className="checkbox-group">
                                    <input type="checkbox" id="isHeader" checked={isHeader} onChange={(e) => setIsHeader(e.target.checked)} />
                                    <label className="checkbox-label" htmlFor="isHeader">Show as header notification</label>
                                </div>
                            </div>
                        </div>

                        {/* Image Upload Section - Available for ALL notification types */}
                        <div className="form-group full">
                            <label className="form-label">📸 Attach Image (Optional)</label>

                            {imageFile && (
                                <div className="uploaded-file-info image-info">
                                    <div className="file-details">
                                        <span className="file-icon">🖼️</span>
                                        <span className="file-name">{imageFile.name}</span>
                                        <span className="file-size">({(imageFile.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="remove-csv-btn"
                                        onClick={removeImageFile}
                                        title="Remove image"
                                    >
                                        ❌ Remove
                                    </button>
                                </div>
                            )}

                            {!imageFile && (
                                <div
                                    className="file-upload-area image-upload"
                                    onClick={() => document.getElementById('imageFileInput')?.click()}
                                >
                                    <div className="upload-icon">🖼️</div>
                                    <div className="upload-text">Click to upload image</div>
                                    <div className="upload-subtext">JPG, PNG, GIF, WebP (Max 5MB)</div>
                                </div>
                            )}

                            <input
                                type="file"
                                id="imageFileInput"
                                className="file-input-hidden"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handleImageUpload}
                            />
                        </div>

                        {/* Users Section */}
                        {type === 'users' && (
                            <div className="users-specific">
                                <div className="form-group full">
                                    <label className="form-label">Recipient IDs / Emails / Phones</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={recipientIds}
                                        onChange={(e) => setRecipientIds(e.target.value)}
                                        placeholder="Enter comma-separated values..."
                                    />
                                </div>

                                <div className="form-group full">
                                    <label className="form-label">Or Upload CSV File</label>

                                    {csvFile && (
                                        <div className="uploaded-file-info">
                                            <div className="file-details">
                                                <span className="file-icon">✅</span>
                                                <span className="file-name">{csvFile.name}</span>
                                                <span className="file-size">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                                            </div>
                                            <button
                                                type="button"
                                                className="remove-csv-btn"
                                                onClick={removeCsvFile}
                                                title="Remove file"
                                            >
                                                ❌ Remove
                                            </button>
                                        </div>
                                    )}

                                    {!csvFile && (
                                        <div
                                            className={`file-upload-area ${dragOver ? 'dragover' : ''}`}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                            onClick={() => document.getElementById('csvFileInput')?.click()}
                                        >
                                            <div className="upload-icon">📄</div>
                                            <div className="upload-text">Click to upload or drag & drop</div>
                                            <div className="upload-subtext">CSV files only</div>
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        id="csvFileInput"
                                        className="file-input-hidden"
                                        accept=".csv"
                                        onChange={handleCsvUpload}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="btn-container">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        Sending...
                                    </>
                                ) : (
                                    <>🚀 Send Notification</>
                                )}
                            </button>
                        </div>

                        {response.message && <div className={`response-area ${response.type} fade-in`}>{response.message}</div>}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminNotifications;