import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Login({ setToken }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // sayfanın reload olmasını engeller
    setError("");
    setLoading(true);

    if (!username || !password) {
      setError("Kullanıcı adı ve şifre boş olamaz");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://127.0.0.1:5000/login", { username, password });
      
      const { token, role } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", role); // ✅ role bilgisini de kaydediyoruz
      setToken(token);

      // ✅ role göre yönlendirme
      if (role === "doctor") {
        navigate("/doctor-panel");
      } else {  
        navigate("/chat");
      }

    } catch (err) {
      setError(err.response?.data?.error || "Hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    < div className="auth-container" >
      <div className="auth-logo">
        <img src="logo.png" alt="ChatDoc Logo" />
      </div>
      <form className="auth-form" onSubmit={handleLogin}>
        <h2>Giriş yap</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}

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

        <button type="submit" disabled={loading}>
          {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
        </button>

        <div style={{ marginTop: "10px" }}>
          <p>Hesabın yok mu?</p>
          <button type="button" onClick={() => navigate("/register")}>
            Kayıt Ol
          </button>
        </div>
          <div style={{ marginTop: "10px" }}>
            <button type="button" onClick={() => navigate("/home")}>
              ← Ana Sayfaya Dön
            </button>
          </div>
      </form>
    </div >
  );
}
