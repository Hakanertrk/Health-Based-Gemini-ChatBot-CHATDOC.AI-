import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Message from "./Message";
import { FaFileCirclePlus } from "react-icons/fa6";

export default function ChatBox({ token, selectedChat, onAnyMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setUploadedFile] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // -----------------------
  // Mesaj geçmişini çek (chatId bazlı)
  // -----------------------
  useEffect(() => {
    if (!token || !selectedChat) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(
          `http://127.0.0.1:5000/chats/${selectedChat}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(res.data);
      } catch (err) {
        console.error("Mesaj geçmişi alınamadı:", err.response?.data || err.message);
      }
    };

    fetchMessages();
  }, [token, selectedChat]);

  // -----------------------
  // Scroll
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
      if (onAnyMessageSent) onAnyMessageSent();
    } catch (err) {
      console.error("Mesaj gönderme hatası:", err.response?.data || err.message);
      setMessages(prev => [
        ...prev,
        { sender: "bot", text: "⚠️ Bir hata oluştu. Lütfen tekrar deneyin." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------
  // Enter ile gönder
  // -----------------------
  const handleKeyDown = e => {
    if (e.key === "Enter") sendMessage();
  };

  // -----------------------
  // PDF yükleme (chat ID bazlı)
  // -----------------------
  const handleFileUpload = async e => {
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
      if (onAnyMessageSent) onAnyMessageSent();
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
          onKeyDown={handleKeyDown}
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
