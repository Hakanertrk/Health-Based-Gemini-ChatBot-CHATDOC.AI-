import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import DoctorHeader from "./DoctorHeader";
import "./DoctorPanel.css";

export default function DoctorPanel({ token }) {
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState({});
  const messagesEndRef = useRef({});

const fetchQuestions = useCallback(async () => {
  try {
    const res = await axios.get("http://127.0.0.1:5000/doctor-questions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    // ID bazlı uniq
    const uniqueQuestions = [];
    const ids = new Set();
    res.data.forEach(q => {
      if (!ids.has(q.id)) {
        ids.add(q.id);
        uniqueQuestions.push(q);
      }
    });
    setQuestions(uniqueQuestions);
  } catch (err) {
    console.error(err);
  }
}, [token]);



useEffect(() => {
  fetchQuestions(); // dışarıdaki fonksiyon
  const interval = setInterval(() => fetchQuestions(), 5000);
  return () => clearInterval(interval);
}, [fetchQuestions]); // dependency olarak ekle


  // Mesajları çek
const fetchMessages = async (questionId) => {
  try {
    const res = await axios.get(
      `http://127.0.0.1:5000/doctor-question/${questionId}/messages`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setMessages(prev => ({ ...prev, [questionId]: res.data }));
    // scrollToBottom(questionId); <- bunu kaldır
  } catch (err) {
    console.error(err);
  }
};

  // Mesaj gönder
  const sendMessage = async (questionId) => {
  if (!newMessage[questionId]?.trim()) return;
  try {
    await axios.post(
      `http://127.0.0.1:5000/doctor-question/${questionId}/messages`,
      { message: newMessage[questionId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setNewMessage(prev => ({ ...prev, [questionId]: "" }));
    fetchMessages(questionId); // sadece mesajları güncelle
    // fetchQuestions() çağrısını kaldır
  } catch (err) {
    console.error(err);
  }
};


  const scrollToBottom = (id) => {
    if (messagesEndRef.current[id]) {
      messagesEndRef.current[id].scrollIntoView({ behavior: "smooth" });
    }
  };

  // Chat scroll otomatik
useEffect(() => {
  if (activeQuestionId && messages[activeQuestionId]?.length > 0) {
    scrollToBottom(activeQuestionId);
  }
}, [messages, activeQuestionId]);


  const handleKeyPress = (e, questionId) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // yeni satır eklemez
      sendMessage(questionId);
    }
  };

  return (
    <div className="doctor-panel">
      <DoctorHeader />
      <div className="panel-body">
        <div className="sidebar">
          <h3>Gelen Sorular</h3>
          <ul>
            {questions.map(q => (
              <li
                key={q.id}
                className={activeQuestionId === q.id ? "active" : ""}
                onClick={() => {
                  setActiveQuestionId(q.id);
                  fetchMessages(q.id);
                }}
              >
                {q.subject} - {q.user_name} ({q.status})
              </li>
            ))}
          </ul>
        </div>

        <div className="content">
          {activeQuestionId ? (
            <div className="chat-container">
              {/* Mesajlar scrollable alan */}
              <div className="messages-wrapper">
                {(messages[activeQuestionId] || []).map((m) => (
                  <div
                    key={m.id}
                    className={`message ${m.sender === "doctor" ? "doctor" : "user"}`}
                  >
                    <p>{m.message}</p>
                    <small>{new Date(m.created_at).toLocaleString()}</small>
                  </div>
                ))}
                <div
                  ref={(el) => (messagesEndRef.current[activeQuestionId] = el)}
                />
              </div>

              {/* Mesaj input sabit alt kısımda */}
              <div className="message-input-wrapper">
                <div className="message-input">
                  <textarea
                    rows={2}
                    placeholder="Mesajınızı yazın..."
                    value={newMessage[activeQuestionId] || ""}
                    onChange={(e) =>
                      setNewMessage((prev) => ({
                        ...prev,
                        [activeQuestionId]: e.target.value,
                      }))
                      
                    }
                    onKeyDown={(e) => handleKeyPress(e, activeQuestionId)}
                  />
                  <button onClick={() => sendMessage(activeQuestionId)}>Gönder</button>
                </div>
              </div>
            </div>
          ) : (
            <p>Bir soru seçin ve mesajları görüntüleyin.</p>
          )}
        </div>



      </div>
    </div>
  );
}
