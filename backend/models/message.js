import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: String,
  attachment: {
    name: String,
    type: String,
    size: Number,
    data: String,
    url: String,
    category: {
      type: String,
      enum: ["image", "video", "audio", "file"],
      default: "file"
    }
  },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" }
},{timestamps:true});

export default mongoose.model("Message", messageSchema);
