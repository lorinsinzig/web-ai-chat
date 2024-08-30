// models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, required: true },
  content: { type: String, required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true }, // Use ObjectId for chat reference
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
