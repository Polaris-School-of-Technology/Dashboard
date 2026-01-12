import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './facultyRatings.css';
import MultiSelect from './MultiSelect';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface FacultyRating {
    rating: number;
    session_date: string;
    faculty_id: string;
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
    faculty_name: string;  // This matches your API response
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

// Add interface for the heatmap API response
interface HeatmapRawData {
    date: string;
    faculty: string;
    rating: number;
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
    const [selectedFaculties, setSelectedFaculties] = useState<string[]>(['all']);
    const [hoveredFaculty, setHoveredFaculty] = useState<string | null>(null);
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
            console.log('Faculty list response:', res.data); // Debug log
            setFacultyList(res.data);
        } catch (err) {
            console.error('Error fetching faculty list:', err);
            setError('Failed to fetch faculty list');
        }
    };

    // Transform raw ratings data into chart-friendly format
    const transformChartData = (ratings: FacultyRating[]): ChartDataPoint[] => {
        const groupedData: Record<string, Record<string, { ratings: number[]; courseName: string }>> = {};

        ratings.forEach(rating => {
            const date = rating.session_date;
            const facultyName = rating.profiles.name;
            const courseName = rating.class_sessions?.course_sections?.courses?.course_name || 'N/A';

            if (!groupedData[date]) groupedData[date] = {};
            if (!groupedData[date][facultyName]) {
                groupedData[date][facultyName] = { ratings: [], courseName };
            }

            groupedData[date][facultyName].ratings.push(rating.rating);
        });

        const result: ChartDataPoint[] = Object.entries(groupedData).map(([date, facultyRatings]) => {
            const dataPoint: ChartDataPoint = {
                originalDate: date,
                date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            };

            Object.entries(facultyRatings).forEach(([facultyName, data]) => {
                const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
                dataPoint[facultyName] = Math.round(avg * 100) / 100;
                dataPoint[`__${facultyName}_course__`] = data.courseName;
            });

            return dataPoint;
        });

        return result.sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
    };

    // FIXED: Transform raw all-faculty ratings into proper heatmap format
    const transformHeatmapData = (data: HeatmapRawData[]): HeatmapDataPoint[] => {
        console.log('Raw heatmap data:', data); // Debug log

        if (!Array.isArray(data)) {
            console.error('Expected array but got:', typeof data);
            return [];
        }

        // Group by date first
        const groupedByDate: Record<string, Record<string, number>> = {};

        data.forEach(item => {
            if (!item.date || !item.faculty || item.rating === undefined) {
                console.warn('Invalid data item:', item);
                return;
            }

            if (!groupedByDate[item.date]) {
                groupedByDate[item.date] = {};
            }

            // If multiple ratings for same faculty on same date, take average
            if (groupedByDate[item.date][item.faculty]) {
                const existingRating = groupedByDate[item.date][item.faculty];
                groupedByDate[item.date][item.faculty] = (existingRating + item.rating) / 2;
            } else {
                groupedByDate[item.date][item.faculty] = item.rating;
            }
        });

        // Convert to heatmap format
        const result = Object.entries(groupedByDate).map(([date, facultyRatings]) => {
            const heatmapPoint: HeatmapDataPoint = { date };
            Object.entries(facultyRatings).forEach(([facultyName, rating]) => {
                heatmapPoint[facultyName] = Math.round(rating * 100) / 100;
            });
            return heatmapPoint;
        });

        console.log('Transformed heatmap data:', result.slice(0, 2)); // Debug log
        return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        setError(null);

        try {
            const isAllSelected = selectedFaculties.includes('all') || selectedFaculties.length === 0;

            const endpoint = isAllSelected
                ? `${API_BASE_URL}/api/faculty-rating/analytics/allFacultyRatings`
                : `${API_BASE_URL}/api/faculty-rating/analytics/daily-aggregates`;

            console.log('Fetching from:', endpoint); // Debug log



            const res = await axios.get(endpoint, {
                params: {
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                    faculty_id: !isAllSelected ? selectedFaculties.join(',') : undefined
                }
            });

            console.log('API Response:', res.data); // Debug log

            if (isAllSelected) {
                // directly set heatmap data, no transformation needed for your current API shape
                setHeatmapData(res.data);
                setTableData([]);
            } else {
                const ratingsArray = Array.isArray(res.data) ? res.data : res.data.ratings || [];
                setTableData(ratingsArray);
                setChartData(transformChartData(ratingsArray));
            }


        } catch (err: any) {
            console.error('Error fetching analytics:', err);

            // Better error handling
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
            // If we are hovering a specific line, prioritize that entry
            const targetEntry = hoveredFaculty
                ? payload.find((p: any) => p.dataKey === hoveredFaculty)
                : payload[0];

            if (!targetEntry) return null;

            const facultyName = targetEntry.dataKey;
            const courseName = targetEntry.payload[`__${facultyName}_course__`];
            return (
                <div className="custom-tooltip">
                    <p>{facultyName}</p>
                    <p>Rating: {targetEntry.value}/5</p>
                    <p>Course: {courseName}</p>
                </div>
            );
        }
        return null;
    };

    // IMPROVED: Heatmap component with better data handling
    const Heatmap = ({ data }: { data: HeatmapDataPoint[] }) => {
        if (!data || data.length === 0) {
            return (
                <div className="heatmap-container">
                    <p>No heatmap data available</p>
                </div>
            );
        }

        // Calculate all faculties from the data
        const allFaculties = Array.from(new Set(
            data.flatMap(row =>
                Object.keys(row).filter(key =>
                    key !== 'date' &&
                    typeof row[key] === 'number'
                )
            )
        ));

        console.log('Heatmap faculties:', allFaculties); // Debug log

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
                                    const numericRating = typeof rating === 'number' ? rating : undefined;

                                    return (
                                        <td
                                            key={faculty}
                                            style={{
                                                backgroundColor: getHeatmapColor(numericRating),
                                                color: '#000', // always black text
                                                textAlign: 'center',
                                                padding: '8px 4px',
                                                fontWeight: numericRating !== undefined ? 600 : 400,
                                            }}
                                            title={`${faculty}: ${numericRating !== undefined ? numericRating : 'No rating'}`}
                                        >
                                            {numericRating !== undefined ? numericRating : '-'}
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
                        <MultiSelect
                            options={facultyList.map(f => ({
                                value: f.faculty_id,
                                label: f.faculty_name + (f.department ? ` (${f.department})` : '')
                            }))}
                            selectedValues={selectedFaculties}
                            onChange={setSelectedFaculties}
                            placeholder="Select Faculty..."
                        />
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

                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                    <div style={{ fontSize: '12px', color: '#666', margin: '10px 0' }}>
                        Debug: {selectedFaculties.includes('all') ? 'Heatmap' : 'Chart'} mode,
                        {selectedFaculties.includes('all') ? heatmapData.length : chartData.length} data points
                    </div>
                )}

                {activeTab === 'chart' && selectedFaculties.includes('all') && (
                    <Heatmap data={heatmapData} />
                )}

                {activeTab === 'chart' && !selectedFaculties.includes('all') && chartData.length > 0 && (
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
                                <Tooltip content={<CustomTooltip />} shared={false} cursor={{ strokeDasharray: '3 3' }} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px', color: '#374151', fontWeight: 600 }}
                                    iconType="circle"
                                />
                                {facultyKeys.map((key, index) => {
                                    const colors = [
                                        '#4f46e5', '#db2777', '#16a34a', '#ea580c', '#0891b2',
                                        '#9333ea', '#dc2626', '#b45309', '#059669', '#2563eb'
                                    ];
                                    const color = colors[index % colors.length];

                                    const isHovered = hoveredFaculty === key;
                                    const isDimmed = hoveredFaculty !== null && !isHovered;

                                    return (
                                        <Line
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={color}
                                            strokeWidth={isHovered ? 4 : 3}
                                            strokeOpacity={isDimmed ? 0.2 : 1}
                                            dot={{ r: 6, fill: '#fff', strokeWidth: 2, stroke: color }}
                                            activeDot={isHovered ? { r: 8, strokeWidth: 0 } : false}
                                            name={key}
                                            onMouseEnter={() => setHoveredFaculty(key)}
                                            onMouseLeave={() => setHoveredFaculty(null)}
                                        />
                                    );
                                })}
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