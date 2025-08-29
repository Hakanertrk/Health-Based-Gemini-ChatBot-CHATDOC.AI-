import React from "react";
import { useNavigate } from "react-router-dom";

export default function DoctorHeader() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token"); // token sil
    navigate("/login"); // login sayfasına yönlendir
  };

  return (
    <header className="doctor-header">
      <img src="/logo.png" alt="CHATDOC Logo" className="doctor-logo" />
      <button className="doctor-logout" onClick={handleLogout}>
        Çıkış Yap
      </button>
    </header>
  );
}
