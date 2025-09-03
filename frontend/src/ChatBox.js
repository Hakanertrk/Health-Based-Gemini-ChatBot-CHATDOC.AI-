import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Message from "./Message";
import { FaFileCirclePlus } from "react-icons/fa6";

export default function ChatBox({ token, selectedChat }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setUploadedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // -----------------------
  // Mesaj geçmişini seçili chat ID'ye göre çek
  // -----------------------
  useEffect(() => {
    if (!token || !selectedChat) return;

    const fetchHistory = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/history", {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Backend chat_history yapısı: { username: { chatId: [...] } }
        const payload = JSON.parse(atob(token.split(".")[1]));
        const username = payload.username;

        const userChats = res.data[username] || {};
        const chatMessages = userChats[selectedChat] || [];
        setMessages(chatMessages);
      } catch (error) {
        console.error("History Hatası:", error.response?.data || error.message);
      }
    };

    fetchHistory();
  }, [token, selectedChat]);

  // -----------------------
  // Mesaj scroll
  // -----------------------
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // -----------------------
  // Mesaj gönderme
  // -----------------------
  const sendMessage = async () => {
    if (!input.trim() || loading || !selectedChat) return;

    const userMsg = { sender: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    const messageText = input;
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        `http://127.0.0.1:5000/chat/${selectedChat}`,
        { message: messageText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const botReply = res.data?.reply || "⚠️ Yanıt alınamadı.";
      const botMsg = { sender: "bot", text: botReply };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Backend Hatası:", error.response?.data || error.message);
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "⚠️ Bir hata oluştu. Lütfen tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // PDF yükleme + analiz
  // -----------------------
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChat) return;

    setUploadedFile(file);
    const formData = new FormData();
    formData.append("pdf", file);

    const userMsg = { sender: "user", text: `📄 PDF Yüklendi: ${file.name}` };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/upload_pdf",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const botMsg = { sender: "bot", text: res.data.reply };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("PDF yükleme hatası:", err.response?.data || err.message);
      setMessages(prev => [...prev, { sender: "bot", text: "⚠️ PDF analiz edilemedi." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chatbox">
      <div className="chat-area">
        {messages.map((m, i) => (
          <Message key={i} sender={m.sender} text={m.text} />
        ))}
        {loading && (
          <div className="typing">
            <span></span><span></span><span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Bir şey sor..."
          onKeyDown={e => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? "Gönderiliyor..." : "Gönder"}
        </button>

        <FaFileCirclePlus
          className="pdf-icon"
          onClick={() => fileInputRef.current.click()}
          title="PDF Yükle"
        />
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}
