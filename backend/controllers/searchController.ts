import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const searchUsers = async (req: Request, res: Response) => {
    const searchQuery = req.query.name as string;

    if (!searchQuery) {
        return res.json([]);
    }

    try {
        const { data, error } = await supabase
            .from("users")
            .select("id, name")
            .ilike("name", `%${searchQuery}%`);

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
};
