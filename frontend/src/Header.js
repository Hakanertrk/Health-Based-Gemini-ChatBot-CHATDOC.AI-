import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header({ token, logout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isChatPage = location.pathname === "/chat";
  const isDoctorQuestionPage = location.pathname === "/doktora-sor";

  if (!token) return null; // login veya register sayfasında header gözükmesin

  return (
  <header className="app-header">
    <div className="logo">
      <img src="/logo.png" alt="ChatDoc Logo" />
    </div>
    <div className="menu">

       {!isDoctorQuestionPage && (
        <button onClick={() => navigate("/doktora-sor")}>Doktor'a Sor</button>
      )}
      <button onClick={() => navigate(isChatPage ? "/profile" : "/chat")}>
        {isChatPage ? "Profil" : "Chat"}
      </button>
      <button onClick={logout}>Çıkış Yap</button>
    </div>
  </header>
  );
}
