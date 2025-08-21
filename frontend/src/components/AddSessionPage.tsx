import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./addSession.css";

const API_BASE_URL = process.env.REACT_APP_API_URL; 

interface Faculty { id: number; name: string; }
interface Section { id: number; course_name: string; }

const AddSessionPage: React.FC = () => {
    const navigate = useNavigate();
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [facultyId, setFacultyId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [duration, setDuration] = useState(60);
    const [venue, setVenue] = useState("");
    const [type, setType] = useState<"theory" | "practical" | "tutorial" | "other">("theory");

    useEffect(() => {
        const fetchDrop = async () => {
            try {
                const facRes = await axios.get(`${API_BASE_URL}/api/schedule/classSessions/getFaculty`);
                setFaculties(facRes.data);

                const secRes = await axios.get(`${API_BASE_URL}/api/schedule/classCourses`);
                setSections(secRes.data);
            } catch (err) {
                console.error("Error fetching faculties or sections:", err);
            }
        };
        fetchDrop();
    }, []);

    const handleSubmit = async () => {
        try {
            await axios.post(`${API_BASE_URL}/api/schedule/addSession`, {
                section_id: Number(sectionId),
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

            <div className="form-group">
                <label>Faculty</label>
                <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
                    <option value="">--Select--</option>
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
            </div>

            <div className="form-group">
                <label>Section</label>
                <select value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                    <option value="">--Select--</option>
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
                <select value={type} onChange={(e) => setType(e.target.value as any)}>
                    <option value="theory">theory</option>
                    <option value="practical">practical</option>
                    <option value="tutorial">tutorial</option>
                    <option value="other">other</option>
                </select>
            </div>

            <button className="submit-btn" onClick={handleSubmit}>Create</button>
        </div>
    );
};

export default AddSessionPage;
