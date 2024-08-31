import './App.css';
import React, { useState, useRef, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa'; // Import the delete icon

function App() {
  const [conversation, setConversation] = useState([]);
  const [input, setInput] = useState("");
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const containerRef = useRef(null);
  const controllerRef = useRef(null);

  // Fetch chats
  useEffect(() => {
    const fetchChats = async () => {
      try {
        const response = await fetch('http://92.113.31.116:5003/api/getChats');  // Use the public IP and port 5003
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const chats = await response.json();
        setChats(chats);
        if (chats.length > 0) {
          setSelectedChatId(chats[0]._id); // Select the first chat by default
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      }
    };
  
    fetchChats();
  }, []);
  
  // Fetch conversation messages when a chat is selected
  useEffect(() => {
    if (selectedChatId) {
      const fetchConversation = async () => {
        try {
          const response = await fetch(`http://92.113.31.116:5003/api/getConversation/${selectedChatId}`);  // Use the public IP and port 5003
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const messages = await response.json();
          setConversation(messages);
        } catch (error) {
          console.error("Error fetching conversation:", error);
        }
      };
  
      fetchConversation();
    }
  }, [selectedChatId]);

  // Scroll to bottom of conversation container
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [conversation]);

  const sendMessage = async () => {
    if (!selectedChatId || isStreaming) return;
  
    const newMessage = { role: "user", content: input, chatId: selectedChatId };
    setConversation(prev => [...prev, newMessage]);
    setInput("");
    setIsStreaming(true);
  
    // Create an AbortController to allow stopping the fetch request
    const controller = new AbortController();
    controllerRef.current = controller;
  
    try {
      const response = await fetch('http://92.113.31.116:5003/api/continueConversation', {  // Use the public IP and port 5003
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ history: [...conversation, newMessage], chatId: selectedChatId }),
        signal: controller.signal,
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textContent = "";
      let assistantMessage = { role: "assistant", content: "", chatId: selectedChatId };
  
      setConversation(prev => [...prev, assistantMessage]);
  
      while (true) {
        const { done, value } = await reader.read();
        if (done || controller.signal.aborted) break;
  
        const chunk = decoder.decode(value);
        textContent += chunk;
  
        setConversation(prev => [
          ...prev.slice(0, -1),
          { role: "assistant", content: textContent, chatId: selectedChatId },
        ]);
      }
  
      setIsStreaming(false);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Streaming aborted.');
      } else {
        console.error("There was an error!", error);
      }
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  const handleChatChange = (chatId) => {
    setSelectedChatId(chatId);
  };

  const createChat = async () => {
    const name = prompt("Enter chat name:");
    if (name) {
      try {
        const response = await fetch('http://92.113.31.116:5003/api/createChat', {  // Use the public IP and port 5003
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newChat = await response.json();
        setChats(prevChats => [...prevChats, newChat]);
        setSelectedChatId(newChat._id);
      } catch (error) {
        console.error("Error creating chat:", error);
      }
    }
  };

  const deleteChat = async (chatId) => {
    console.log(`Attempting to delete chat with ID: ${chatId}`);
    try {
      const response = await fetch(`http://92.113.31.116:5003/api/deleteChat/${chatId}`, {  // Use the public IP and port 5003
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response: ${response.status} - ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Chat deleted successfully');

      // Update chat list
      setChats(prevChats => {
        const updatedChats = prevChats.filter(chat => chat._id !== chatId);
        
        // Automatically select the top chat if available
        if (updatedChats.length > 0) {
          setSelectedChatId(updatedChats[0]._id);
          return updatedChats;
        } else {
          // If no chats are left, clear selected chat and conversation
          setSelectedChatId(null);
          setConversation([]);
          return updatedChats;
        }
      });
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !isStreaming) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-60 bg-gray-100 text-black p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Chats</h2>
        <button
          onClick={createChat}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-0 mb-10"
        >
          New Chat
        </button>
        <ul className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <li
              key={chat._id}
              className={`p-2 cursor-pointer rounded flex items-center justify-between hover:bg-indigo-500 hover:text-white ${chat._id === selectedChatId ? 'bg-indigo-600 text-white' : ''}`}
              onClick={() => handleChatChange(chat._id)}
            >
              <span>{chat.name}</span>
              {chat._id === selectedChatId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat._id);
                  }}
                  className="text-white hover:text-gray-300"
                >
                  <FaTrash />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col bg-white">
        <div
          ref={containerRef}
          className="flex-1 p-4 mx-auto max-w-4xl overflow-y-scroll no-scrollbar"
          style={{ maxWidth: '60%' }}
        >
          {conversation.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-6`}
            >
              <div
                className={`p-4 rounded-lg max-w-[75%] ${message.role === "user" ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-900"}`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 flex items-center justify-center space-x-2">
          <div className="relative w-full max-w-4xl"> {/* Limit the max width of the input box */}
            <textarea
              rows="2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-20 resize-none p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
              placeholder="Type your message..."
              disabled={isStreaming} // Disable input while streaming
            />
            {isStreaming && (
              <button
                onClick={stopStreaming}
                className="absolute right-3 top-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Stop
              </button>
            )}
          </div>
          <button
            onClick={sendMessage}
            disabled={isStreaming} // Disable send button while streaming
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
