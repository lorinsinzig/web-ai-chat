const express = require('express');
const path = require('path');
const cors = require('cors');
const { ollama } = require('ollama-ai-provider');
const { streamText } = require('ai');
const connectDB = require('./db');
const Message = require('./models/Message');
const Chat = require('./models/Chat');

const app = express();
connectDB();

// CORS Configuration
app.use(cors({
  origin: 'http://92.113.31.116:5003',
  methods: 'GET,POST,DELETE',
  allowedHeaders: 'Content-Type',
}));

app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Define the system message
const systemMessage = {
    role: "system",
    content: "You are a helpful assistant, called LISA. Always provide accurate and concise answers, but human.",
};

// API Routes
app.post('/api/createChat', async (req, res) => {
    try {
        const { name } = req.body;
        const chat = new Chat({ name });
        await chat.save();
        res.json(chat);
    } catch (error) {
        console.error("Error creating chat:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/api/getChats', async (req, res) => {
    try {
        const chats = await Chat.find();
        res.json(chats);
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/api/getConversation/:chatId', async (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/api/continueConversation', async (req, res) => {
    try {
        const { history, chatId } = req.body;

        const model = ollama("llama3.1");

        // Prepend the system message to the history
        const conversationHistory = [systemMessage, ...history];

        const { textStream } = await streamText({
            model: model,
            messages: conversationHistory,
        });

        if (!textStream) {
            res.status(500).send("No textStream returned");
            return;
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });

        let assistantMessageContent = "";

        for await (const text of textStream) {
            assistantMessageContent += text;
            res.write(text);
        }

        res.end();

        const latestUserMessage = history.filter(msg => msg.role === "user").pop();
        if (latestUserMessage) {
            await Message.create({ ...latestUserMessage, chatId });
        }

        if (assistantMessageContent) {
            await Message.create({ role: "assistant", content: assistantMessageContent, chatId });
        }

        console.log('Messages saved to MongoDB');
    } catch (error) {
        console.error("Error during processing:", error);
        if (!res.headersSent) {
            res.status(500).send("Internal Server Error");
        }
    }
});

app.delete('/api/deleteChat/:chatId', async (req, res) => {
  console.log('Delete chat');
  const { chatId } = req.params;
  try {
    // Delete the messages associated with the chat
    const messageDeletionResult = await Message.deleteMany({ chatId });
    console.log(`${messageDeletionResult.deletedCount} messages deleted for chat ID: ${chatId}`);

    // Delete the chat
    const chatDeletionResult = await Chat.findByIdAndDelete(chatId);
    if (!chatDeletionResult) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    res.status(200).json({ message: 'Chat and associated messages deleted' });
  } catch (error) {
    console.error("Error deleting chat and messages:", error);
    res.status(500).json({ message: 'Error deleting chat and messages', error });
  }
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
