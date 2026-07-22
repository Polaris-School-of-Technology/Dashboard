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
exports.searchUsers = void 0;
const supabase_1 = require("../config/supabase");
const searchUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const searchQuery = req.query.name;
    if (!searchQuery) {
        return res.json([]);
    }
    try {
        const { data, error } = yield supabase_1.supabase
            .from("users")
            .select("id, name")
            .ilike("name", `%${searchQuery}%`);
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});
exports.searchUsers = searchUsers;
