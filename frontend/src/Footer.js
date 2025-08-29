import React from "react";
import "./App.css";

export default function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} CHATDOC 🩺 | Tüm hakları saklıdır.</p>
      <div className="footer-links">
        <a href="https://github.com/Hakanertrk" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a href="https://example.com" target="_blank" rel="noreferrer">
          Hakkımızda
        </a>
        <a href="mailto:destek@chatdoc.com">İletişim</a>
      </div>
    </footer>
  );
}
