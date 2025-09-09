import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import DoctorHeader from "./DoctorHeader";
import "./DoctorPanel.css";
import { FaDownload, FaPaperclip } from "react-icons/fa";


export default function DoctorPanel({ token }) {
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState({});
  const [fileToSend, setFileToSend] = useState({});
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

  // Mesaj gönder (metin + opsiyonel dosya)
  const sendMessage = async (questionId) => {
    const text = newMessage[questionId]?.trim() || "";
    const file = fileToSend[questionId] || null;
    if (!text && !file) return;
    try {
      const formData = new FormData();
      formData.append("message", text);
      if (file) formData.append("file", file);

      await axios.post(
        `http://127.0.0.1:5000/doctor-question/${questionId}/messages`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );
      setNewMessage(prev => ({ ...prev, [questionId]: "" }));
      setFileToSend(prev => ({ ...prev, [questionId]: null }));
      fetchMessages(questionId); // sadece mesajları güncelle
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
        {/* panel-sidebar */}
        <div className="panel-sidebar">
          <div className="panel-sidebar-header">
            <h2>
              Merhabalar, Dr. {localStorage.getItem("firstname")} {localStorage.getItem("lastname")}
            </h2>
          </div>
          <div className="question-list">
            {questions.map(q => (
              <div
                key={q.id}
                className={`question-card ${activeQuestionId === q.id ? "active" : ""}`}
                onClick={() => {
                  setActiveQuestionId(q.id);
                  fetchMessages(q.id);
                }}
              >
                {q.status.toLowerCase() !== "closed" && (
                  <div className="card-closed">
                    <button
                      className="card-closed-button"
                      onClick={(e) => {
                        e.stopPropagation(); // kartın onClick'ini tetiklemesin
                        axios.post(
                          `http://127.0.0.1:5000/doctor-questions/${q.id}/close`,
                          {},
                          { headers: { Authorization: `Bearer ${token}` } }
                        )
                        .then(() => fetchQuestions())
                        .catch(err => console.error("Close error:", err));
                      }}
                    >
                      Kapat
                    </button>                                 
                  </div>
                )}  
                <div className="question-header">
                  <strong>{q.subject}</strong>
                  <span className={`status ${q.status.toLowerCase()}`}>{q.status}</span>
                </div>

                <div className="question-user">
                  {q.gender === "female" ? "👩" : q.gender === "male" ? "👨" : "👨"} {q.user_name}
                </div>

              </div>
            ))}
          </div>
        </div>


        <div className="content">
          {activeQuestionId ? (
            <div className="chat-container-panel">
              {/* Mesajlar scrollable alan */}
              <div className="messages-wrapper">
                {(messages[activeQuestionId] || []).map((m) => (
                  <div key={m.id} className={`message ${m.sender === "doctor" ? "doctor" : "user"}`}>
                    <p>{m.message}</p>
                    {m.file_url && (
                      <div>
                        {m.file_url && (
                          <div>
                            {m.file_url.match(/\.(jpg|jpeg|png)$/i) ? (
                              <img src={m.file_url} alt="Dosya" style={{ maxWidth: "200px", borderRadius: "8px" }} />
                            ) : (
                              <div className="file-download">
                                  <a href={m.file_url} download target="_blank" rel="noopener noreferrer">
                                    {m.file_url.split("/").pop()}{" "}
                                    <FaDownload style={{ marginLeft: "6px", cursor: "pointer" }} />
                                  </a>
                              </div>    
                            )}
                          </div>
                        )}

                      </div>
                    )}
                    <small>{new Date(m.created_at).toLocaleString()}</small>
                  </div>
                ))}
                <div
                  ref={(el) => (messagesEndRef.current[activeQuestionId] = el)}
                />
              </div>

              {/* Mesaj input sabit alt kısımda */}
              <div className="message-input-wrapper">
                <div className="panel-message-input">
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

                  {/* Dosya adı input barında göster */}
                  {fileToSend[activeQuestionId] && (
                    <div className="panel-file-name-bar">
                      {fileToSend[activeQuestionId].name}
                    </div>
                  )}

                  <label className="panel-attach-icon">
                    <FaPaperclip size={20} style={{ cursor: "pointer" }} />
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                        setFileToSend((prev) => ({ ...prev, [activeQuestionId]: f }));
                      }}
                    />
                  </label>

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
