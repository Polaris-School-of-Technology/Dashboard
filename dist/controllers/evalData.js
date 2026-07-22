"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMarksByFilters = exports.getComponentsBySubject = exports.getSubjectsBySemester = exports.getAllSemesters = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const main_1 = require("../config/main");
const supabaseAdmin = (0, supabase_js_1.createClient)(main_1.config.supabaseUrl, main_1.config.supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
// GET all semesters
const getAllSemesters = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabaseAdmin
            .from('semesters')
            .select('*')
            .order('id', { ascending: true });
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    }
    catch (err) {
        console.error('Error fetching semesters:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAllSemesters = getAllSemesters;
// GET subjects for a semester
const getSubjectsBySemester = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { semesterId } = req.params;
        const { data, error } = yield supabaseAdmin
            .from('evaluation_subjects')
            .select('id, subject_name')
            .eq('semester_id', semesterId)
            .order('subject_name', { ascending: true });
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    }
    catch (err) {
        console.error('Error fetching subjects:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getSubjectsBySemester = getSubjectsBySemester;
// GET components for a subject
const getComponentsBySubject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subjectId } = req.params;
        const { data, error } = yield supabaseAdmin
            .from('mark_components')
            .select('id, name')
            .order('name', { ascending: true });
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    }
    catch (err) {
        console.error('Error fetching components:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getComponentsBySubject = getComponentsBySubject;
// GET marks for specific semester, subject, component, and roll number
const getMarksByFilters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { semesterId, subjectId, componentId, rollNumber } = req.query;
        if (!semesterId || !subjectId || !componentId || !rollNumber) {
            return res.status(400).json({
                error: 'Missing required parameters: semesterId, subjectId, componentId, rollNumber',
            });
        }
        // First, get the marks data
        const { data: marksData, error: marksError } = yield supabaseAdmin
            .from('student_subject_wise_marks')
            .select(`
        subject_id,
        component_id,
        marks_obtained,
        total_marks,
        roll_number,
        student_id
      `)
            .eq('subject_id', subjectId)
            .eq('component_id', componentId)
            .eq('roll_number', rollNumber);
        if (marksError) {
            return res.status(500).json({ error: marksError.message });
        }
        if (!marksData || marksData.length === 0) {
            return res.status(404).json({ error: 'No marks found for this combination' });
        }
        const markRecord = marksData[0];
        // Get subject name
        const { data: subjectData, error: subjectError } = yield supabaseAdmin
            .from('evaluation_subjects')
            .select('subject_name')
            .eq('id', subjectId)
            .single();
        if (subjectError) {
            return res.status(500).json({ error: subjectError.message });
        }
        // Get component name
        const { data: componentData, error: componentError } = yield supabaseAdmin
            .from('mark_components')
            .select('name')
            .eq('id', componentId)
            .single();
        if (componentError) {
            return res.status(500).json({ error: componentError.message });
        }
        // Get student name
        const { data: profileData, error: profileError } = yield supabaseAdmin
            .from('profiles')
            .select('name')
            .eq('id', markRecord.student_id)
            .single();
        if (profileError) {
            return res.status(500).json({ error: profileError.message });
        }
        const result = {
            SubjectId: markRecord.subject_id,
            ComponentId: markRecord.component_id,
            SubjectName: subjectData === null || subjectData === void 0 ? void 0 : subjectData.subject_name,
            ComponentName: componentData === null || componentData === void 0 ? void 0 : componentData.name,
            MarksObtained: markRecord.marks_obtained,
            TotalMarks: markRecord.total_marks,
            StudentName: profileData === null || profileData === void 0 ? void 0 : profileData.name,
            RollNumber: markRecord.roll_number,
        };
        return res.status(200).json(result);
    }
    catch (err) {
        console.error('Error fetching marks:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getMarksByFilters = getMarksByFilters;
