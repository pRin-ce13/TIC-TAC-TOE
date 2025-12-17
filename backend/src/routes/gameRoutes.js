import express from "express";
import { newGame, playMove, aiMove } from "../controllers/gameController.js";

const router = express.Router();

router.post("/new-game", newGame);
router.post("/move", playMove);
router.post("/ai-move", aiMove);

export default router;
