const express = require("express");
const { deleteUser, getAllUsers } = require("../controllers/user");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Admin-only: list users
router.get("/", requireAuth, requireRole("admin"), getAllUsers);

// Admin-only: delete user
router.delete("/:id", requireAuth, requireRole("admin"), deleteUser);

module.exports = router;
