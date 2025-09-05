// HomePage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css";

export default function HomePage({ token }) {
  const navigate = useNavigate();
  const handleStart = () => token ? navigate("/chat") : navigate("/login");

  return (
    <div className="homepage">
      {/* Navbar / Header */}
      <header className="hp-header">
       <div className="hp-logo">
          <a href="/home" onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <img src="/logo.png" alt="Logo" />
          </a>
        </div>
      <nav className="hp-nav">
        <a
          href="#features"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector("#features").scrollIntoView({ behavior: "smooth" });
          }}
        >
          Özellikler
        </a>
        <a
          href="#about"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector("#about").scrollIntoView({ behavior: "smooth" });
          }}
        >
          Hakkımızda
        </a>
        <a
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            document.querySelector("#contact").scrollIntoView({ behavior: "smooth" });
          }}
        >
          İletişim
        </a>
      </nav>

        <div className="hp-auth">
          <button onClick={() => navigate("/login")}>Giriş Yap</button>
          <button onClick={() => navigate("/register")}>Kayıt Ol</button>
        </div>
      </header>

      {/* Hero / Ana Giriş */}
      <section id= "home" className="hp-hero">
        <h1>Sağlığınızı Yapay Zeka ile Yönetin</h1>
        <p>Her zaman, her yerden sorularınızı sorabilir ve anında cevap alabilirsiniz.</p>
        <button onClick={handleStart} className="hp-cta">Hemen Başla</button>
      </section>

      {/* Özellikler */}
      <section id="features" className="hp-features">
        <h2>Özelliklerimiz</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>Hızlı Cevaplar</h3>
            <p>Sorularınıza anında cevap alın ve zaman kaybetmeyin.</p>
          </div>
          <div className="feature-card">
            <h3>Uzman Bilgisi</h3>
            <p>Sorularınızı gerçek doktorlara sorun.</p>
          </div>
          <div className="feature-card">
            <h3>Kolay Kullanım</h3>
            <p>Basit ve anlaşılır arayüz ile her yaş için uygun.</p>
          </div>
          <div className="feature-card">
            <h3>Güvenli</h3>
            <p>Verileriniz güvende, gizliliğiniz korunuyor.</p>
          </div>
        </div>
      </section>

      {/* Hakkımızda */}
      <section id="about" className="hp-about">
        <h2>Hakkımızda</h2>
        <p>CHATDOC.AI,  Biz, sağlık ve teknoloji alanını birleştirerek kullanıcılarımıza hızlı, güvenilir ve kolay erişilebilir çözümler sunmayı hedefleyen bir platformuz. Amacımız, herkesin ihtiyaç duyduğu bilgilere zahmetsizce ulaşabilmesini sağlamak ve kullanıcı deneyimini sürekli olarak iyileştirmektir. Yenilikçi yaklaşımımız ve uzman ekibimizle, sağlık hizmetlerini dijital ortamda daha erişilebilir ve kullanıcı dostu hale getiriyoruz.</p>
      </section>

      {/* İletişim */}
      <section id="contact" className="hp-contact">
        <h2>İletişim</h2>
        <p>Email: info@chatdocai.com</p>
        <p>Telefon: +90 555 555 55 55</p>
      </section>

   
    </div>
  );
}
