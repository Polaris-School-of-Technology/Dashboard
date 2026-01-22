import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './facultyRatings.css';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface FacultyRating {
    rating: number;
    session_date: string;
    faculty_id: string;
    session_id: string;
    student_count?: number;
    profiles: { name: string };
    class_sessions: {
        course_sections: {
            courses: { course_name: string };
            batches: { batch_name: string };
        };
    };
}

interface Faculty {
    faculty_id: string;
    faculty_name: string;
    department: string | null;
    title: string | null;
}

interface ChartDataPoint {
    date: string;
    originalDate: string;
    [key: string]: any;
}

interface HeatmapDataPoint {
    date: string;
    [facultyName: string]: number | string;
}

const AdminAnalytics = () => {
    const getHeatmapColor = (rating: number | undefined) => {
        if (rating === undefined) return '#f9f9f9';

        if (rating < 4) {
            return '#fcd5d5'; // very light red
        } else if (rating < 4.5) {
            return '#fff4b3'; // very light yellow
        } else {
            return '#d4f5d4'; // very light green
        }
    };

    const [facultyList, setFacultyList] = useState<Faculty[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState('all');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
    const [tableData, setTableData] = useState<FacultyRating[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

    useEffect(() => {
        fetchFacultyList();
    }, []);

    const fetchFacultyList = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/faculty-rating/analytics/faculty-list`);
            console.log('Faculty list response:', res.data);
            setFacultyList(res.data);
        } catch (err) {
            console.error('Error fetching faculty list:', err);
            setError('Failed to fetch faculty list');
        }
    };

    // Transform raw ratings data into chart-friendly format
    const transformChartData = (ratings: FacultyRating[]): ChartDataPoint[] => {
        const groupedData: Record<string, Record<string, { 
            ratings: number[]; 
            courseName: string;
            studentCounts: number[];
        }>> = {};

        ratings.forEach(rating => {
            const date = rating.session_date;
            const facultyName = rating.profiles.name;
            const courseName = rating.class_sessions?.course_sections?.courses?.course_name || 'N/A';
            const studentCount = rating.student_count || 0;

            if (!groupedData[date]) groupedData[date] = {};
            if (!groupedData[date][facultyName]) {
                groupedData[date][facultyName] = { 
                    ratings: [], 
                    courseName,
                    studentCounts: []
                };
            }

            groupedData[date][facultyName].ratings.push(rating.rating);
            groupedData[date][facultyName].studentCounts.push(studentCount);
        });

        const result: ChartDataPoint[] = Object.entries(groupedData).map(([date, facultyRatings]) => {
            const dataPoint: ChartDataPoint = {
                originalDate: date,
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };

            Object.entries(facultyRatings).forEach(([facultyName, data]) => {
                const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
                const totalStudents = data.studentCounts.reduce((a, b) => a + b, 0);
                
                dataPoint[facultyName] = Math.round(avg * 100) / 100;
                dataPoint[`__${facultyName}_course__`] = data.courseName;
                dataPoint[`__${facultyName}_count__`] = totalStudents;
            });

            return dataPoint;
        });

        return result.sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            const endpoint = selectedFaculty === 'all'
                ? `${API_BASE_URL}/api/faculty-rating/analytics/allFacultyRatings`
                : `${API_BASE_URL}/api/faculty-rating/analytics/daily-aggregates`;

            console.log('Fetching from:', endpoint);

            const res = await axios.get(endpoint, {
                params: {
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    faculty_id: selectedFaculty !== 'all' ? selectedFaculty : undefined
                }
            });

            console.log('API Response:', res.data);

            if (selectedFaculty === 'all') {
                // API now returns data in the correct format directly
                setHeatmapData(res.data);
                setTableData([]);
            } else {
                const ratingsArray = Array.isArray(res.data) ? res.data : res.data.ratings || [];
                setTableData(ratingsArray);
                setChartData(transformChartData(ratingsArray));
            }

        } catch (err: any) {
            console.error('Error fetching analytics:', err);

            if (err.response?.status === 401) {
                setError('Session expired. Please login again.');
            } else if (err.response?.status === 500) {
                setError('Server error. Please try again later.');
            } else if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Failed to fetch analytics data');
            }
        } finally {
            setLoading(false);
        }
    };

    const getFacultyKeys = (): string[] => {
        if (chartData.length === 0) return [];
        return Object.keys(chartData[0]).filter(
            key => key !== 'date' && key !== 'originalDate' && !key.startsWith('__') && !key.endsWith('__')
        );
    };

    const facultyKeys = getFacultyKeys();

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const entry = payload[0];
            const facultyName = entry.dataKey;
            const courseName = entry.payload[`__${facultyName}_course__`];
            const studentCount = entry.payload[`__${facultyName}_count__`];
            
            return (
                <div className="custom-tooltip">
                    <p>{facultyName}</p>
                    <p>Rating: {entry.value}/5</p>
                    <p>Course: {courseName}</p>
                    {studentCount !== undefined && (
                        <p>Students: {studentCount}</p>
                    )}
                </div>
            );
        }
        return null;
    };

    // Updated Heatmap component with student count display
    const Heatmap = ({ data }: { data: HeatmapDataPoint[] }) => {
        if (!data || data.length === 0) {
            return (
                <div className="heatmap-container">
                    <p>No heatmap data available</p>
                </div>
            );
        }

        // Get all faculty names (excluding _count fields and date)
        const allFaculties = Array.from(new Set(
            data.flatMap(row =>
                Object.keys(row).filter(key =>
                    key !== 'date' &&
                    !key.endsWith('_count') &&
                    typeof row[key] === 'number'
                )
            )
        ));

        console.log('Heatmap faculties:', allFaculties);

        if (allFaculties.length === 0) {
            return (
                <div className="heatmap-container">
                    <p>No faculty data found</p>
                </div>
            );
        }

        return (
            <div className="heatmap-container">
                <div className="heatmap-info">
                    <p>Faculty Performance Heatmap ({data.length} days, {allFaculties.length} faculty members)</p>
                    <small style={{ color: '#666' }}>Hover over cells to see student response count</small>
                </div>
                <table className="heatmap-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            {allFaculties.map(faculty => (
                                <th key={faculty} title={faculty}>
                                    {faculty.length > 15 ? faculty.substring(0, 15) + '...' : faculty}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                            <tr key={i}>
                                <td>{new Date(row.date).toLocaleDateString()}</td>
                                {allFaculties.map(faculty => {
                                    const rating = row[faculty];
                                    const studentCount = row[`${faculty}_count`];
                                    const numericRating = typeof rating === 'number' ? rating : undefined;
                                    const numericCount = typeof studentCount === 'number' ? studentCount : 0;

                                    return (
                                        <td
                                            key={faculty}
                                            style={{
                                                backgroundColor: getHeatmapColor(numericRating),
                                                color: '#000',
                                                textAlign: 'center',
                                                padding: '8px 4px',
                                                fontWeight: numericRating !== undefined ? 600 : 400,
                                                position: 'relative',
                                            }}
                                            title={`${faculty}: ${numericRating !== undefined ? numericRating + '/5' : 'No rating'}\nStudents responded: ${numericCount}`}
                                        >
                                            {numericRating !== undefined ? (
                                                <div>
                                                    <div style={{ fontSize: '16px' }}>{numericRating}</div>
                                                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                                        ({numericCount} {numericCount === 1 ? 'student' : 'students'})
                                                    </div>
                                                </div>
                                            ) : '-'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="page-container">
            <div className="chart-card">
                <div className="chart-controls">
                    <div className="control-group">
                        <label>Faculty</label>
                        <select onChange={e => setSelectedFaculty(e.target.value)} value={selectedFaculty}>
                            <option value="all">All Faculties</option>
                            {facultyList.map(f => (
                                <option key={f.faculty_id} value={f.faculty_id}>
                                    {f.faculty_name} {f.department && `(${f.department})`}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="control-group">
                        <label>Start Date</label>
                        <DatePicker
                            selected={startDate}
                            onChange={date => date && setStartDate(date)}
                            dateFormat="yyyy-MM-dd"
                            maxDate={new Date()}
                        />
                    </div>
                    <div className="control-group">
                        <label>End Date</label>
                        <DatePicker
                            selected={endDate}
                            onChange={date => date && setEndDate(date)}
                            dateFormat="yyyy-MM-dd"
                            maxDate={new Date()}
                            minDate={startDate}
                        />
                    </div>
                    <button onClick={fetchAnalytics} disabled={loading}>
                        {loading ? 'Loading...' : 'Show Data'}
                    </button>
                </div>

                <div className="tabs">
                    <button
                        className={activeTab === 'chart' ? 'active' : ''}
                        onClick={() => setActiveTab('chart')}
                    >
                        Chart
                    </button>
                    <button
                        className={activeTab === 'table' ? 'active' : ''}
                        onClick={() => setActiveTab('table')}
                    >
                        Table
                    </button>
                </div>

                {error && (
                    <div className="error-box">
                        ❌ {error}
                        <button onClick={() => setError(null)} style={{ marginLeft: '10px' }}>✕</button>
                    </div>
                )}

                {process.env.NODE_ENV === 'development' && (
                    <div style={{ fontSize: '12px', color: '#666', margin: '10px 0' }}>
                        Debug: {selectedFaculty === 'all' ? 'Heatmap' : 'Chart'} mode,
                        {selectedFaculty === 'all' ? heatmapData.length : chartData.length} data points
                    </div>
                )}

                {activeTab === 'chart' && selectedFaculty === 'all' && (
                    <Heatmap data={heatmapData} />
                )}

                {activeTab === 'chart' && selectedFaculty !== 'all' && chartData.length > 0 && (
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={500}>
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="4" stroke="#6b7280" strokeWidth={2} />
                                <XAxis
                                    dataKey="date"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={0}
                                    tick={{ fill: '#111827', fontWeight: 600, fontSize: 16 }}
                                />
                                <YAxis
                                    domain={[0, 5]}
                                    tickCount={6}
                                    tick={{ fill: '#111827', fontWeight: 600 }}
                                    label={{
                                        value: 'Rating',
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: { fill: '#111827', fontWeight: 'bold' }
                                    }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px', color: '#374151', fontWeight: 600 }}
                                    iconType="circle"
                                />
                                {facultyKeys.map((key) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke="#1a1a1a"
                                        strokeWidth={3}
                                        dot={{ r: 6, fill: '#fff', strokeWidth: 2, stroke: '#1a1a1a' }}
                                        activeDot={{ r: 9, fill: '#1a1a1a', strokeWidth: 2, stroke: '#fff' }}
                                        name={key}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {activeTab === 'table' && tableData.length > 0 && (
                    <div className="table-container">
                        <table className="ratings-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Faculty</th>
                                    <th>Course</th>
                                    <th>Batch</th>
                                    <th>Rating</th>
                                    <th>Students</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, i) => (
                                    <tr key={i}>
                                        <td>{new Date(row.session_date).toLocaleDateString()}</td>
                                        <td>{row.profiles.name}</td>
                                        <td>{row.class_sessions.course_sections.courses.course_name}</td>
                                        <td>{row.class_sessions.course_sections.batches.batch_name}</td>
                                        <td>
                                            <span style={{
                                                color: row.rating >= 4 ? 'green' : row.rating >= 3 ? 'orange' : 'red'
                                            }}>
                                                {row.rating}/5
                                            </span>
                                        </td>
                                        <td>{row.student_count || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && chartData.length === 0 && heatmapData.length === 0 && tableData.length === 0 && (
                    <div className="no-data">
                        <p>📊 No data available</p>
                        <small>Try adjusting the date range or faculty selection</small>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAnalytics;