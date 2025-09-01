import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

export default function Profile({ token }) {
  const [userData, setUserData] = useState({
    firstname: "",
    lastname: "",
    username: "",
    age: "",
    height: "",
    weight: "",
    chronic_diseases: "",
    gender: ""
  });
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState(null);

  // ---------------- Fetch profile ve avatar ----------------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:5000/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserData(res.data);
        if (res.data.avatar) setAvatarPreview(res.data.avatar);
      } catch (err) {
        console.error(err.response?.data || err.message);
      }
    };
    fetchProfile();
  }, [token]);

  // ---------------- Avatar seçimi ----------------
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await axios.post(
        "http://127.0.0.1:5000/profile/avatar",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );
      setAvatarPreview(res.data.avatar); // backend’den gelen URL ile güncelle
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  // ---------------- Diğer input değişimleri ----------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // gender backend tarafında değiştirilemez, o yüzden göndermiyoruz
      const { gender, ...dataToUpdate } = userData;

      await axios.post("http://127.0.0.1:5000/profile", dataToUpdate, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPopup(true);
      setTimeout(() => setPopup(false), 2000);
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
    setLoading(false);
  };

  return (
    <div className="profile-container">
      {popup && <div className="profile-popup">Profil başarıyla kaydedildi!</div>}

      <div className="profile-avatar">
        <img src={avatarPreview || "/default-avatar.png"} alt="Profil Avatarı" />
        <input
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
          id="avatarInput"
        />
        <label htmlFor="avatarInput" className="avatar-upload-overlay">
          Avatar Yükle
        </label>
      </div>

      <h2 className="profile-title">Profil Bilgileri</h2>
      <div className="profile-column">
        {["firstname","lastname","username","age","height","weight","chronic_diseases"].map(field => (
          <div className="profile-field" key={field}>
            <label>{field === "firstname" ? "Ad" :
                    field === "lastname" ? "Soyad" :
                    field === "username" ? "Kullanıcı Adı / E-posta" :
                    field === "age" ? "Yaş" :
                    field === "height" ? "Boy (cm)" :
                    field === "weight" ? "Kilo (kg)" :
                    "Kronik Rahatsızlıklar"}:</label>
            <input type="text" name={field} value={userData[field]} onChange={handleChange} />
          </div>
        ))}

        {/* Gender sadece okunabilir olacak */}
        <div className="profile-field">
          <label>Cinsiyet:</label>
          <input type="text" value={userData.gender} disabled />
        </div>
      </div>

      <button onClick={handleSave} disabled={loading} className="save-btn">
        {loading ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
  );
}
