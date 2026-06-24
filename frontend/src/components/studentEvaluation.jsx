import { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText, XCircle, Info, Download } from 'lucide-react';
import './studentEvaluation.css';

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
    const sampleData = `MSU Email,Student Marks in %,Last Week's Attendance %,Attendance Criteria,Final Marks in %,
gatikumawat@gmail.com,74,98,Met,77`;

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
      <div className="eval-container">
        <div className="eval-wrapper">
          <div className="eval-header">
            <div className="eval-icon-box">
              <FileText style={{ width: 40, height: 40, color: '#667eea' }} />
            </div>
            <div>
              <h1 className="eval-title">
                <span className="dashboard-heading-white">Student</span>{" "}
                <span className="dashboard-heading-gradient">Evaluations</span>
              </h1>
              <p className="eval-subtitle">Upload and process evaluation records seamlessly</p>
            </div>
            <button type="button" className="download-btn" onClick={downloadSampleCSV}>
              <Download style={{ width: 18, height: 18 }} />
              Download Sample CSV
            </button>
          </div>

          <div className="eval-body">
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