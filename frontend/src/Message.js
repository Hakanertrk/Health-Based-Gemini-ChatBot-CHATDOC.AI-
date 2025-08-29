import React from "react";
import ReactMarkdown from "react-markdown";

export default function Message({ sender, text, type }) {
  // Farklı mesaj tiplerine göre class ekleyebiliriz
  const classes = `message ${sender} ${type || ""}`;

  return (
    <div className={classes}>
      {Array.isArray(text) ? (
        text.map((t, i) => <p key={i}>{t}</p>)  // Çok parçalı cevap
      ) : sender === "bot" ? (
        <ReactMarkdown>{text}</ReactMarkdown>   // Bot mesajını Markdown olarak render et
      ) : (
        <p>{text}</p>                            // Kullanıcı mesajını normal göster
      )}
    </div>
  );
}
