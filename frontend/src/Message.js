import React from "react";
import ReactMarkdown from "react-markdown";

export default function Message({ sender, text, type }) {
  // Farklı mesaj tiplerine göre class ekleyebiliriz
  const classes = `message ${sender} ${type || ""}`;

  return (
    <div className={classes} style={{ whiteSpace: "pre-wrap" }}>
      {Array.isArray(text) ? (
        text.map((t, i) => <p key={i}>{t}</p>)  // Çok parçalı cevap
      ) : (
        <ReactMarkdown>{text}</ReactMarkdown>   // Hem bot hem kullanıcı için Markdown render
      )}
    </div>
  );
}
