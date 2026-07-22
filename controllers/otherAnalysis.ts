import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// Define types for clarity
interface FacultyProfile {
    name: string;
}

interface Course {
    course_name: string;
}

interface CourseSection {
    course_id: number;
    courses: Course | null;
}

interface ClassSession {
    id: number;
    session_datetime: string | null;
    section_id: number | null;
    course_sections: CourseSection | null;
}

interface SessionQuestion {
    feedback_question_id: number;
}

interface SessionResponse {
    session_id: number;
    response_text: string;
    profiles: FacultyProfile | null;
    class_sessions: ClassSession | null;
    session_questions: SessionQuestion | null;
}


export const sessionQuestions = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from("feedback_questions")
            .select("*")
            .in("id", [5, 6, 7, 8]); // only fetch these question IDs

        if (error) {
            console.error("Supabase Error:", error.message);
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ data });
    } catch (err) {
        console.error("Server Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const pieChartForQuestionOld = async (req: Request, res: Response) => {
    try {
        const { facultyId, start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "questionId, start_date, and end_date are required" });
        }
        const questionId = 5

        const { data, error } = await supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                response_text,
                profiles!session_responses_feedback_faculty_id_fkey(name),
                class_sessions(
                    id,
                    session_datetime,
                    section_id,
                    course_sections(
                        course_id,
                        courses(course_name)
                    )
                ),
                session_questions!session_responses_feedback_question_id_fkey(feedback_question_id)
            `)
            .eq("session_questions.feedback_question_id", questionId)
            .gte("class_sessions.session_datetime", start_date)
            .lte("class_sessions.session_datetime", end_date);

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        let filteredData = data || [];
        if (facultyId) {
            filteredData = filteredData.filter((item: any) => item.profiles?.name === facultyId);
        }

        const groupedByFaculty = filteredData.reduce((acc: Record<string, any>, curr: any) => {
            // Handle class_sessions as array - get first element
            const session = Array.isArray(curr.class_sessions) ? curr.class_sessions[0] : curr.class_sessions;

            if (!session || !session.course_sections?.courses || !curr.profiles) {
                return acc;
            }

            const facultyName = curr.profiles.name;

            if (!acc[facultyName]) {
                acc[facultyName] = {
                    faculty_name: facultyName,
                    total_responses: 0,
                    sessions: [],
                    feedbacks: [],
                    courses: new Set(),
                };
            }

            acc[facultyName].feedbacks.push(curr.response_text);
            acc[facultyName].total_responses++;
            acc[facultyName].courses.add(session.course_sections.courses.course_name);

            const sessionExists = acc[facultyName].sessions.some(
                (s: any) => s.session_id === curr.session_id
            );

            if (!sessionExists) {
                acc[facultyName].sessions.push({
                    session_id: curr.session_id,
                    session_datetime: session.session_datetime,
                    section_id: session.section_id,
                    course_name: session.course_sections.courses.course_name,
                });
            }

            return acc;
        }, {});

        const groupedArray = Object.values(groupedByFaculty).map((faculty: any) => ({
            ...faculty,
            courses: Array.from(faculty.courses),
            session_count: faculty.sessions.length,
        }));

        res.status(200).json({
            message: "Success",
            facultyId,
            start_date,
            end_date,
            questionId,
            total_faculty: groupedArray.length,
            data: groupedArray
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
export const pieChartForQuestion7Old = async (req: Request, res: Response) => {
    try {
        const { facultyId, start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "questionId, start_date, and end_date are required" });
        }
        const questionId = 7

        const { data, error } = await supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                response_text,
                profiles!session_responses_feedback_faculty_id_fkey(name),
                class_sessions(
                    id,
                    session_datetime,
                    section_id,
                    course_sections(
                        course_id,
                        courses(course_name)
                    )
                ),
                session_questions!session_responses_feedback_question_id_fkey(feedback_question_id)
            `)
            .eq("session_questions.feedback_question_id", questionId)
            .gte("class_sessions.session_datetime", start_date)
            .lte("class_sessions.session_datetime", end_date);

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        let filteredData = data || [];
        if (facultyId) {
            filteredData = filteredData.filter((item: any) => item.profiles?.name === facultyId);
        }

        const groupedByFaculty = filteredData.reduce((acc: Record<string, any>, curr: any) => {
            const session = Array.isArray(curr.class_sessions) ? curr.class_sessions[0] : curr.class_sessions;

            if (!session || !session.course_sections?.courses || !curr.profiles) {
                return acc;
            }

            const facultyName = curr.profiles.name;

            if (!acc[facultyName]) {
                acc[facultyName] = {
                    faculty_name: facultyName,
                    total_responses: 0,
                    sessions: [],
                    feedbacks: [],
                    courses: new Set(),
                };
            }

            acc[facultyName].feedbacks.push(curr.response_text);
            acc[facultyName].total_responses++;
            acc[facultyName].courses.add(session.course_sections.courses.course_name);

            const sessionExists = acc[facultyName].sessions.some(
                (s: any) => s.session_id === curr.session_id
            );

            if (!sessionExists) {
                acc[facultyName].sessions.push({
                    session_id: curr.session_id,
                    session_datetime: session.session_datetime,
                    section_id: session.section_id,
                    course_name: session.course_sections.courses.course_name,
                });
            }

            return acc;
        }, {});

        const groupedArray = Object.values(groupedByFaculty).map((faculty: any) => ({
            ...faculty,
            courses: Array.from(faculty.courses),
            session_count: faculty.sessions.length,
        }));

        res.status(200).json({
            message: "Success",
            facultyId,
            start_date,
            end_date,
            questionId,
            total_faculty: groupedArray.length,
            data: groupedArray
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const ratingsChartForQuestionOld = async (req: Request, res: Response) => {
    try {
        const { facultyId, start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "questionId, start_date, and end_date are required" });
        }
        const questionId = 6

        const { data, error } = await supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                response_text,
                profiles!session_responses_feedback_faculty_id_fkey(name),
                class_sessions(
                    id,
                    session_datetime,
                    section_id,
                    course_sections(
                        course_id,
                        courses(course_name)
                    )
                ),
                session_questions!session_responses_feedback_question_id_fkey(feedback_question_id)
            `)
            .eq("session_questions.feedback_question_id", questionId)
            .gte("class_sessions.session_datetime", start_date)
            .lte("class_sessions.session_datetime", end_date);

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        let filteredData = data || [];
        if (facultyId) {
            filteredData = filteredData.filter((item: any) => item.profiles?.name === facultyId);
        }

        const groupedByFaculty = filteredData.reduce((acc: Record<string, any>, curr: any) => {
            const session = Array.isArray(curr.class_sessions) ? curr.class_sessions[0] : curr.class_sessions;

            if (!session || !session.course_sections?.courses || !curr.profiles) {
                return acc;
            }

            const facultyName = curr.profiles.name;

            if (!acc[facultyName]) {
                acc[facultyName] = {
                    faculty_name: facultyName,
                    total_responses: 0,
                    sessions: [],
                    feedbacks: [],
                    courses: new Set(),
                };
            }

            const rating = Number(curr.response_text);
            if (!isNaN(rating)) {
                acc[facultyName].feedbacks.push(rating);
                acc[facultyName].total_responses++;
            }

            acc[facultyName].courses.add(session.course_sections.courses.course_name);

            const sessionExists = acc[facultyName].sessions.some(
                (s: any) => s.session_id === curr.session_id
            );
            if (!sessionExists) {
                acc[facultyName].sessions.push({
                    session_id: curr.session_id,
                    session_datetime: session.session_datetime,
                    section_id: session.section_id,
                    course_name: session.course_sections.courses.course_name,
                });
            }

            return acc;
        }, {});

        const groupedArray = Object.values(groupedByFaculty).map((faculty: any) => ({
            ...faculty,
            courses: Array.from(faculty.courses),
            session_count: faculty.sessions.length,
        }));

        res.status(200).json({
            message: "Success",
            facultyId,
            start_date,
            end_date,
            questionId,
            total_faculty: groupedArray.length,
            data: groupedArray,
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


export const ratingsChartForQuestionId8Old = async (req: Request, res: Response) => {
    try {
        const { facultyId, start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "questionId, start_date, and end_date are required" });
        }
        const questionId = 8

        const { data, error } = await supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                response_text,
                profiles!session_responses_feedback_faculty_id_fkey(name),
                class_sessions(
                    id,
                    session_datetime,
                    section_id,
                    course_sections(
                        course_id,
                        courses(course_name)
                    )
                ),
                session_questions!session_responses_feedback_question_id_fkey(feedback_question_id)
            `)
            .eq("session_questions.feedback_question_id", questionId)
            .gte("class_sessions.session_datetime", start_date)
            .lte("class_sessions.session_datetime", end_date);

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        let filteredData = data || [];
        if (facultyId) {
            filteredData = filteredData.filter((item: any) => item.profiles?.name === facultyId);
        }

        const groupedByFaculty = filteredData.reduce((acc: Record<string, any>, curr: any) => {
            const session = Array.isArray(curr.class_sessions) ? curr.class_sessions[0] : curr.class_sessions;

            if (!session || !session.course_sections?.courses || !curr.profiles) {
                return acc;
            }

            const facultyName = curr.profiles.name;

            if (!acc[facultyName]) {
                acc[facultyName] = {
                    faculty_name: facultyName,
                    total_responses: 0,
                    sessions: [],
                    feedbacks: [],
                    courses: new Set(),
                };
            }

            const rating = Number(curr.response_text);
            if (!isNaN(rating)) {
                acc[facultyName].feedbacks.push(rating);
                acc[facultyName].total_responses++;
            }

            acc[facultyName].courses.add(session.course_sections.courses.course_name);

            const sessionExists = acc[facultyName].sessions.some(
                (s: any) => s.session_id === curr.session_id
            );
            if (!sessionExists) {
                acc[facultyName].sessions.push({
                    session_id: curr.session_id,
                    session_datetime: session.session_datetime,
                    section_id: session.section_id,
                    course_name: session.course_sections.courses.course_name,
                });
            }

            return acc;
        }, {});

        const groupedArray = Object.values(groupedByFaculty).map((faculty: any) => ({
            ...faculty,
            courses: Array.from(faculty.courses),
            session_count: faculty.sessions.length,
        }));

        res.status(200).json({
            message: "Success",
            facultyId,
            start_date,
            end_date,
            questionId,
            total_faculty: groupedArray.length,
            data: groupedArray,
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// Newer functions - these already have correct typing
export const pieChartForQuestion = async (req: Request, res: Response) => {
    try {
        const { facultyId, start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        const questionIdFilter = 5;

        const isUUID = (str: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        let query = supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                response_text,
                faculty_id,
                question_id,
                profiles!session_responses_feedback_faculty_id_fkey(name),
                class_sessions(
                    id,
                    session_datetime,
                    section_id,
                    course_sections(
                        course_id,
                        courses(course_name)
                    )
                ),
                session_questions!inner!session_responses_feedback_question_id_fkey(
                    feedback_question_id,
                    question_text
                )
            `)
            .eq("session_questions.feedback_question_id", questionIdFilter)
            .gte("class_sessions.session_datetime", start_date)
            .lte("class_sessions.session_datetime", end_date);

        if (facultyId) {
            if (isUUID(facultyId)) query = query.eq("faculty_id", facultyId);
            else query = query.eq("profiles.name", facultyId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        const groupedData = (data || []).reduce((acc: Record<string, any>, curr: any) => {
            const session = Array.isArray(curr.class_sessions) ? curr.class_sessions[0] : curr.class_sessions;

            if (!session || !session.course_sections?.courses || !curr.profiles) return acc;

            const fId = curr.faculty_id;
            const fName = curr.profiles.name;

            if (!acc[fId]) {
                acc[fId] = {
                    faculty_id: fId,
                    faculty_name: fName,
                    feedbacks: [],
                    sessions: [],
                    courses: new Set(),
                };
            }

            acc[fId].feedbacks.push(curr.response_text);
            acc[fId].courses.add(session.course_sections.courses.course_name);

            const sessionExists = acc[fId].sessions.some((s: any) => s.session_id === curr.session_id);
            if (!sessionExists) {
                acc[fId].sessions.push({
                    session_id: curr.session_id,
                    session_datetime: session.session_datetime,
                    section_id: session.section_id,
                    course_name: session.course_sections.courses.course_name,
                });
            }

            return acc;
        }, {});

        const result = Object.values(groupedData).map((faculty: any) => ({
            faculty_id: faculty.faculty_id,
            faculty_name: faculty.faculty_name,
            feedbacks: faculty.feedbacks,
            sessions: faculty.sessions,
            courses: Array.from(faculty.courses),
            session_count: faculty.sessions.length
        }));

        res.status(200).json({
            message: "Success",
            start_date,
            end_date,
            facultyId: facultyId || "all",
            questionId: questionIdFilter,
            total_faculty: result.length,
            data: result
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const pieChartForQuestion7 = async (req: Request, res: Response) => {
    try {
        const { facultyId, start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        const questionIdFilter = 7;

        const isUUID = (str: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        let query = supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                response_text,
                faculty_id,
                question_id,
                profiles!session_responses_feedback_faculty_id_fkey(name),
                class_sessions(
                    id,
                    session_datetime,
                    section_id,
                    course_sections(
                        course_id,
                        courses(course_name)
                    )
                ),
                session_questions!inner!session_responses_feedback_question_id_fkey(
                    feedback_question_id,
                    question_text
                )
            `)
            .eq("session_questions.feedback_question_id", questionIdFilter)
            .gte("class_sessions.session_datetime", start_date)
            .lte("class_sessions.session_datetime", end_date);

        if (facultyId) {
            if (isUUID(facultyId)) query = query.eq("faculty_id", facultyId);
            else query = query.eq("profiles.name", facultyId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        const groupedData = (data || []).reduce((acc: Record<string, any>, curr: any) => {
            const session = Array.isArray(curr.class_sessions) ? curr.class_sessions[0] : curr.class_sessions;

            if (!session || !session.course_sections?.courses || !curr.profiles) return acc;

            const fId = curr.faculty_id;
            const fName = curr.profiles.name;

            if (!acc[fId]) {
                acc[fId] = {
                    faculty_id: fId,
                    faculty_name: fName,
                    feedbacks: [],
                    sessions: [],
                    courses: new Set(),
                };
            }

            acc[fId].feedbacks.push(curr.response_text);
            acc[fId].courses.add(session.course_sections.courses.course_name);

            const sessionExists = acc[fId].sessions.some((s: any) => s.session_id === curr.session_id);
            if (!sessionExists) {
                acc[fId].sessions.push({
                    session_id: curr.session_id,
                    session_datetime: session.session_datetime,
                    section_id: session.section_id,
                    course_name: session.course_sections.courses.course_name,
                });
            }

            return acc;
        }, {});

        const result = Object.values(groupedData).map((faculty: any) => ({
            faculty_id: faculty.faculty_id,
            faculty_name: faculty.faculty_name,
            feedbacks: faculty.feedbacks,
            sessions: faculty.sessions,
            courses: Array.from(faculty.courses),
            session_count: faculty.sessions.length
        }));

        res.status(200).json({
            message: "Success",
            start_date,
            end_date,
            facultyId: facultyId || "all",
            questionId: questionIdFilter,
            total_faculty: result.length,
            data: result
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const ratingsChartForQuestionId8 = async (req: Request, res: Response) => {
    try {
        const { facultyId, start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        const questionId = 8;

        const isUUID = (str: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        let query = supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                response_text,
                faculty_id,
                question_id,
                profiles!session_responses_feedback_faculty_id_fkey(name),
                class_sessions(
                    id,
                    session_datetime,
                    section_id,
                    course_sections(
                        course_id,
                        courses(course_name)
                    )
                ),
                session_questions!inner!session_responses_feedback_question_id_fkey(
                    feedback_question_id,
                    question_text
                )
            `)
            .eq("session_questions.feedback_question_id", questionId)
            .gte("class_sessions.session_datetime", start_date)
            .lte("class_sessions.session_datetime", end_date);

        if (facultyId) {
            if (isUUID(facultyId)) query = query.eq("faculty_id", facultyId);
            else query = query.eq("profiles.name", facultyId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        const groupedData = (data || []).reduce((acc: Record<string, any>, curr: any) => {
            const session = Array.isArray(curr.class_sessions) ? curr.class_sessions[0] : curr.class_sessions;

            if (!session || !session.course_sections?.courses || !curr.profiles) return acc;

            const fId = curr.faculty_id;
            const fName = curr.profiles.name;

            if (!acc[fId]) {
                acc[fId] = {
                    faculty_id: fId,
                    faculty_name: fName,
                    feedbacks: [],
                    sessions: [],
                    courses: new Set(),
                    total_responses: 0
                };
            }

            const rating = Number(curr.response_text);
            if (!isNaN(rating)) {
                acc[fId].feedbacks.push(rating);
                acc[fId].total_responses++;
            }

            acc[fId].courses.add(session.course_sections.courses.course_name);

            const sessionExists = acc[fId].sessions.some((s: any) => s.session_id === curr.session_id);
            if (!sessionExists) {
                acc[fId].sessions.push({
                    session_id: curr.session_id,
                    session_datetime: session.session_datetime,
                    section_id: session.section_id,
                    course_name: session.course_sections.courses.course_name,
                });
            }

            return acc;
        }, {});

        const result = Object.values(groupedData).map((faculty: any) => ({
            faculty_id: faculty.faculty_id,
            faculty_name: faculty.faculty_name,
            feedbacks: faculty.feedbacks,
            sessions: faculty.sessions,
            courses: Array.from(faculty.courses),
            session_count: faculty.sessions.length,
            total_responses: faculty.total_responses
        }));

        res.status(200).json({
            message: "Success",
            start_date,
            end_date,
            facultyId: facultyId || "all",
            questionId,
            total_faculty: result.length,
            data: result
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const ratingsChartForQuestion = async (req: Request, res: Response) => {
    try {
        const { facultyId, start_date, end_date } = req.body;

        if (!start_date || !end_date) {
            return res.status(400).json({ error: "start_date and end_date are required" });
        }

        const questionId = 6;

        const isUUID = (str: string) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        let query = supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                response_text,
                faculty_id,
                question_id,
                profiles!session_responses_feedback_faculty_id_fkey(name),
                class_sessions(
                    id,
                    session_datetime,
                    section_id,
                    course_sections(
                        course_id,
                        courses(course_name)
                    )
                ),
                session_questions!inner!session_responses_feedback_question_id_fkey(
                    feedback_question_id,
                    question_text
                )
            `)
            .eq("session_questions.feedback_question_id", questionId)
            .gte("class_sessions.session_datetime", start_date)
            .lte("class_sessions.session_datetime", end_date);

        if (facultyId) {
            if (isUUID(facultyId)) query = query.eq("faculty_id", facultyId);
            else query = query.eq("profiles.name", facultyId);
        }

        const { data, error } = await query;

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        const groupedData = (data || []).reduce((acc: Record<string, any>, curr: any) => {
            const session = Array.isArray(curr.class_sessions) ? curr.class_sessions[0] : curr.class_sessions;

            if (!session || !session.course_sections?.courses || !curr.profiles) return acc;

            const fId = curr.faculty_id;
            const fName = curr.profiles.name;

            if (!acc[fId]) {
                acc[fId] = {
                    faculty_id: fId,
                    faculty_name: fName,
                    feedbacks: [],
                    sessions: [],
                    courses: new Set(),
                    total_responses: 0
                };
            }

            const rating = Number(curr.response_text);
            if (!isNaN(rating)) {
                acc[fId].feedbacks.push(rating);
                acc[fId].total_responses++;
            }

            acc[fId].courses.add(session.course_sections.courses.course_name);

            const sessionExists = acc[fId].sessions.some((s: any) => s.session_id === curr.session_id);
            if (!sessionExists) {
                acc[fId].sessions.push({
                    session_id: curr.session_id,
                    session_datetime: session.session_datetime,
                    section_id: session.section_id,
                    course_name: session.course_sections.courses.course_name,
                });
            }

            return acc;
        }, {});

        const result = Object.values(groupedData).map((faculty: any) => ({
            faculty_id: faculty.faculty_id,
            faculty_name: faculty.faculty_name,
            feedbacks: faculty.feedbacks,
            sessions: faculty.sessions,
            courses: Array.from(faculty.courses),
            session_count: faculty.sessions.length,
            total_responses: faculty.total_responses
        }));

        res.status(200).json({
            message: "Success",
            start_date,
            end_date,
            facultyId: facultyId || "all",
            questionId,
            total_faculty: result.length,
            data: result
        });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};