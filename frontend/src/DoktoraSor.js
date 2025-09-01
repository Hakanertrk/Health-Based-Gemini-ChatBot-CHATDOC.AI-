import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import "./DoktoraSor.css";

export default function DoktoraSor({ token }) {
  const [questions, setQuestions] = useState([]); // Tüm soru başlıkları
  const [selectedQuestion, setSelectedQuestion] = useState(null); // Seçilen soru
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [subject, setSubject] = useState(""); // Yeni soru başlığı
  const [initialMessage, setInitialMessage] = useState(""); // Yeni soru mesajı
  const messagesEndRef = useRef(null); // Scroll için ref

  // Kullanıcının tüm sorularını çek
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/my-questions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(res.data);
    } catch (err) {
      console.error("Sorular alınamadı:", err);
    }
  }, [token]);

  // Mesajları çek
const fetchMessages = useCallback(
  async (qId = selectedQuestion?.id) => {
    if (!qId) return;
    try {
      const res = await axios.get(
        `http://127.0.0.1:5000/doctor-question/${qId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(res.data); // scroll useEffect ile tetiklenecek
    } catch (err) {
      console.error("Mesajlar alınamadı:", err);
    }
  },
  [selectedQuestion, token]
);

  // Yeni soru oluştur
  const createQuestion = async () => {
    if (!subject.trim() || !initialMessage.trim()) return;
    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/doctor-questions",
        { subject, message: initialMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQuestions();
      setSubject("");
      setInitialMessage("");
      openChat({ id: res.data.question_id, subject });
    } catch (err) {
      console.error("Soru oluşturulamadı:", err);
    }
  };
  



  // Mesaj gönder
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedQuestion) return;
    try {
      await axios.post(
        `http://127.0.0.1:5000/doctor-question/${selectedQuestion.id}/messages`,
        { message: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      console.error("Mesaj gönderilemedi:", err);
    }
  };

  const scrollToBottom = () => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }
};
useEffect(() => {
  if (messages.length > 0) {
    scrollToBottom();
  }
}, [messages]);

  // Bir soruyu seç ve mesajları göster
  const openChat = (question) => {
    setSelectedQuestion(question);
    fetchMessages(question.id);
  };

  
  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(() => fetchQuestions(), 3000);
    return () => clearInterval(interval);
  }, [fetchQuestions]);

  // Mesajları 3 saniyede bir güncelle
  useEffect(() => {
    if (selectedQuestion) {
      const interval = setInterval(() => fetchMessages(), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedQuestion, fetchMessages]);

  return (
    <div className="doktor-sor-container">
      <h2>Doktor ile Mesajlaşma</h2>

      {/* Yeni soru oluşturma */}
      <div className="new-question">
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Konu başlığı"
        />
        <textarea
          value={initialMessage}
          onChange={(e) => setInitialMessage(e.target.value)}
          placeholder="Sorunuzu yazın..."
          rows="3"
        />
        <button onClick={createQuestion}>Soruyu Gönder</button>
      </div>

      {/* Soru başlıkları listesi */}
      <h3>Mevcut Sorular</h3>
      <div className="question-list">
        {questions.map((q) => (
          <div
            key={q.id}
            className={`question-item ${selectedQuestion?.id === q.id ? "active" : ""}`}
            onClick={() => openChat(q)}
          >
            {q.subject} ({q.status})
          </div>
        ))}
      </div>

      {/* Mesaj kutucuğu */}
      {selectedQuestion && (
        <div className="chat-box">
          <h4>{selectedQuestion.subject}</h4>
          <div className="messages">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`message ${m.sender === "doctor" ? "doctor" : "user"}`}
              >
                <p>{m.message}</p>
                <small>{new Date(m.created_at).toLocaleString()}</small>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="message-input">
           <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            rows="2"
            onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // yeni satır eklenmesini engelle
                sendMessage();      // Enter ile mesaj gönder
                }
            }}
            />
            <button onClick={sendMessage}>Gönder</button>
          </div>
        </div>
      )}
    </div>
  );
}
