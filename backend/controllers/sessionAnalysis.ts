import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { VertexAI } from "@google-cloud/vertexai";
import { google } from "googleapis";

const ratingMap: Record<string, number> = {
    "Excellent": 5,
    "Very Good": 4,
    "Good": 3,
    "Fair": 2,
    "Poor": 1,
};

const getRatingValue = (response: string): number | null => {
    const numericValue = parseFloat(String(response).trim());
    if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 5) {
        return Math.round(numericValue);
    }
    return ratingMap[String(response).trim()] ?? null;
};

// Initialize Vertex AI and Google Sheets auth once
const vertexAI = new VertexAI({
    project: process.env.GCP_PROJECT_ID as string,
    location: process.env.GCP_LOCATION || "asia-south1",
    googleAuthOptions: {
        keyFilename: "service-account.json",
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    },
});

const model = vertexAI.preview.getGenerativeModel({
    model: "gemini-1.5-flash",
});

const auth = new google.auth.GoogleAuth({
    keyFile: "service-account.json",
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export const getAllFeedbacksForASession = async (req: Request, res: Response) => {
    try {
        const { batch_id } = req.params;
        const { date } = req.body;
        if (!batch_id) {
            return res.status(400).json({ error: "batch_id is required in params." });
        }


        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        // Check if data already exists for this date and batch
        const { data: existingData } = await supabase
            .from("session_analytics")
            .select("*")
            .eq("analysis_date", date)
            .in("session_id",
                await supabase
                    .from("class_sessions")
                    .select("id")
                    .eq("course_sections.batch_id", batch_id)
                    .gte("session_datetime", startOfDay)
                    .lte("session_datetime", endOfDay)
                    .then(res => res.data?.map(s => s.id) || [])
            );

        if (existingData && existingData.length > 0) {
            console.log(`Data already exists for ${date}. Returning existing data.`);
            return res.json(existingData);
        }

        // Step 1: Get all sessions for the date and batch
        const { data: allSessions, error: sessionsError } = await supabase
            .from("class_sessions")
            .select(`
                id,
                session_datetime,
                actual_faculty_id,
                profiles!inner(name),
                course_sections!inner(
                    course_id,
                    batch_id,
                    courses!inner(course_name),
                    batches!inner(batch_name)
                )
            `)
            .eq("course_sections.batch_id", batch_id)
            .gte("session_datetime", startOfDay)
            .lte("session_datetime", endOfDay)
            .order("id", { ascending: true });

        if (sessionsError || !allSessions?.length) {
            return res.status(sessionsError ? 400 : 404)
                .json({ error: sessionsError?.message || "No sessions found for the given date and batch." });
        }

        const allSessionIds = allSessions.map(s => s.id);
        console.log(`Processing ${allSessions.length} sessions:`, allSessionIds);

        // Step 2: Parallel fetch all data with explicit limits
        const [feedbackResult, attendanceResult, quizResult] = await Promise.all([
            supabase
                .from("session_responses_feedback")
                .select(`
                    id,
                    response_text,
                    session_id,
                    student_id,
                    session_questions(
                        question_text,
                        feedback_question_id
                    )
                `)
                .in("session_id", allSessionIds)
                .limit(50000),

            supabase
                .from("attendance_records")
                .select("session_id, user_id, is_present")
                .in("session_id", allSessionIds)
                .limit(10000),

            supabase
                .from("student_quiz_scores")
                .select("session_id, quiz_score, max_quiz_score")
                .in("session_id", allSessionIds)
                .limit(10000)
        ]);

        // Log data retrieval results
        console.log("Data retrieved:", {
            feedback: feedbackResult.data?.length || 0,
            attendance: attendanceResult.data?.length || 0,
            quiz: quizResult.data?.length || 0
        });

        // Check for errors
        if (feedbackResult.error) console.error("Feedback error:", feedbackResult.error);
        if (attendanceResult.error) console.error("Attendance error:", attendanceResult.error);
        if (quizResult.error) console.error("Quiz error:", quizResult.error);

        // Step 3: Efficient data grouping using Map for better performance
        const feedbackGrouped = new Map<string, any[]>();
        const attendanceGrouped = new Map<string, any[]>();
        const quizGrouped = new Map<string, { score: number; max: number }[]>();

        // Group feedback
        feedbackResult.data?.forEach(item => {
            const sessionId = String(item.session_id);
            if (!feedbackGrouped.has(sessionId)) feedbackGrouped.set(sessionId, []);
            feedbackGrouped.get(sessionId)!.push(item);
        });

        // Group attendance
        attendanceResult.data?.forEach(item => {
            const sessionId = String(item.session_id);
            if (!attendanceGrouped.has(sessionId)) attendanceGrouped.set(sessionId, []);
            attendanceGrouped.get(sessionId)!.push(item);
        });

        // Group quiz scores
        quizResult.data?.forEach(item => {
            const sessionId = String(item.session_id);
            if (!quizGrouped.has(sessionId)) quizGrouped.set(sessionId, []);
            quizGrouped.get(sessionId)!.push({
                score: Number(item.quiz_score),
                max: Number(item.max_quiz_score)
            });
        });

        // Step 4: Calculate quiz statistics efficiently
        const quizStatsBySession = new Map<string, any>();

        for (const [sessionId, rows] of quizGrouped) {
            if (!rows || rows.length === 0) {
                quizStatsBySession.set(sessionId, {
                    avg: null, max: null, min: null, stddev: null,
                    percentage: "N/A", above90Count: 0, below40Count: 0, highest_student_score: null
                });
                continue;
            }

            const scores = rows.map(r => r.score);
            const maxScore = rows[0]?.max || 0;

            if (!maxScore) {
                quizStatsBySession.set(sessionId, {
                    avg: null, max: null, min: null, stddev: null,
                    percentage: "N/A", above90Count: 0, below40Count: 0, highest_student_score: null
                });
                continue;
            }

            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const min = Math.min(...scores);
            const highestStudentScore = Math.max(...scores);
            const variance = scores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / scores.length;
            const stddev = Math.sqrt(variance);
            const percentage = ((avg / maxScore) * 100).toFixed(2) + "%";

            let above90 = 0, below40 = 0;
            for (const score of scores) {
                const perc = (score / maxScore) * 100;
                if (perc >= 90) above90++;
                if (perc <= 40) below40++;
            }

            quizStatsBySession.set(sessionId, {
                avg: parseFloat(avg.toFixed(2)),
                max: maxScore,
                min,
                stddev: parseFloat(stddev.toFixed(2)),
                percentage,
                above90Count: above90,
                below40Count: below40,
                highest_student_score: highestStudentScore
            });
        }

        // Step 5: Process sessions efficiently
        const sessionsForLLM = allSessions.map((session) => {
            const sessionId = String(session.id);
            const sessionFeedback = feedbackGrouped.get(sessionId) || [];
            const sessionAttendance = attendanceGrouped.get(sessionId) || [];

            const presentCount = sessionAttendance.filter((r: any) => r.is_present).length;
            const totalRegistered = sessionAttendance.length;
            const uniqueRespondents = new Set(sessionFeedback.map((i: any) => i.student_id)).size;

            // Rating calculation
            const ratingResponses = sessionFeedback.filter((i: any) => i.session_questions?.feedback_question_id === 3);
            const numericRatings = ratingResponses
                .map((r: any) => getRatingValue(r.response_text))
                .filter((n: any) => n !== null) as number[];

            const averageRating = numericRatings.length > 0
                ? (numericRatings.reduce((a, b) => a + b, 0) / numericRatings.length).toFixed(2)
                : "N/A";

            const lowRatingsCount = numericRatings.filter((n) => n < 4).length;
            const lowRatingsPercentage = numericRatings.length > 0
                ? ((lowRatingsCount / numericRatings.length) * 100).toFixed(1) + "%"
                : "N/A";

            const quizStats = quizStatsBySession.get(sessionId) || {
                avg: null, max: null, min: null, stddev: null,
                percentage: "N/A", above90Count: 0, below40Count: 0, highest_student_score: null
            };

            const profile = Array.isArray(session.profiles) ? session.profiles[0] : session.profiles;
            const courseSection = Array.isArray(session.course_sections) ? session.course_sections[0] : session.course_sections;
            const course = Array.isArray(courseSection?.courses) ? courseSection.courses[0] : courseSection?.courses;
            const batch = Array.isArray(courseSection?.batches) ? courseSection.batches[0] : courseSection?.batches;

            const facultyName = profile?.name || `Faculty ID ${session.actual_faculty_id}`;
            const courseName = course?.course_name ?? "N/A";
            const batchName = batch?.batch_name ?? "N/A";

            const attendanceRate = totalRegistered > 0 ? ((presentCount / totalRegistered) * 100).toFixed(1) + "%" : "N/A";
            const responseRate = presentCount > 0 ? ((uniqueRespondents / presentCount) * 100).toFixed(1) + "%" : "N/A";

            return {
                session_id: session.id,
                batch_name: batchName,
                faculty_name: facultyName,
                course_name: courseName,
                session_datetime: session.session_datetime,
                present_students: presentCount,
                total_registered: totalRegistered,
                attendance_rate: attendanceRate,
                response_rate: responseRate,
                unique_respondents: uniqueRespondents,
                average_rating: averageRating,
                low_ratings_count: lowRatingsCount,
                low_ratings_percentage: lowRatingsPercentage,
                avg_quiz_score: quizStats.avg,
                max_quiz_score: quizStats.highest_student_score,
                min_quiz_score: quizStats.min,
                stddev_quiz_score: quizStats.stddev,
                quiz_percentage: quizStats.percentage,
                above_90_count: quizStats.above90Count,
                below_40_count: quizStats.below40Count,
                highest_student_score: quizStats.highest_student_score,
                questions_answers: sessionFeedback.map((i: any) => ({
                    question: i.session_questions?.question_text || "N/A",
                    answer: i.response_text,
                    feedback_question_id: i.session_questions?.feedback_question_id || null,
                })),
            };
        });

        // Step 6: Generate summaries with better error handling
        // Step 6: Generate summaries with better error handling
        // Enhanced Step 6: More Holistic Analysis
        const summaries = await Promise.allSettled(
            sessionsForLLM.map(async (s) => {
                // Group questions by type for better summary organization
                const questionsByType = {
                    rating: s.questions_answers.filter(qa => qa.feedback_question_id === 3),
                    multipleChoice: s.questions_answers.filter(qa => qa.feedback_question_id && [5, 6, 7, 8].includes(qa.feedback_question_id)),
                    textResponses: s.questions_answers.filter(qa => qa.feedback_question_id && [4, 9, 10].includes(qa.feedback_question_id))
                };

                // Enhanced analysis metrics
                const engagementScore = s.response_rate !== "N/A" ? parseFloat(s.response_rate) : 0;
                const attendanceScore = s.attendance_rate !== "N/A" ? parseFloat(s.attendance_rate) : 0;
                const ratingScore = s.average_rating !== "N/A" ? parseFloat(s.average_rating) * 20 : 0; // Convert to percentage

                // Overall session health score (0-100)
                const sessionHealthScore = ((engagementScore + attendanceScore + ratingScore) / 3).toFixed(1);

                // Identify potential issues
                const issues = [];
                if (attendanceScore < 70) issues.push("Low attendance");
                if (engagementScore < 50) issues.push("Poor response rate");
                if (parseFloat(s.low_ratings_percentage.replace('%', '')) > 25) issues.push("High dissatisfaction");
                if (s.avg_quiz_score !== null && s.avg_quiz_score < 60) issues.push("Poor quiz performance");

                // Positive indicators
                const strengths = [];
                if (attendanceScore >= 85) strengths.push("Excellent attendance");
                if (engagementScore >= 80) strengths.push("High engagement");
                if (s.average_rating !== "N/A" && parseFloat(s.average_rating) >= 4.5) strengths.push("High satisfaction");
                if (s.above_90_count > 0) strengths.push(`${s.above_90_count} students excelling`);

                // Prepare detailed feedback summary
                let feedbackSummary = `\nSession Health Score: ${sessionHealthScore}%\n`;

                if (strengths.length > 0) {
                    feedbackSummary += `\nStrengths: ${strengths.join(', ')}\n`;
                }

                if (issues.length > 0) {
                    feedbackSummary += `\nAreas for Improvement: ${issues.join(', ')}\n`;
                }

                // Add text responses summary with sentiment analysis keywords
                if (questionsByType.textResponses.length > 0) {
                    feedbackSummary += "\nKey Student Feedback:\n";

                    // Group responses by sentiment indicators
                    const positiveWords = ['good', 'great', 'excellent', 'helpful', 'clear', 'understand', 'learned'];
                    const concernWords = ['confused', 'difficult', 'hard', 'unclear', 'fast', 'slow', 'problem'];

                    let positiveCount = 0;
                    let concernCount = 0;

                    questionsByType.textResponses.forEach(qa => {
                        if (qa.answer && qa.answer.trim() !== "") {
                            const answer = qa.answer.toLowerCase();
                            if (positiveWords.some(word => answer.includes(word))) positiveCount++;
                            if (concernWords.some(word => answer.includes(word))) concernCount++;

                            feedbackSummary += `• ${qa.question}: ${qa.answer}\n`;
                        }
                    });

                    if (positiveCount > 0 || concernCount > 0) {
                        feedbackSummary += `\nFeedback Sentiment: ${positiveCount} positive, ${concernCount} concerns\n`;
                    }
                }

                // Add multiple choice insights with percentage analysis
                if (questionsByType.multipleChoice.length > 0) {
                    feedbackSummary += "\nStudent Satisfaction Breakdown:\n";

                    const mcGrouped: { [key: number]: { question: string; responses: string[] } } = {};

                    questionsByType.multipleChoice.forEach(qa => {
                        const qId = qa.feedback_question_id;
                        if (qId && !mcGrouped[qId]) {
                            mcGrouped[qId] = { question: qa.question, responses: [] };
                        }
                        if (qId && qa.answer) {
                            mcGrouped[qId].responses.push(qa.answer);
                        }
                    });

                    Object.values(mcGrouped).forEach((group) => {
                        const responseCounts: { [key: string]: number } = {};
                        const total = group.responses.length;

                        group.responses.forEach(resp => {
                            responseCounts[resp] = (responseCounts[resp] || 0) + 1;
                        });

                        feedbackSummary += `• ${group.question}:\n`;
                        Object.entries(responseCounts)
                            .sort(([, a], [, b]) => b - a) // Sort by count descending
                            .forEach(([response, count]) => {
                                const percentage = ((count / total) * 100).toFixed(1);
                                feedbackSummary += `  - ${response}: ${count} (${percentage}%)\n`;
                            });
                    });
                }

                const prompt = `
Analyze this comprehensive session data:

BASIC METRICS:
- Mentor: ${s.faculty_name}
- Course: ${s.course_name}  
- Session Date/Time: ${new Date(s.session_datetime).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })}
- Attendance: ${s.present_students}/${s.total_registered} (${s.attendance_rate})
- Feedback Responses: ${s.unique_respondents} (${s.response_rate} of present students)
- Average Rating: ${s.average_rating}/5
- Low Ratings (1-3): ${s.low_ratings_count} (${s.low_ratings_percentage})

PERFORMANCE INDICATORS:
- Quiz Avg Score: ${s.avg_quiz_score}
- Students Above 90%: ${s.above_90_count}
- Students Below 40%: ${s.below_40_count}
- Overall Session Health: ${sessionHealthScore}%

DETAILED FEEDBACK ANALYSIS:
${feedbackSummary}

TASK: Write a comprehensive 3-4 sentence analysis covering:
1. Overall session effectiveness and student engagement
2. Key strengths and areas needing attention
3. Specific recommendations for improvement
4. Student learning outcomes and satisfaction trends`;

                try {
                    const result = await model.generateContent({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
                    });

                    const response = await result.response;
                    const fullSummary = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No summary generated.";

                    // Return enhanced data including new metrics
                    return {
                        ...s,
                        summary: fullSummary,
                        session_health_score: sessionHealthScore,
                        identified_issues: issues.join(', ') || 'None',
                        key_strengths: strengths.join(', ') || 'None'
                    };
                } catch (error) {
                    console.error(`Error generating summary for session ${s.session_id}:`, error);
                    return { ...s, summary: "Error generating summary." };
                }
            })
        );

        // Extract successful results
        const successfulSummaries = summaries
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
            .map(result => result.value);

        // Step 7: Save to Database (NEW)
        // Step 7: Save to Database with UPSERT (handles duplicates)
        const dataToInsert = successfulSummaries.map(s => ({
            session_id: s.session_id,
            faculty_name: s.faculty_name,
            course_name: s.course_name,
            session_datetime: s.session_datetime,
            present_students: s.present_students,
            total_registered: s.total_registered,
            attendance_rate: s.attendance_rate,
            unique_respondents: s.unique_respondents,
            response_rate: s.response_rate,
            average_rating: s.average_rating,
            low_ratings_count: s.low_ratings_count,
            low_ratings_percentage: s.low_ratings_percentage,
            avg_quiz_score: s.avg_quiz_score,
            max_quiz_score: s.highest_student_score,
            min_quiz_score: s.min_quiz_score,
            stddev_quiz_score: s.stddev_quiz_score,
            quiz_percentage: s.quiz_percentage,
            above_90_count: s.above_90_count,
            below_40_count: s.below_40_count,
            summary: s.summary,
            batch_name: s.batch_name,
            analysis_date: date
        }));

        // Use upsert instead of insert to handle duplicates
        const { data: insertedData, error: insertError } = await supabase
            .from('session_analytics')
            .upsert(dataToInsert, {
                onConflict: 'session_id,analysis_date',
                ignoreDuplicates: false
            })
            .select();

        if (insertError) {
            console.error('Error upserting data:', insertError);
            return res.status(500).json({ error: 'Failed to save analytics data' });
        }


        // Step 8: Save to Google Sheets (keep existing functionality)
        const rows = successfulSummaries.map((s) => [
            s.session_id,
            s.faculty_name,
            s.course_name,
            new Date(s.session_datetime).toLocaleString("en-IN"),
            s.present_students,
            s.total_registered,
            s.attendance_rate,
            s.unique_respondents,
            s.response_rate,
            s.average_rating,
            s.low_ratings_count,
            s.low_ratings_percentage,
            s.avg_quiz_score,
            s.max_quiz_score,
            s.min_quiz_score,
            s.stddev_quiz_score,
            s.quiz_percentage,
            s.above_90_count,
            s.below_40_count,
            s.summary,
            s.batch_name
        ]);

        const spreadsheetId = process.env.GOOGLE_SHEET_ID as string;
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: "Sheet1!A2",
            valueInputOption: "RAW",
            requestBody: { values: rows },
        });

        console.log(`Successfully processed and saved ${successfulSummaries.length} sessions`);
        return res.json(insertedData);

    } catch (err) {
        console.error("Error fetching feedbacks:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// NEW ENDPOINT: Get analytics by date
export const getSessionAnalyticsByDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: "Date is required as query parameter" });
        }

        let query = supabase
            .from('session_analytics')
            .select('*')
            .eq('analysis_date', date)
            .order('session_datetime', { ascending: true });



        const { data, error } = await query;

        if (error) {
            console.error('Error fetching analytics:', error);
            return res.status(500).json({ error: 'Failed to fetch analytics data' });
        }

        return res.json(data || []);

    } catch (err) {
        console.error('Error in getSessionAnalyticsByDate:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// NEW ENDPOINT: Get available analysis dates
export const getAvailableAnalysisDates = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('session_analytics')
            .select('analysis_date')
            .order('analysis_date', { ascending: false });

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch dates' });
        }

        const uniqueDates = [...new Set(data?.map(item => item.analysis_date))];
        return res.json(uniqueDates);

    } catch (err) {
        console.error('Error fetching available dates:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// NEW ENDPOINT: Get only quiz analytics by date
export const getQuizAnalyticsByDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "Date is required" });

        const { data, error } = await supabase
            .from("session_analytics")
            .select("session_id, faculty_name, course_name, session_datetime, avg_quiz_score, max_quiz_score, min_quiz_score, stddev_quiz_score, quiz_percentage, above_90_count, below_40_count, highest_student_score, batch_name")
            .eq("analysis_date", date)
            .order("session_datetime", { ascending: true });

        if (error) return res.status(500).json({ error: "Failed to fetch quiz data" });

        return res.json(data || []);
    } catch (err) {
        console.error("Error fetching quiz analytics:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};
