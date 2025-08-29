import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import ChatBox from "./ChatBox";
import Login from "./Login";
import Register from "./Register";
import Profile from "./Profile";
import Footer from "./Footer";
import DoctorPanel from "./DoctorPanel";
import Header from "./Header";
import HomePage from "./HomePage";
import "./App.css";
import axios from "axios";

function ChatPage({ token }) {
  const [appointments, setAppointments] = useState([]);
  const [newAppt, setNewAppt] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      const fetchAppointments = async () => {
        try {
          const res = await axios.get("http://127.0.0.1:5000/appointments", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAppointments(res.data);
        } catch (err) {
          console.error("Randevu çekme hatası:", err.response?.data || err.message);
        }
      };
      fetchAppointments();
    }
  }, [token]);

  const addAppointment = async () => {
    if (!newAppt.trim() || !newTitle.trim()) {
      setError("Lütfen tüm alanları doldurun!");
      return;
    }
    setError("");

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/appointments",
        { title: newTitle, datetime: newAppt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAppointments((prev) => [
        ...prev,
        { id: res.data.id, title: newTitle, datetime: newAppt },
      ]);
      setNewAppt("");
      setNewTitle("");
    } catch (err) {
      console.error("Randevu ekleme hatası:", err.response?.data || err.message);
    }
  };

  const deleteAppointment = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:5000/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Randevu silme hatası:", err.response?.data || err.message);
    }
  };

  return (
    <div className="app-container">
      <div className="appointment-panel">
        <h3>📅 Randevular</h3>
        <ul className="appt-list">
          {appointments.map((a) => (
            <li key={a.id} className="appt-item">
              <div className="appt-info">
                <strong>{a.title}</strong>
                <span>{new Date(a.datetime).toLocaleString()}</span>
              </div>
              <button
                onClick={() => deleteAppointment(a.id)}
                className="appt-delete-button"
              >
                Sil
              </button>
            </li>
          ))}
        </ul>

        <div className="appt-form">
          <input
            type="text"
            placeholder="Randevu ismi"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="appt-input-title"
          />
          {error && !newAppt && <span className="appt-error">{error}</span>}

          <input
            type="datetime-local"
            value={newAppt}
            onChange={(e) => setNewAppt(e.target.value)}
            className="appt-input"
          />
          {error && !newTitle && <span className="appt-error">{error}</span>}

          <button onClick={addAppointment} className="appt-button">
            Ekle
          </button>
        </div>
      </div>

      <ChatBox token={token} />
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const navigate = useNavigate();
  const location = useLocation();
  const [popupMessage, setPopupMessage] = useState("");

  const [activeTab, setActiveTab] = useState("gonderilen"); 
  const [questions, setQuestions] = useState([]);
  
  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    navigate("/login");
  };

  

    


const fetchUserQuestions = useCallback(async () => {
  try {
    const res = await axios.get("http://127.0.0.1:5000/my-questions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setQuestions(res.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
  }
}, [token]); // token bağımlılık olarak kalmalı

useEffect(() => {
  if (token) fetchUserQuestions();
}, [token, fetchUserQuestions]);

  const showHeader =
    token &&
    location.pathname !== "/doctor-panel" &&
    location.pathname !== "/login" &&
    location.pathname !== "/register" &&
    location.pathname !== "/home";

  return (
    <div className="app">
      {showHeader && <Header token={token} logout={logout} />}

      <Routes>
        <Route path="/home" element={<HomePage token={token} />} />
        <Route path="/" element={<Navigate to= "/home" />} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/doctor-panel"
          element={token ? <DoctorPanel token={token} /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={token ? <Profile token={token} /> : <Navigate to="/login" />}
        />
        <Route path="/chat" element={token ? <ChatPage token={token} /> : <Navigate to="/login" />} />
        <Route
          path="/doktora-sor"
          element={
            token ? (
              <div className="doktor-sor-container">
                <h2>Doktora Sor</h2>

                <div className="tabs">
                  <button
                    className={activeTab === "gonderilen" ? "active" : ""}
                    onClick={() => setActiveTab("gonderilen")}
                  >
                    Gönderilen Sorular
                  </button>
                  <button
                    className={activeTab === "yanitlanan" ? "active" : ""}
                    onClick={() => setActiveTab("yanitlanan")}
                  >
                    Yanıtlanan Sorular
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const subject = e.target.subject.value.trim();
                    const message = e.target.message.value.trim();
                    if (!subject || !message) return;

                    try {
                      await axios.post(
                        "http://127.0.0.1:5000/doctor-question",
                        { subject, message },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      setPopupMessage("✅ Soru başarıyla gönderildi!");
                      e.target.reset();
                      fetchUserQuestions(); // soruları tekrar çek
                    } catch (err) {
                      console.error(err.response?.data || err.message);
                      alert("Soru gönderilirken bir hata oluştu.");
                    }
                  }}
                >
                  <input type="text" name="subject" placeholder="Sorunun başlığı" required />
                  <textarea name="message" placeholder="Sorunuzu yazın..." rows="5" required />
                  <button type="submit" className="doctor-button">Gönder</button>
                </form>
                <div className="messages-container">
                  {activeTab === "gonderilen" &&
                    questions
                      .filter(q => q.status === "pending")
                      .map(q => (
                        <div key={q.id} className="question-card">
                          <p><strong>{q.subject}</strong></p>
                          <p>{q.message}</p>
                        </div>
                      ))
                  }

                  {activeTab === "yanitlanan" &&
                    questions
                      .filter(q => q.status === "answered" || q.user_reply)
                      .map(q => (
                        <div key={q.id} className="question-card">
                          <p><strong>{q.subject}</strong></p>
                          <p>{q.message}</p>

                         

                     

                          {q.doctor_reply && (
                            <p className="doctor-reply"><strong>Doktor cevabı:</strong> {q.doctor_reply}</p>
                          )}
                        </div>
                      ))
                  }


                </div>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
       
      </Routes>

      {popupMessage && (
        <div className="popup-overlay">
          <div className="popup-box">
            <p>{popupMessage}</p>
            <button onClick={() => setPopupMessage("")}>Kapat</button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
