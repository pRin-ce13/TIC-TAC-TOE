import express from "express";
import { newGame, playMove } from "../controllers/gameController.js";

const router = express.Router();

router.post("/new-game", newGame);
router.post("/move", playMove);

export default router;
