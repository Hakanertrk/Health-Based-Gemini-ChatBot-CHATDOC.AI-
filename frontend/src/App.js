import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import ChatBox from "./ChatBox";
import ChatSidebar from "./ChatSidebar";
import Login from "./Login";
import Register from "./Register";
import Profile from "./Profile";
import Footer from "./Footer";
import DoctorPanel from "./DoctorPanel";
import Header from "./Header";
import HomePage from "./HomePage";
import DoktoraSor from "./DoktoraSor";
import axios from "axios";
import "./App.css";

function ChatPage({ token }) {
  const [selectedChat, setSelectedChat] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [newAppt, setNewAppt] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  // -----------------------
  // Chat listesini çek ve seçili chat belirle
  // -----------------------
  useEffect(() => {
    if (!token) return;
    const ensureChat = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/chats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const chats = res.data || [];
        if (chats.length > 0) {
          if (!selectedChat) setSelectedChat(chats[0].chatId);
        } else {
          const createRes = await axios.post(
            "http://127.0.0.1:5000/chats",
            { title: "Yeni Sohbet" },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setSelectedChat(createRes.data.chatId);
        }
      } catch (err) {
        console.error("Chats yüklenemedi/oluşturulamadı:", err.response?.data || err.message);
      }
    };
    ensureChat();
  }, [token, selectedChat]);

  // -----------------------
  // Randevuları çek
  // -----------------------
  useEffect(() => {
    if (!token) return;
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
      setAppointments(prev => [...prev, { id: res.data.id, title: newTitle, datetime: newAppt }]);
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
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Randevu silme hatası:", err.response?.data || err.message);
    }
  };

  const createNewChat = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/chats",
        { title: "Yeni Sohbet" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedChat(res.data.chatId);
    } catch (err) {
      console.error("Yeni chat oluşturma hatası:", err.response?.data || err.message);
    }
  };

  return (
    <div className="app-container chat-page">
      <ChatSidebar
        token={token}
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
        onNewChat={createNewChat}
      />
      <ChatBox token={token} selectedChat={selectedChat} />

      <div className="appointment-panel">
        <h3>📅 Randevular</h3>
        <ul className="appt-list">
          {appointments.map(a => (
            <li key={a.id} className="appt-item">
              <div className="appt-info">
                <strong>{a.title}</strong>
                <span>{new Date(a.datetime).toLocaleString()}</span>
              </div>
              <button onClick={() => deleteAppointment(a.id)} className="appt-delete-button">
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
            onChange={e => setNewTitle(e.target.value)}
            className="appt-input-title"
          />
          {error && !newAppt && <span className="appt-error">{error}</span>}

          <input
            type="datetime-local"
            value={newAppt}
            onChange={e => setNewAppt(e.target.value)}
            className="appt-input"
          />
          {error && !newTitle && <span className="appt-error">{error}</span>}

          <button onClick={addAppointment} className="appt-button">
            Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const navigate = useNavigate();
  const location = useLocation();
  const [, setQuestions] = useState([]);

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    navigate("/login");
  };

  const fetchUserQuestions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("http://127.0.0.1:5000/my-questions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuestions(res.data);
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  }, [token]);

  useEffect(() => {
    fetchUserQuestions();
  }, [fetchUserQuestions]);

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
        <Route path="/" element={<Navigate to="/home" />} />
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
        <Route path="/doktora-sor" element={<DoktoraSor token={token} />} />
      </Routes>

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
