const express = require('express');
const mongoose = require('mongoose');
const Chat = require('./models/Chat');
const Conversation = require('./models/Conversation');
const cors = require('cors');  // Add this

const app = express();
const port = 5003;

app.use(cors());  // Use this to allow CORS from any origin
app.use(express.json());

app.get('/api/getChats', async (req, res) => {
    try {
        const chats = await Chat.find();
        res.json(chats);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/api/getConversation/:chatId', async (req, res) => {
    try {
        const conversation = await Conversation.find({ chatId: req.params.chatId });
        res.json(conversation);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/api/createChat', async (req, res) => {
    try {
        const chat = new Chat(req.body);
        await chat.save();
        res.json(chat);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.post('/api/continueConversation', async (req, res) => {
    try {
        const conversation = new Conversation(req.body);
        await conversation.save();
        res.json(conversation);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.delete('/api/deleteChat/:chatId', async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.chatId);
        await Conversation.deleteMany({ chatId: req.params.chatId });
        res.status(204).send();
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});
