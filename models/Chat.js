const mongoose = require('mongoose');

// Schema for chat metadata
const chatSchema = new mongoose.Schema({
  name: { type: String, required: true },
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
