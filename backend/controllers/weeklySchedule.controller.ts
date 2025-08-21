import { Request, Response } from 'express';
import { supabase } from '../config/supabase'

export const getAllSessions = async (_: Request, res: Response) => {
    try {
        
        const today = new Date();
        const dayOfWeek = today.getDay(); 
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const startOfWeek = monday.toISOString();
        const endOfWeek = sunday.toISOString();

        // Fetch sessions with faculty name
        const { data, error } = await supabase
            .from('class_sessions')
            .select(`
                session_datetime,
                duration,
                profiles!actual_faculty_id (name)
            `)
            .gte('session_datetime', startOfWeek)
            .lte('session_datetime', endOfWeek)
            .order('session_datetime', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data);
    } catch (err: any) {
        console.error('Error fetching sessions:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};



export const getSessionsByDate = async (req: Request, res: Response) => {
    try {
       
        const { date } = req.params;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Please provide a valid date in YYYY-MM-DD format.' });
        }

     
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch sessions with faculty name
        const { data, error } = await supabase
            .from('class_sessions')
            .select(`
                session_datetime,
                profiles!actual_faculty_id (name)
            `)
            .gte('session_datetime', startOfDay.toISOString()) // compare in UTC
            .lte('session_datetime', endOfDay.toISOString())   // compare in UTC
            .order('session_datetime', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        
        const formattedData = data.map((session: any) => ({
            datetime: new Date(session.session_datetime).toLocaleString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            }),
            duration: session.duration,
            faculty: session.profiles?.name || 'N/A'
        }));

        return res.status(200).json(formattedData);
    } catch (err: any) {
        console.error('Error fetching sessions by date:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};