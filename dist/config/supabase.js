"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const main_1 = require("./main");
exports.supabase = (0, supabase_js_1.createClient)(main_1.config.supabaseUrl, main_1.config.supabaseAnonKey);
