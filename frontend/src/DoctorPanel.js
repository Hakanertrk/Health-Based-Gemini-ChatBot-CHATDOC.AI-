import React, { useState, useEffect, useRef } from "react"; 
import axios from "axios";
import DoctorHeader from "./DoctorHeader"; 

export default function DoctorPanel({ token }) {
  const [questions, setQuestions] = useState([]);
  const [replyMap, setReplyMap] = useState({});
  const [activeTab, setActiveTab] = useState("gelen"); 
  const messagesEndRef = useRef(null); 

  const fetchQuestions = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/doctor-questions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplyChange = (id, value) => {
    setReplyMap(prev => ({ ...prev, [id]: value }));
  };

  const sendReply = async (id) => {
    if (!replyMap[id]) return;
    try {
      await axios.post(
        `http://127.0.0.1:5000/doctor-question/${id}/reply`,
        { reply: replyMap[id] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchQuestions();
      setReplyMap(prev => ({ ...prev, [id]: "" }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/doctor-questions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuestions(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchQuestions();
  }, [token]);

  /* // Yeni mesaj geldiğinde otomatik en alta kaydır
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [questions, activeTab]); */

  return (
    <div className="doctor-panel">
     
      <DoctorHeader />

      <div className="panel-body">
       
        <div className="sidebar">
          <h3>Doktor Panel</h3>
          <ul>
            <li
              className={activeTab === "gelen" ? "active" : ""}
              onClick={() => setActiveTab("gelen")}
            >
              Gelen Sorular
            </li>
            <li
              className={activeTab === "yanitlanan" ? "active" : ""}
              onClick={() => setActiveTab("yanitlanan")}
            >
              Yanıtlananlar
            </li>
            <li
              className={activeTab === "ayarlar" ? "active" : ""}
              onClick={() => setActiveTab("ayarlar")}
            >
              Ayarlar
            </li>
          </ul>
        </div>

     
        <div className="content">
          

     
          <div className="messages-container-panel">
            {activeTab === "gelen" &&
              questions
                .filter(q => q.status === "pending")
                .map(q => (
                  <div key={q.id} className="question-card">
                    <p>
                      <strong>{q.subject}</strong> - {q.user_name} ({q.status})
                    </p>
                    <p>{q.message}</p>
                    <textarea
                      placeholder="Cevap yaz..."
                      value={replyMap[q.id] || ""}
                      onChange={e => handleReplyChange(q.id, e.target.value)}
                    />
                    <button onClick={() => sendReply(q.id)}>Cevapla</button>
                  </div>
                ))}

            {activeTab === "yanitlanan" &&
              questions
                .filter(q => q.status === "answered")
                .map(q => (
                  <div key={q.id} className="question-card">
                    <p>
                      <strong>{q.subject}</strong> - {q.user_name} ({q.status})
                    </p>
                    <p>{q.message}</p>
                    <p>
                      <em>Cevap: {q.doctor_reply}</em>
                    </p>
                  </div>
                ))}

            {activeTab === "ayarlar" && (
              <div>
                <h2>Ayarlar</h2>
                <p>Burada doktor ayarları yer alacak.</p> 
              </div>
            )}

            
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
