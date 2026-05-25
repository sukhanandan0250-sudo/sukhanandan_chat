import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";

export const sendMessage = async (req,res)=>{
  const senderId = req.user._id;
  const receiverId = req.params.id;
  const { text } = req.body;

  let conversation = await Conversation.findOne({
    participants:{$all:[senderId,receiverId]}
  });

  if(!conversation){
    conversation = await Conversation.create({
      participants:[senderId,receiverId]
    });
  }

  const message = await Message.create({
    senderId,receiverId,text,conversationId:conversation._id
  });

  conversation.messages.push(message._id);
  await conversation.save();

  res.json(message);
};

export const getMessage = async(req,res)=>{
  const senderId = req.user._id;
  const receiverId = req.params.id;

  const conversation = await Conversation.findOne({
    participants:{$all:[senderId,receiverId]}
  }).populate("messages");

  res.json(conversation ? conversation.messages : []);
};