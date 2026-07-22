import { Router } from "express";
import { searchUsers } from "../controllers/searchController";

const router = Router();


router.get("/searchStudent", searchUsers);

export default router;
