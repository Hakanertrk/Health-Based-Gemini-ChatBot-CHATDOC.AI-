import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ChatSidebar.css";
import { FileEdit } from "lucide-react";


export default function ChatSidebar({ token, selectedChat, onSelectChat, onNewChat, version }) {
  const [chats, setChats] = useState([]);

  // Chatleri backend'den çek (/chats)
  useEffect(() => {
    if (!token) return;

    const fetchChats = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/chats", {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Beklenen format: [{ chatId, title }]
        const chatList = (res.data || []).map(c => ({ id: c.chatId, title: c.title }));
        setChats(chatList);

        // Eğer seçili chat yoksa ilkini seç
        if (chatList.length > 0 && !selectedChat) {
          onSelectChat(chatList[0].id);
        }
      } catch (err) {
        console.error("Chats yüklenemedi:", err.response?.data || err.message);
      }
    };

    fetchChats();
  }, [token, selectedChat, onSelectChat, version]);

  return (
    <div className="chat-sidebar">
      <button className="new-chat-btn" onClick={onNewChat}>
        <FileEdit size={18} className="icon" />
         Yeni Sohbet
      </button>
      <ul className="chat-list">
        {chats.map(chat => (
          <li
            key={chat.id}
            className={`chat-item ${selectedChat === chat.id ? "active" : ""}`}
            onClick={() => onSelectChat(chat.id)}
          >
            {chat.title}
          </li>
        ))}
        {chats.length === 0 && <li className="no-chat">Hiç sohbet yok</li>}
      </ul>
    </div>
  );
}
