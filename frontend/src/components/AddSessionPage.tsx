import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./addSession.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Faculty { id: number; name: string; }
interface Section { id: number; course_name: string; }

const SESSION_TYPES = ["theory", "practical", "tutorial", "evaluation", "other"];

const AddSessionPage: React.FC = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState<{ id: number; batch_name: string }[]>([]);
    const [batchId, setBatchId] = useState("");

    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [facultyId, setFacultyId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState(60);
    const [venue, setVenue] = useState("");
    const [type, setType] = useState("theory");

    // 🔥 CHANGE 1: Only fetch batches on initial load
    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const batchRes = await axios.get(`${API_BASE_URL}/api/schedule/getAllBatches`);
                setBatches(batchRes.data.batches);
            } catch (err) {
                console.error("Error fetching batches:", err);
            }
        };
        fetchBatches();
    }, []);

    // 🔥 CHANGE 2: New useEffect that runs when batchId changes
    useEffect(() => {
        const fetchBatchSpecificData = async () => {
            if (!batchId) {
                // If no batch selected, clear the dropdowns
                setFaculties([]);
                setSections([]);
                setFacultyId("");
                setSectionId("");
                return;
            }

            try {
                // Fetch faculties for the selected batch
                const facRes = await axios.get(
                    `${API_BASE_URL}/api/schedule/classSessions/getFaculty?batch_id=${batchId}`
                );
                setFaculties(facRes.data);

                // Fetch sections for the selected batch
                const secRes = await axios.get(
                    `${API_BASE_URL}/api/schedule/classCourses?batch_id=${batchId}`
                );
                setSections(secRes.data);

                // Reset the selected faculty and section when batch changes
                setFacultyId("");
                setSectionId("");

            } catch (err) {
                console.error("Error fetching batch-specific data:", err);
            }
        };

        fetchBatchSpecificData();
    }, [batchId]); // This runs every time batchId changes

    const handleSubmit = async () => {
        if (!batchId) {
            alert("Please select a batch first");
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/api/schedule/addSession`, {
                section_id: Number(sectionId),
                batch_id: Number(batchId),
                faculty_id: facultyId,
                session_type: type,
                start_date: date,
                class_time: time,
                duration,
                venue
            });
            alert("Session Added");
            navigate("/class-sessions");
        } catch (err) {
            console.error("Error creating session:", err);
            alert("Error creating session");
        }
    };

    return (
        <div className="add-session-container">
            <h2 className="title">Add Session</h2>

            {/* 🔥 CHANGE 3: Made batch selection more prominent */}
            <div className="form-group">
                <label>Batch *</label>
                <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    style={{ backgroundColor: !batchId ? '#fffacd' : '' }} // Highlight if not selected
                >
                    <option value="">--Select Batch First--</option>
                    {batches.map(b => (
                        <option key={b.id} value={b.id}>
                            {b.batch_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 🔥 CHANGE 4: Disable faculty dropdown until batch is selected */}
            <div className="form-group">
                <label>Faculty</label>
                <select
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    disabled={!batchId}
                >
                    <option value="">
                        {!batchId ? "--Select Batch First--" : "--Select Faculty--"}
                    </option>
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            </div>

            {/* 🔥 CHANGE 5: Disable section dropdown until batch is selected */}
            <div className="form-group">
                <label>Section</label>
                <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    disabled={!batchId}
                >
                    <option value="">
                        {!batchId ? "--Select Batch First--" : "--Select Section--"}
                    </option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.course_name}</option>)}
                </select>
            </div>

            <div className="form-group">
                <label>Date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="form-group">
                <label>Time</label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>

            <div className="form-group">
                <label>Duration (minutes)</label>
                <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>

            <div className="form-group">
                <label>Venue</label>
                <input value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>

            <div className="form-group">
                <label>Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                    {SESSION_TYPES.map((t) => (
                        <option key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            <button className="submit-btn" onClick={handleSubmit}>Create</button>
        </div>
    );
};

export default AddSessionPage;