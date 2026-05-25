import express from "express";
import {
  signup,
  login,
  getUsers,
  addContact,
  updateProfile,
  deleteProfile
} from "../controllers/userController.js";
import secureRoute from "../middleware/secureRoute.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/users", secureRoute, getUsers);
router.post("/contacts", secureRoute, addContact);
router.put("/me", secureRoute, updateProfile);
router.delete("/me", secureRoute, deleteProfile);

export default router;
