import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const calculateQuizScores = async (req: Request, res: Response) => {
    try {
        const { session_id } = req.params;

        if (!session_id) {
            return res.status(400).json({ message: "session_id is required" });
        }

        // 1. First, get the total number of quiz questions for this session
        const { data: totalQuestions, error: questionCountError } = await supabase
            .from("session_questions")
            .select("id")
            .eq("session_id", session_id)
            .eq("question_type", "correct_answer_type");

        if (questionCountError) {
            console.error("Error fetching question count:", questionCountError);
            return res.status(500).json({ message: "Error fetching question count", error: questionCountError.message });
        }

        const maxPossibleScore = totalQuestions?.length || 0;

        if (maxPossibleScore === 0) {
            return res.status(404).json({ message: "No quiz questions found for this session" });
        }

        console.log(`Total quiz questions in session ${session_id}: ${maxPossibleScore}`);

        // 2. Fetch all responses for the session
        const { data: responses, error: responseError } = await supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                student_id,
                question_id,
                response_text,
                session_questions!inner(
                    correct_option_value,
                    question_type
                )
            `)
            .eq("session_id", session_id)
            .eq("session_questions.question_type", "correct_answer_type");

        if (responseError) {
            console.error("Error fetching responses:", responseError);
            return res.status(500).json({ message: "Error fetching responses", error: responseError.message });
        }

        console.log("Sample response structure:", JSON.stringify(responses?.[0], null, 2));

        // 3. Group by student_id and calculate scores
        const studentScores: Record<string, { total: number; max: number }> = {};

        // Initialize all students who have any responses
        if (responses && responses.length > 0) {
            responses.forEach((resp) => {
                const sid = resp.student_id;
                if (!studentScores[sid]) {
                    studentScores[sid] = {
                        total: 0,
                        max: maxPossibleScore  // Use the actual total questions, not just answered ones
                    };
                }
            });

            // Now count correct answers
            responses.forEach((resp) => {
                const sid = resp.student_id;
                const correctOption = (resp.session_questions as any)?.correct_option_value;

                console.log(`Student ${sid}: Response="${resp.response_text}", Correct="${correctOption}"`);

                // Only count if there's a valid correct option and response matches
                if (correctOption !== null && correctOption !== undefined && resp.response_text === correctOption) {
                    studentScores[sid].total++;
                }
            });
        }

        console.log("Final student scores:", studentScores);

        // 4. Prepare data for insert
        const insertData = Object.entries(studentScores).map(([student_id, score]) => ({
            session_id: parseInt(session_id),
            student_id,
            quiz_score: score.total,        // Number of correct answers
            max_quiz_score: score.max,      // Total number of questions (same for all students)
            created_at: new Date().toISOString()
        }));

        console.log("Data to insert:", insertData);

        // 5. Insert or update scores in student_quiz_scores table
        const { error: insertError } = await supabase
            .from("student_quiz_scores")
            .upsert(insertData, { onConflict: "session_id,student_id" });

        if (insertError) {
            console.error("Error inserting quiz scores:", insertError);
            return res.status(500).json({ message: "Error saving quiz scores", error: insertError.message });
        }

        return res.status(200).json({
            message: "Quiz scores calculated and saved successfully",
            data: insertData,
            debug: {
                totalQuizQuestions: maxPossibleScore,
                totalResponses: responses?.length || 0,
                uniqueStudents: Object.keys(studentScores).length,
                studentScores
            }
        });

    } catch (err) {
        console.error("Error calculating quiz scores:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};


// export const getQuizScores = async (req: Request, res: Response) => {
//     try {
//         const { session_id } = req.params;

//         if (!session_id) {
//             return res.status(400).json({
//                 message: "session_id is required"
//             });
//         }

//         const { data: scores, error } = await supabase
//             .from("profiles")
//             .select("student_id, quiz_score, max_quiz_score, created_at")
//             .eq("session_id", session_id);

//         if (error) {
//             console.error("Error fetching quiz scores:", error);
//             return res.status(500).json({
//                 message: "Error fetching quiz scores",
//                 error: error.message
//             });
//         }

//         if (!scores || scores.length === 0) {
//             return res.status(404).json({
//                 message: "No quiz scores found for this session"
//             });
//         }

//         const scoresWithPercentage = scores.map((score: any) => ({
//             student_id: score.student_id,
//             quiz_score: score.quiz_score,
//             max_quiz_score: score.max_quiz_score,
//             percentage: score.max_quiz_score > 0
//                 ? Math.round((score.quiz_score / score.max_quiz_score) * 100)
//                 : 0,
//             created_at: score.created_at
//         }));

//         return res.status(200).json({
//             data: {
//                 session_id: parseInt(session_id),
//                 total_students: scores.length,
//                 scores: scoresWithPercentage
//             }
//         });

//     } catch (err) {
//         console.error("Error getting quiz score:", err);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };