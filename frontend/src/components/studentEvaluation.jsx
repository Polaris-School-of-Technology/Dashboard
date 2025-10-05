import { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText, XCircle, Info, Download } from 'lucide-react';

export default function UploadStudentEvaluations() {
  const API_BASE_URL = process.env.REACT_APP_API_URL || '';

  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [types, setTypes] = useState([]);

  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [csvFile, setCsvFile] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBatches();
    fetchTypes();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchCourses(selectedBatch);
    } else {
      setCourses([]);
      setSelectedCourse('');
    }
  }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluation/batches`);
      const data = await response.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error('Error fetching batches:', err);
      setError('Failed to load batches');
    }
  };

  const fetchCourses = async (batchId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluation/courses/${batchId}`);
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to load courses');
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluation/types`);
      const data = await response.json();
      setTypes(data.types || []);
    } catch (err) {
      console.error('Error fetching types:', err);
      setError('Failed to load evaluation types');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file);
      setError('');
    } else {
      setError('Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBatch || !selectedCourse || !selectedType || !selectedDate || !csvFile) {
      setError('Please fill all fields and select a CSV file');
      return;
    }

    setIsLoading(true);
    setError('');
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('csv_file', csvFile);
      formData.append('batch_id', selectedBatch);
      formData.append('course_id', selectedCourse);
      formData.append('date', selectedDate);
      formData.append('type', selectedType);

      const response = await fetch(`${API_BASE_URL}/api/evaluation/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      setUploadResult(result);
      setCsvFile(null);
      document.getElementById('csv-upload').value = '';
    } catch (err) {
      setError(err.message || 'Failed to upload evaluations');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `Username,Student Name,MSU Email,Set,User Score,Total Score,Tab Switches,Is Blocked,Reset Score
gatikumawat,Gati Kumawat,gatikumawat@gmail.com,HTMLASS01,100,200,0,FALSE,HTMLASS01
priyanshudp25,Priyanshu Dwivedi,PRIYANSHUD.p25@medhaviskillsuniversity.edu.in,HTMLASS01,200,200,0,FALSE,HTMLASS01
prathamchp25,Pratham Prasad Choudhari,PRATHAMCH.p25@medhaviskillsuniversity.edu.in,HTMLASS01,200,200,0,FALSE,HTMLASS01`;

    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_evaluations.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .eval-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .eval-wrapper {
          max-width: 1200px;
          margin: 0 auto;
        }

        .eval-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .eval-icon-box {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .eval-title {
          font-size: 48px;
          font-weight: 800;
          color: white;
          margin-bottom: 10px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .eval-subtitle {
          font-size: 18px;
          color: rgba(255,255,255,0.9);
          font-weight: 400;
        }

        .eval-card {
          background: white;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          margin-bottom: 30px;
        }

        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 30px;
        }

        .download-btn:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-size: 14px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .form-label .required {
          color: #ef4444;
        }

        .form-input,
        .form-select {
          padding: 14px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          color: #1f2937;
          transition: all 0.3s ease;
          background: white;
        }

        .form-input:focus,
        .form-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-input:disabled,
        .form-select:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .form-helper {
          margin-top: 6px;
          font-size: 13px;
          color: #6b7280;
          font-style: italic;
        }

        .upload-area {
          border: 3px dashed #d1d5db;
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          transition: all 0.3s ease;
          background: #f9fafb;
          cursor: pointer;
        }

        .upload-area:hover {
          border-color: #667eea;
          background: #f3f4f6;
        }

        .upload-icon-wrapper {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .upload-text {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .upload-subtext {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        .file-selected {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #d1fae5;
          border: 2px solid #10b981;
          border-radius: 12px;
          margin-top: 16px;
        }

        .file-selected-text {
          font-weight: 600;
          color: #065f46;
        }

        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: #fef2f2;
          border: 2px solid #fecaca;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .error-text {
          color: #991b1b;
          font-weight: 500;
          font-size: 14px;
        }

        .submit-btn {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .results-box {
          margin-top: 32px;
          padding: 32px;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border: 2px solid #10b981;
          border-radius: 20px;
        }

        .results-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .results-icon-box {
          width: 56px;
          height: 56px;
          background: #10b981;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .results-title {
          font-size: 28px;
          font-weight: 800;
          color: #065f46;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .stat-card {
          padding: 20px;
          border-radius: 12px;
          border: 2px solid;
        }

        .stat-card.total {
          background: white;
          border-color: #e5e7eb;
        }

        .stat-card.success {
          background: #d1fae5;
          border-color: #10b981;
        }

        .stat-card.failed {
          background: #fee2e2;
          border-color: #ef4444;
        }

        .stat-card.notfound {
          background: #fed7aa;
          border-color: #f97316;
        }

        .stat-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }

        .stat-card.total .stat-label { color: #6b7280; }
        .stat-card.success .stat-label { color: #065f46; }
        .stat-card.failed .stat-label { color: #991b1b; }
        .stat-card.notfound .stat-label { color: #9a3412; }

        .stat-value {
          font-size: 36px;
          font-weight: 800;
        }

        .stat-card.total .stat-value { color: #1f2937; }
        .stat-card.success .stat-value { color: #065f46; }
        .stat-card.failed .stat-value { color: #991b1b; }
        .stat-card.notfound .stat-value { color: #9a3412; }

        .details-section {
          margin-bottom: 20px;
        }

        .details-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .details-title {
          font-size: 18px;
          font-weight: 700;
        }

        .details-content {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          max-height: 250px;
          overflow-y: auto;
        }

        .detail-item {
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }

        .detail-item:last-child {
          border-bottom: none;
        }

        .detail-email {
          font-weight: 700;
          color: #1f2937;
        }

        .info-card {
          background: white;
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .info-icon-box {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .info-title {
          font-size: 22px;
          font-weight: 800;
          color: #1f2937;
        }

        .info-list {
          list-style: none;
        }

        .info-item {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          font-size: 15px;
          color: #374151;
          line-height: 1.6;
        }

        .info-bullet {
          color: #667eea;
          font-weight: 800;
          font-size: 20px;
        }

        .info-highlight {
          font-weight: 700;
          color: #1f2937;
        }
      `}</style>

      <div className="eval-container">
        <div className="eval-wrapper">
          <div className="eval-header">
            <div className="eval-icon-box">
              <FileText style={{ width: 40, height: 40, color: '#667eea' }} />
            </div>
            <h1 className="eval-title">Student Evaluations</h1>
            <p className="eval-subtitle">Upload and process evaluation records seamlessly</p>
          </div>

          <div className="eval-card">
            <button onClick={downloadSampleCSV} className="download-btn">
              <Download style={{ width: 18, height: 18 }} />
              Download Sample CSV
            </button>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Batch <span className="required">*</span>
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">-- Select Batch --</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Course <span className="required">*</span>
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="form-select"
                  required
                  disabled={!selectedBatch}
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.course_name}</option>
                  ))}
                </select>
                {!selectedBatch && <p className="form-helper">Select a batch first</p>}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Evaluation Type <span className="required">*</span>
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">-- Select Type --</option>
                  {types.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Date <span className="required">*</span>
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">
                CSV File <span className="required">*</span>
              </label>
              <div className="upload-area" onClick={() => document.getElementById('csv-upload').click()}>
                <div className="upload-icon-wrapper">
                  <Upload style={{ width: 32, height: 32, color: 'white' }} />
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  id="csv-upload"
                  required
                />
                <p className="upload-text">Click to upload or drag and drop</p>
                <p className="upload-subtext">CSV file (Max 5MB)</p>
                {csvFile && (
                  <div className="file-selected">
                    <CheckCircle style={{ width: 20, height: 20, color: '#10b981' }} />
                    <span className="file-selected-text">{csvFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="error-box">
                <XCircle style={{ width: 20, height: 20, color: '#ef4444', flexShrink: 0 }} />
                <p className="error-text">{error}</p>
              </div>
            )}

            <button onClick={handleSubmit} disabled={isLoading} className="submit-btn">
              {isLoading ? (
                <>
                  <div className="spinner" />
                  Processing Upload...
                </>
              ) : (
                <>
                  <Upload style={{ width: 20, height: 20 }} />
                  Upload & Process Evaluations
                </>
              )}
            </button>

            {uploadResult && (
              <div className="results-box">
                <div className="results-header">
                  <div className="results-icon-box">
                    <CheckCircle style={{ width: 32, height: 32, color: 'white' }} />
                  </div>
                  <h3 className="results-title">Upload Complete!</h3>
                </div>

                <div className="stats-grid">
                  <div className="stat-card total">
                    <p className="stat-label">Total</p>
                    <p className="stat-value">{uploadResult.summary.total}</p>
                  </div>
                  <div className="stat-card success">
                    <p className="stat-label">Success</p>
                    <p className="stat-value">{uploadResult.summary.success}</p>
                  </div>
                  <div className="stat-card failed">
                    <p className="stat-label">Failed</p>
                    <p className="stat-value">{uploadResult.summary.failed}</p>
                  </div>
                  <div className="stat-card notfound">
                    <p className="stat-label">Not Found</p>
                    <p className="stat-value">{uploadResult.summary.notFound}</p>
                  </div>
                </div>

                {uploadResult.details.failed.length > 0 && (
                  <div className="details-section">
                    <div className="details-header">
                      <XCircle style={{ width: 20, height: 20, color: '#ef4444' }} />
                      <h4 className="details-title" style={{ color: '#991b1b' }}>Failed Records</h4>
                    </div>
                    <div className="details-content">
                      {uploadResult.details.failed.map((item, idx) => (
                        <div key={idx} className="detail-item">
                          <span className="detail-email">{item.email || 'Unknown'}:</span> {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResult.details.notFound.length > 0 && (
                  <div className="details-section">
                    <div className="details-header">
                      <AlertCircle style={{ width: 20, height: 20, color: '#f97316' }} />
                      <h4 className="details-title" style={{ color: '#9a3412' }}>Users Not Found</h4>
                    </div>
                    <div className="details-content">
                      {uploadResult.details.notFound.map((item, idx) => (
                        <div key={idx} className="detail-item">
                          <span className="detail-email">{item.email}:</span> {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="info-card">
            <div className="info-header">
              <div className="info-icon-box">
                <Info style={{ width: 24, height: 24, color: 'white' }} />
              </div>
              <h3 className="info-title">CSV Format Requirements</h3>
            </div>
            <ul className="info-list">
              <li className="info-item">
                <span className="info-bullet">•</span>
                <span><span className="info-highlight">Required columns:</span> MSU Email, User Score (or Student Score)</span>
              </li>
              <li className="info-item">
                <span className="info-bullet">•</span>
                <span><span className="info-highlight">Optional:</span> Total Score (defaults to 200)</span>
              </li>
              <li className="info-item">
                <span className="info-bullet">•</span>
                <span>Emails are automatically matched with registered users (case-insensitive)</span>
              </li>
              <li className="info-item">
                <span className="info-bullet">•</span>
                <span>Unmatched emails will be listed in the results for review</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}