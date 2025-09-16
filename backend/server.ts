// seedUsers.ts
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Use anon key since this is one-time seeding
const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_ANON_KEY as string
);

async function seedUser(
    email: string,
    password: string,
    role: string,
    facultyId: string | null = null
) {
    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
        .from("dashboard_users")
        .insert([{ email, password_hash: hash, role, faculty_id: facultyId }]);

    if (error) console.error("❌ Insert error:", error);
    else console.log("✅ Inserted:", data);
}

async function main() {
    await seedUser(
        "tanmay.satsangi@polariscampus.com",
        "1",
        "faculty",
        "f5d25705-763d-41e1-8874-6fd486fb6add"

    );
}

main();
