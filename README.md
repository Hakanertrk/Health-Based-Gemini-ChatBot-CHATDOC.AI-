# 🤖 Health Based Gemini Chatbot/ CHATDOC.AI

A simple AI-powered chatbot application built with **React (frontend)** and **Flask (backend)**.  
This project demonstrates user authentication (login/register), chat functionality, and profile management.

---

## 📌 Features
- 🔐 **User Authentication** (Register & Login)
- 👤 **Profile Page**
- 💬 **Chat Interface** with AI responses
- 🎨 Clean and responsive **UI/UX**
- ⚡ Fast integration between **React frontend** and **Flask backend**

---

## 🛠️ Tech Stack
### Frontend
- React
- React Router
- Axios
- CSS / Tailwind (depending on your setup)

### Backend
- Python (Flask)
- Flask-JWT for authentication
- SQLite / PostgreSQL (configurable)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Hakanertrk/Basic-Gemini-Chatbot.git
cd Basic-Gemini-Chatbot
2. Backend Setup (Flask)
bash
Kodu kopyala
cd backend
python -m venv venv
source venv/bin/activate   # (Mac/Linux)
venv\Scripts\activate      # (Windows)

pip install -r requirements.txt
flask run
Backend will start on: http://127.0.0.1:5000

3. Frontend Setup (React)
bash
Kodu kopyala
cd frontend
npm install
npm start
Frontend will start on: http://localhost:3000

📂 Project Structure
bash
Kodu kopyala
Basic-Gemini-Chatbot/
│
├── backend/         # Flask backend
│   ├── app.py
│   ├── models.py
│   └── requirements.txt
│
├── frontend/        # React frontend
│   ├── src/
│   │   ├── App.js
│   │   ├── ChatBox.js
│   │   ├── Login.js
│   │   ├── Register.js
│   │   └── Profile.js
│   └── package.json
│
└── README.md
📸 Screenshots
(Add screenshots of your app here for a professional look)

🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

📄 License
