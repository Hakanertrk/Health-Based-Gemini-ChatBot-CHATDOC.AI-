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
  const [doctors, setDoctors] = useState([]); // ✅ Doktor listesi
  const [selectedDoctor, setSelectedDoctor] = useState(""); // ✅ Seçilen doktor
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

useEffect(() => {
  const fetchDoctors = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/doctors");
      setDoctors(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  fetchDoctors();
}, []);

  
  // Mesajları çek
// fetchMessages içinden ve messages useEffect’inden scrollToBottom’u kaldır
const fetchMessages = useCallback(
  async (qId = selectedQuestion?.id) => {
    if (!qId) return;
    try {
      const res = await axios.get(
        `http://127.0.0.1:5000/doctor-question/${qId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(res.data);
      // ❌ scrollToBottom(); <-- kaldır
    } catch (err) {
      console.error("Mesajlar alınamadı:", err);
    }
  },
  [selectedQuestion, token]
);

  // Yeni soru oluştur
const createQuestion = async () => {
    if (!subject.trim() || !initialMessage.trim() || !selectedDoctor) return;
    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/doctor-questions",
        {
          subject,
          message: initialMessage,
          doctor_id: selectedDoctor, // ✅ Doktor ID ekleniyor
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQuestions();
      setSubject("");
      setInitialMessage("");
      setSelectedDoctor("");
      openChat({ id: res.data.question_id, subject });
    } catch (err) {
      console.error("Soru oluşturulamadı:", err);
    }
  };



  // Mesaj gönder
//  sendMessage sonrası scroll yap
const sendMessage = async () => {
  if (!newMessage.trim() || !selectedQuestion) return;
  try {
    await axios.post(
      `http://127.0.0.1:5000/doctor-question/${selectedQuestion.id}/messages`,
      { message: newMessage },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setNewMessage("");
    await fetchMessages();  // mesajları güncelle
    scrollToBottom();       // sadece yeni mesaj sonrası scroll
  } catch (err) {
    console.error("Mesaj gönderilemedi:", err);
  }
};
const [prevMessagesLength, setPrevMessagesLength] = useState(0);

useEffect(() => {
  if (messages.length > prevMessagesLength) {
    scrollToBottom();
  }
  setPrevMessagesLength(messages.length);
}, [messages, prevMessagesLength]); 

const scrollToBottom = () => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }
};



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
        <select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
        >
          <option value="">Bir doktor seçin</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <button onClick={createQuestion}>Soruyu Gönder</button>
      </div>

      {/* Soru başlıkları listesi */}
      <h3>Mevcut Sorular</h3>
        <div className="question-list">
          {questions.map((q) => {
            const statusText =
              q.status.toLowerCase() === "pending"
                ? "Mesaj Bekleniyor"
                : q.status.toLowerCase() === "answered"
                ? "Cevaplandı"
                : q.status;

            return (
              <div
                key={q.id}
                className={`question-item ${selectedQuestion?.id === q.id ? "active" : ""}`}
                onClick={() => openChat(q)}
              >
                {q.subject} ({statusText})
              </div>
            );
          })}
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
