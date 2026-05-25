import Conversation from "../models/conversation.js";
import Message from "../models/message.js";

const allowedCategories = ["image", "video", "audio", "file"];

const getCategory = (type = "") => {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  return "file";
};

export const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const publicUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    res.status(201).json({
      name: req.file.originalname,
      type: req.file.mimetype || "application/octet-stream",
      size: req.file.size,
      url: publicUrl,
      category: getCategory(req.file.mimetype)
    });
  } catch (error) {
    res.status(500).json({ message: "Could not upload file", error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { text = "", attachment = null } = req.body;
    const cleanText = text.trim();

    if (!cleanText && !attachment?.data && !attachment?.url) {
      return res.status(400).json({ message: "Message text or attachment is required" });
    }

    let cleanAttachment = null;
    if (attachment?.data || attachment?.url) {
      const category = allowedCategories.includes(attachment.category) ? attachment.category : "file";
      const maxSize = 25 * 1024 * 1024;

      if (Number(attachment.size) > maxSize) {
        return res.status(400).json({ message: "Attachment must be less than 25 MB" });
      }

      cleanAttachment = {
        name: String(attachment.name || "attachment").slice(0, 140),
        type: String(attachment.type || "application/octet-stream").slice(0, 120),
        size: Number(attachment.size || 0),
        data: attachment.data ? String(attachment.data) : "",
        url: attachment.url ? String(attachment.url) : "",
        category
      };
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId]
      });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      text: cleanText,
      attachment: cleanAttachment,
      conversationId: conversation._id
    });

    conversation.messages.push(message._id);
    await conversation.save();

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: "Could not send message", error: error.message });
  }
};

export const getMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    }).populate("messages");

    res.json(conversation ? conversation.messages : []);
  } catch (error) {
    res.status(500).json({ message: "Could not load messages", error: error.message });
  }
};
