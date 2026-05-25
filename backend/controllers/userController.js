import User from "../models/user.js";
import Conversation from "../models/conversation.js";
import Message from "../models/message.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const safeUserFields = "-password -contacts";
const publicUserFields = "name username email avatarColor avatarUrl";

const normalizeUsername = (value = "") =>
  value.trim().toLowerCase().replace(/[^a-z0-9_.]/g, "");

export const signup = async (req,res)=>{
  try {
    const { name, email, password } = req.body;
    const username = normalizeUsername(req.body.username || name);
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (!username || username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 letters" });
    }

    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username }]
    });
    if (exists) return res.status(409).json({ message: "Email or username already registered" });

    const user = await User.create({ name, username, email, password });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const safeUser = user.toObject();
    delete safeUser.password;
    res.status(201).json({ user: safeUser, token });
  } catch (error) {
    res.status(500).json({ message: "Signup failed", error: error.message });
  }
};

export const login = async (req,res)=>{
  try {
    const user = await User.findOne({email:req.body.email});
    if(!user) return res.status(400).json({message:"User not found"});

    const match = await bcrypt.compare(req.body.password,user.password);
    if(!match) return res.status(400).json({message:"Invalid credentials"});

    const token = jwt.sign({userId:user._id},process.env.JWT_SECRET, { expiresIn: "7d" });
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json({user:safeUser,token});
  } catch (error) {
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const getUsers = async(req,res)=>{
  const me = await User.findById(req.user._id).populate({
    path: "contacts",
    select: publicUserFields,
    options: { sort: { name: 1 } }
  });
  const users = me?.contacts || [];
  res.json(users);
};

export const addContact = async (req, res) => {
  try {
    const query = (req.body.query || "").trim().toLowerCase();
    if (!query) return res.status(400).json({ message: "Enter email or username" });

    const contact = await User.findOne({
      $or: [{ email: query }, { username: query }]
    }).select(publicUserFields);

    if (!contact) return res.status(404).json({ message: "User not found" });
    if (String(contact._id) === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { contacts: contact._id } });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ message: "Could not add contact", error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const username = normalizeUsername(req.body.username || "");
    const avatarUrl = req.body.avatarUrl || "";

    if (!name || !email || !username) {
      return res.status(400).json({ message: "Name, email and username are required" });
    }

    const exists = await User.findOne({
      _id: { $ne: req.user._id },
      $or: [{ email }, { username }]
    });
    if (exists) return res.status(409).json({ message: "Email or username already used" });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, username, avatarUrl },
      { new: true, runValidators: true }
    ).select(safeUserFields);

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Could not update profile", error: error.message });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Conversation.find({ participants: userId }).select("_id");
    const conversationIds = conversations.map(item => item._id);

    await Message.deleteMany({
      $or: [{ senderId: userId }, { receiverId: userId }, { conversationId: { $in: conversationIds } }]
    });
    await Conversation.deleteMany({ _id: { $in: conversationIds } });
    await User.updateMany({}, { $pull: { contacts: userId } });
    await User.findByIdAndDelete(userId);

    res.json({ message: "Profile deleted" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete profile", error: error.message });
  }
};
