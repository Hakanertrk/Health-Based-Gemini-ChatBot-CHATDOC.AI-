import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ChatSidebar.css";

export default function ChatSidebar({ token, selectedChat, onSelectChat, onNewChat }) {
  const [chats, setChats] = useState([]);

  // Kullanıcı adını decode ederek çekelim (chat_history backend'de username ile tutuluyor)
  const [username, setUsername] = useState(null);

  useEffect(() => {
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUsername(payload.username);
    } catch (err) {
      console.error("Token decode edilemedi:", err);
    }
  }, [token]);

  // Chatleri yükle
  useEffect(() => {
    if (!token || !username) return;

    const fetchChats = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/history", {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Backend chat_history yapısı: { username: { chatId1: [...], chatId2: [...] } }
        const userChats = res.data[username] || {};
        const chatList = Object.keys(userChats).map(chatId => ({
          id: chatId,
          title: `Chat #${chatId}`
        }));
        setChats(chatList);
      } catch (err) {
        console.error("Chats yüklenemedi:", err);
      }
    };
    fetchChats();
  }, [token, username]);

  return (
    <div className="sidebar">
      <button className="new-chat-btn" onClick={onNewChat}>＋ Yeni Sohbet</button>
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
