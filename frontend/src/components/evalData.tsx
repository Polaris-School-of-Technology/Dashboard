import React, { useState, useEffect } from 'react';
import { ChevronDown, Search, AlertCircle, Loader, Award, BookOpen, FileText, User, TrendingUp, Target } from 'lucide-react';
import './MarksViewer.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Semester {
    id: string;
    semester_name: string;
}

interface Subject {
    id: string;
    subject_name: string;
}

interface Component {
    id: string;
    name: string;
}

interface MarksResult {
    SubjectId: string;
    ComponentId: string;
    SubjectName: string;
    ComponentName: string;
    MarksObtained: number;
    TotalMarks: number;
    StudentName: string;
    RollNumber: string;
}

export default function MarksViewer() {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [components, setComponents] = useState<Component[]>([]);
    const [marksResult, setMarksResult] = useState<MarksResult | null>(null);

    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedComponent, setSelectedComponent] = useState('');
    const [rollNumber, setRollNumber] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchSemesters = async () => {
            try {
                setError('');
                const response = await fetch(`${API_BASE_URL}/api/eval/semesters`);
                if (!response.ok) throw new Error('Failed to load semesters');
                const data = await response.json();
                setSemesters(data);
            } catch (err) {
                setError('Failed to load semesters');
                console.error(err);
            }
        };
        fetchSemesters();
    }, []);

    useEffect(() => {
        if (!selectedSemester) {
            setSubjects([]);
            setSelectedSubject('');
            setComponents([]);
            setSelectedComponent('');
            return;
        }

        const fetchSubjects = async () => {
            try {
                setError('');
                const response = await fetch(`${API_BASE_URL}/api/eval/subjects/${selectedSemester}`);
                if (!response.ok) throw new Error('Failed to load subjects');
                const data = await response.json();
                setSubjects(data);
                setSelectedSubject('');
                setComponents([]);
                setSelectedComponent('');
            } catch (err) {
                setError('Failed to load subjects');
                console.error(err);
            }
        };
        fetchSubjects();
    }, [selectedSemester]);

    useEffect(() => {
        if (!selectedSubject) {
            setComponents([]);
            setSelectedComponent('');
            return;
        }

        const fetchComponents = async () => {
            try {
                setError('');
                const response = await fetch(`${API_BASE_URL}/api/eval/components/${selectedSubject}`);
                if (!response.ok) throw new Error('Failed to load components');
                const data = await response.json();
                setComponents(data);
                setSelectedComponent('');
            } catch (err) {
                setError('Failed to load components');
                console.error(err);
            }
        };
        fetchComponents();
    }, [selectedSubject]);

    const handleSearch = async () => {
        setError('');
        setSuccess(false);
        setMarksResult(null);

        if (!selectedSemester || !selectedSubject || !selectedComponent || !rollNumber.trim()) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setLoading(true);
            const params = new URLSearchParams({
                semesterId: selectedSemester,
                subjectId: selectedSubject,
                componentId: selectedComponent,
                rollNumber: rollNumber.trim(),
            });

            const response = await fetch(`${API_BASE_URL}/api/eval/marks?${params}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch marks');
            }

            const data = await response.json();
            setMarksResult(data);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch marks');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const percentage = marksResult
        ? ((marksResult.MarksObtained / marksResult.TotalMarks) * 100).toFixed(1)
        : 0;

    const getGradeInfo = (percent: number) => {
        if (percent >= 90) return { grade: 'A+', className: 'grade-a-plus' };
        if (percent >= 80) return { grade: 'A', className: 'grade-a' };
        if (percent >= 70) return { grade: 'B+', className: 'grade-b-plus' };
        if (percent >= 60) return { grade: 'B', className: 'grade-b' };
        if (percent >= 50) return { grade: 'C', className: 'grade-c' };
        if (percent >= 40) return { grade: 'D', className: 'grade-d' };
        return { grade: 'F', className: 'grade-f' };
    };

    const gradeInfo = getGradeInfo(Number(percentage));

    return (
        <div className="marks-viewer-container">
            <div className="marks-viewer-content">
                {/* Header */}
                <div className="header-section">
                    <div className="header-icon">
                        <Award size={32} />
                    </div>
                    <h1 className="header-title">Student Marks Viewer</h1>
                    <p className="header-subtitle">Track your academic performance</p>
                </div>

                <div className="main-grid">
                    {/* Search Panel */}
                    <div className="search-panel">
                        <div className="search-card">
                            <div className="card-header">
                                <div className="header-icon-small">
                                    <Search size={20} />
                                </div>
                                <h2 className="card-title">Search Marks</h2>
                            </div>

                            {error && (
                                <div className="alert alert-error">
                                    <AlertCircle size={18} />
                                    <p>{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="alert alert-success">
                                    <p>✓ Marks retrieved successfully!</p>
                                </div>
                            )}

                            <div className="form-fields">
                                <div className="form-group">
                                    <label className="form-label">Semester *</label>
                                    <div className="select-wrapper">
                                        <select
                                            value={selectedSemester}
                                            onChange={(e) => setSelectedSemester(e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="">Select Semester</option>
                                            {semesters.map((sem) => (
                                                <option key={sem.id} value={sem.id}>{sem.semester_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="select-icon" size={20} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Subject *</label>
                                    <div className="select-wrapper">
                                        <select
                                            value={selectedSubject}
                                            onChange={(e) => setSelectedSubject(e.target.value)}
                                            disabled={!selectedSemester}
                                            className="form-select"
                                        >
                                            <option value="">
                                                {selectedSemester ? 'Select Subject' : 'Select Semester First'}
                                            </option>
                                            {subjects.map((subj) => (
                                                <option key={subj.id} value={subj.id}>{subj.subject_name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="select-icon" size={20} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Component *</label>
                                    <div className="select-wrapper">
                                        <select
                                            value={selectedComponent}
                                            onChange={(e) => setSelectedComponent(e.target.value)}
                                            disabled={!selectedSubject}
                                            className="form-select"
                                        >
                                            <option value="">
                                                {selectedSubject ? 'Select Component' : 'Select Subject First'}
                                            </option>
                                            {components.map((comp) => (
                                                <option key={comp.id} value={comp.id}>{comp.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="select-icon" size={20} />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Roll Number *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g., 240410700041"
                                        value={rollNumber}
                                        onChange={(e) => setRollNumber(e.target.value)}
                                        className="form-input"
                                    />
                                </div>

                                <button
                                    onClick={handleSearch}
                                    disabled={loading || !selectedSemester || !selectedSubject || !selectedComponent || !rollNumber}
                                    className="search-button"
                                >
                                    {loading ? (
                                        <>
                                            <Loader size={20} className="spinner" />
                                            <span>Searching...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search size={20} />
                                            <span>Search Marks</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="results-panel">
                        {marksResult ? (
                            <div className="results-content">
                                {/* Student Info Card */}
                                <div className="student-card">
                                    <div className="student-header">
                                        <div className="student-icon">
                                            <User size={28} />
                                        </div>
                                        <div>
                                            <h2 className="student-name">{marksResult.StudentName}</h2>
                                            <p className="student-roll">Roll No: {marksResult.RollNumber}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Marks Details Card */}
                                <div className="marks-card">
                                    <h3 className="marks-title">
                                        <FileText size={24} />
                                        Marks Details
                                    </h3>

                                    <div className="marks-details">
                                        <div className="detail-row">
                                            <div className="detail-label">
                                                <div className="detail-icon icon-blue">
                                                    <BookOpen size={20} />
                                                </div>
                                                <span>Subject</span>
                                            </div>
                                            <span className="detail-value">{marksResult.SubjectName}</span>
                                        </div>

                                        <div className="detail-row">
                                            <div className="detail-label">
                                                <div className="detail-icon icon-purple">
                                                    <FileText size={20} />
                                                </div>
                                                <span>Component</span>
                                            </div>
                                            <span className="detail-value">{marksResult.ComponentName}</span>
                                        </div>

                                        <div className="detail-row highlight-row">
                                            <div className="detail-label">
                                                <div className="detail-icon icon-primary">
                                                    <Target size={20} />
                                                </div>
                                                <span>Marks Obtained</span>
                                            </div>
                                            <div className="marks-display">
                                                <span className="marks-obtained">{marksResult.MarksObtained}</span>
                                                <span className="marks-separator">/</span>
                                                <span className="marks-total">{marksResult.TotalMarks}</span>
                                            </div>
                                        </div>

                                        <div className="detail-row">
                                            <div className="detail-label">
                                                <div className="detail-icon icon-green">
                                                    <TrendingUp size={20} />
                                                </div>
                                                <span>Percentage</span>
                                            </div>
                                            <span className={`percentage-value ${gradeInfo.className}`}>{percentage}%</span>
                                        </div>

                                        <div className="detail-row">
                                            <div className="detail-label">
                                                <div className="detail-icon icon-yellow">
                                                    <Award size={20} />
                                                </div>
                                                <span>Grade</span>
                                            </div>
                                            <span className={`grade-badge ${gradeInfo.className}`}>
                                                {gradeInfo.grade}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="no-results">
                                <div className="no-results-icon">
                                    <Search size={48} />
                                </div>
                                <h3 className="no-results-title">No Results Yet</h3>
                                <p className="no-results-text">
                                    Fill in all the required fields in the search panel and click "Search Marks" to view your academic performance
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}