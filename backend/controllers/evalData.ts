import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/main';

const supabaseAdmin = createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

// GET all semesters
export const getAllSemesters = async (_: Request, res: Response) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('semesters')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    } catch (err: any) {
        console.error('Error fetching semesters:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// GET subjects for a semester
export const getSubjectsBySemester = async (req: Request, res: Response) => {
    try {
        const { semesterId } = req.params;

        const { data, error } = await supabaseAdmin
            .from('evaluation_subjects')
            .select('id, subject_name')
            .eq('semester_id', semesterId)
            .order('subject_name', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    } catch (err: any) {
        console.error('Error fetching subjects:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// GET components for a subject
export const getComponentsBySubject = async (req: Request, res: Response) => {
    try {
        const { subjectId } = req.params;

        const { data, error } = await supabaseAdmin
            .from('mark_components')
            .select('id, name')

            .order('name', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    } catch (err: any) {
        console.error('Error fetching components:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// GET marks for specific semester, subject, component, and roll number
export const getMarksByFilters = async (req: Request, res: Response) => {
    try {
        const { semesterId, subjectId, componentId, rollNumber } = req.query;

        if (!semesterId || !subjectId || !componentId || !rollNumber) {
            return res.status(400).json({
                error: 'Missing required parameters: semesterId, subjectId, componentId, rollNumber',
            });
        }

        // First, get the marks data
        const { data: marksData, error: marksError } = await supabaseAdmin
            .from('student_subject_wise_marks')
            .select(
                `
        subject_id,
        component_id,
        marks_obtained,
        total_marks,
        roll_number,
        student_id
      `
            )
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
        const { data: subjectData, error: subjectError } = await supabaseAdmin
            .from('evaluation_subjects')
            .select('subject_name')
            .eq('id', subjectId)
            .single();

        if (subjectError) {
            return res.status(500).json({ error: subjectError.message });
        }

        // Get component name
        const { data: componentData, error: componentError } = await supabaseAdmin
            .from('mark_components')
            .select('name')
            .eq('id', componentId)
            .single();

        if (componentError) {
            return res.status(500).json({ error: componentError.message });
        }

        // Get student name
        const { data: profileData, error: profileError } = await supabaseAdmin
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
            SubjectName: subjectData?.subject_name,
            ComponentName: componentData?.name,
            MarksObtained: markRecord.marks_obtained,
            TotalMarks: markRecord.total_marks,
            StudentName: profileData?.name,
            RollNumber: markRecord.roll_number,
        };

        return res.status(200).json(result);
    } catch (err: any) {
        console.error('Error fetching marks:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

