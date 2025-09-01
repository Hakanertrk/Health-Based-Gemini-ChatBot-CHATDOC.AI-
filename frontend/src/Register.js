import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import axios from "axios";
import "./App.css"; 

export default function Register() {

  const [activeTab, setActiveTab] = useState("user"); // 'user' veya 'doctor'
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState(""); 
  const [license_number, setLicense_number] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate(); //  yönlendirme hook

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!firstname || !lastname || !username || !password) {
      setError("Tüm alanlar zorunludur");
      return;
    }

    if (activeTab === "doctor" && (!specialization || !license_number)) {
      setError("Doktorlar için tüm alanlar zorunludur");
      return;
    }

    try {
      const res = await axios.post("http://127.0.0.1:5000/register", {
        firstname,
        lastname,
        username,
        password,
        role: activeTab, // 'user' veya 'doctor'
        ...(activeTab === "doctor" && { specialization, license_number }),
      });

      setSuccess(res.data.message || "Kayıt başarılı!");
      setError("");
      setFirstname("");
      setLastname("");
      setUsername("");
      setPassword("");
      setSpecialization("");
      setLicense_number("");
    

   
    } catch (err) {
      setError(err.response?.data?.error || "Kayıt sırasında hata oluştu");
    }
  };

  return (
    <div className="auth-container">

        <div className="auth-logo">
          <img src="logo.png" alt="ChatDoc Logo" />
        </div>

      

      
      <form onSubmit={handleRegister} className="auth-form">
        <h2>Kayıt Ol</h2>

        <div className="tab-header">
        <button
          className={activeTab === "user" ? "active-tab" : ""}
          onClick={() => setActiveTab("user")}
        >
          Kullanıcı Kayıt
        </button>
        <button
          className={activeTab === "doctor" ? "active-tab" : ""}
          onClick={() => setActiveTab("doctor")}
        >
          Doktor Kayıt
        </button>
      </div>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        <input
          type="text"
          placeholder="Ad"
          value={firstname}
          onChange={(e) => setFirstname(e.target.value)}
        />
        <input
          type="text"
          placeholder="Soyad"
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
        />
        <input
          type="text"
          placeholder="E-posta"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {/* Doktor için ekstra alanlar */}
        {activeTab === "doctor" && (
          <>
            <input
              type="text"
              placeholder="Uzmanlık"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
            />
            <input
              type="text"
              placeholder="Lisans Numarası"
              value={license_number}
              onChange={(e) => setLicense_number(e.target.value)}
            />
          </>
        )}

        <button type="submit">Kayıt Ol</button>

        {/* Giriş ekranına yönlendirme */}
        <div style={{ marginTop: "10px" }}>
          <p>Zaten hesabın var mı?</p>
          <button type="button" onClick={() => navigate("/login")}>
            Giriş Yap
          </button>
        </div>
      </form>
    </div>
  );
}
