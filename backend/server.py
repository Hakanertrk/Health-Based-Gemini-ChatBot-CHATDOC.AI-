from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
import datetime
import psycopg2
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import fitz
import re


load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET")
ALLOWED_EXTENSIONS = {'pdf'}
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# PostgreSQL bağlantısı
conn = psycopg2.connect(
    dbname=os.getenv("POSTGRES_DB"),
    user=os.getenv("POSTGRES_USER"),
    password=os.getenv("POSTGRES_PASSWORD"),
    host=os.getenv("POSTGRES_HOST"),
    port=os.getenv("POSTGRES_PORT")
)
cursor = conn.cursor()

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
CORS(app)

API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# -----------------------
# Kullanıcı chat durumları
# -----------------------
chat_history = {}  
waiting_for_bot = {}  

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# -----------------------
# Danger kelimeler
# -----------------------
danger_words = [
    "göğüs ağrısı", "çarpıntı", "nefes darlığı", "bayılma", "hipotansiyon",
    "kalp krizi", "kalp durması", "nabız düşüklüğü", "nabız yükselmesi",
    "felç", "baş dönmesi", "nöbet", "astım krizi",
    "şiddetli karın ağrısı", "kusma", "kan kusmak", "şiddetli kanama",
    "intihar", "kendime zarar", "zehirlen", "allergik şok", "anafilaksi",
    "kırık", "yanık", "boğulma", "düşme", "şok", "bilinç kaybı",
    "kırıldı", "yanığı", "boğuldu", "düştü", "şoku", "bilinci kapandı"
]

# -----------------------
# PDF yükleme ve analiz
# -----------------------
@app.route("/upload_pdf", methods=["POST"])
def upload_pdf():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token eksik"}), 401

    token = auth_header.split(" ")[1]
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = decoded["username"]
    except ExpiredSignatureError:
        return jsonify({"error": "Token süresi dolmuş"}), 401
    except InvalidTokenError:
        return jsonify({"error": "Geçersiz token"}), 401

    if 'pdf' not in request.files:
        return jsonify({"error": "PDF dosyası bulunamadı"}), 400

    pdf_file = request.files['pdf']
    doc = fitz.open(stream=pdf_file.read(), filetype="pdf")

    text = "".join([page.get_text() for page in doc])

    genel_ozet = "Genel değerlendirme yapılıyor..."

    # Regex ile test sonuçlarını yakala
    pattern = r"([A-Za-zçğıöşüÇĞİÖŞÜ ]+):\s*([\d.,]+)\s*(\w+/?.*)\s*\(Ref[:\-]?\s*([<>]?\d+[\-–]?\d*)\)?"
    matches = re.findall(pattern, text)
    referans_disi = []
    for test, value, unit, ref in matches:
        try:
            value_num = float(value.replace(",", "."))
            if "-" in ref:
                low, high = map(float, ref.split("-"))
                if value_num < low:
                    referans_disi.append(f"{test.strip()} düşük ({value_num} {unit}, ref: {ref})")
                elif value_num > high:
                    referans_disi.append(f"{test.strip()} yüksek ({value_num} {unit}, ref: {ref})")
            elif "<" in ref:
                limit = float(ref.replace("<", ""))
                if value_num >= limit:
                    referans_disi.append(f"{test.strip()} yüksek ({value_num} {unit}, ref: {ref})")
            elif ">" in ref:
                limit = float(ref.replace(">", ""))
                if value_num <= limit:
                    referans_disi.append(f"{test.strip()} düşük ({value_num} {unit}, ref: {ref})")
        except:
            continue

    # AI ile analiz
    prompt = f"""
Sen bir sağlık asistanısın. Kullanıcının tahlil raporunu inceledin.
Görevlerin:
1. Genel durumu 1-2 cümle ile özetle.
2. Referans dışı değerleri listele (eğer varsa).
3. Her referans dışı değer için kısa ve basit öneriler ver.
4. Referans dışı değer yoksa böyle devam etmesi için önerilerde bulun.
Rapor metni:
{text[:3000]}
"""
    try:
        response = requests.post(
            API_URL,
            headers={"Content-Type": "application/json", "X-goog-api-key": API_KEY},
            json={"contents": [{"parts": [{"text": prompt}]}]}
        )
        response.raise_for_status()
        ai_reply = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        ai_reply = "⚠️ AI analizi yapılamadı."
        print("PDF analiz hatası:", e)

    bot_reply = genel_ozet
    if referans_disi:
        bot_reply += "\n\n⚠️ Referans dışı değerler bulundu:\n- " + "\n- ".join(referans_disi)
    else:
        bot_reply += "\n✅ Önemli değerler referans aralıklarında."
    bot_reply += f"\n\nAI Önerisi:\n{ai_reply}"

    chat_history.setdefault(username, []).append({"sender": "user", "text": f"[PDF dosyası yüklendi] {pdf_file.filename}"})
    chat_history.setdefault(username, []).append({"sender": "bot", "text": f"[PDF Analizi]\n{bot_reply}"})

    return jsonify({"reply": bot_reply})

# -----------------------
# Register
# -----------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    firstname = data.get("firstname", "")
    lastname = data.get("lastname", "")
    role = data.get("role", "user")  # default user
    specialization = data.get("specialization") if role == "doctor" else None
    license_number = data.get("license_number") if role == "doctor" else None

    if not username or not password:
        return jsonify({"error": "Kullanıcı adı ve şifre boş olamaz"}), 400

    # Kullanıcı adı kontrolü
    cursor.execute("SELECT * FROM users WHERE username=%s", (username,))
    if cursor.fetchone():
        return jsonify({"error": "Kullanıcı zaten var"}), 400

    hashed_pw = generate_password_hash(password)

    if role == "doctor":
        cursor.execute(
            """
            INSERT INTO users (username, password_hash, firstname, lastname, role, specialization, license_number)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (username, hashed_pw, firstname, lastname, role, specialization, license_number)
        )
    else:
        cursor.execute(
            """
            INSERT INTO users (username, password_hash, firstname, lastname, role)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (username, hashed_pw, firstname, lastname, role)
        )

    conn.commit()

    chat_history[username] = []
    waiting_for_bot[username] = False

    return jsonify({"message": "Kayıt başarılı", "role": role})


# -----------------------
# Login
# -----------------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Kullanıcı adı ve şifre boş olamaz"}), 400

    # ✅ role bilgisini de çekiyoruz
    cursor.execute("SELECT password_hash, role FROM users WHERE username=%s", (username,))
    row = cursor.fetchone()
    if not row or not check_password_hash(row[0], password):
        return jsonify({"error": "Kullanıcı adı veya şifre hatalı"}), 401

    role = row[1]

    token = jwt.encode({
        "username": username,
        "role": role,  # ✅ token içine de role ekleyebilirsin (opsiyonel)
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }, JWT_SECRET, algorithm="HS256")

    chat_history.setdefault(username, [])
    waiting_for_bot[username] = False

    # ✅ role bilgisini de frontend'e gönderiyoruz
    return jsonify({"token": token, "role": role})


# -----------------------
# Profile GET/POST
# -----------------------
@app.route("/profile", methods=["GET", "POST"])
def profile():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token eksik"}), 401
    token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = decoded["username"]
    except ExpiredSignatureError:
        return jsonify({"error": "Token süresi dolmuş"}), 401
    except InvalidTokenError:
        return jsonify({"error": "Geçersiz token"}), 401

    if request.method == "GET":
        cursor.execute(
            "SELECT username, firstname, lastname, age, height, weight, chronic, avatar FROM users WHERE username=%s",
            (username,)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"error": "Kullanıcı bulunamadı"}), 404

        avatar_filename = row[7]
        avatar_url = f"http://127.0.0.1:5000/uploads/{avatar_filename}" if avatar_filename else ""

        return jsonify({
            "username": row[0],
            "firstname": row[1] or "",
            "lastname": row[2] or "",
            "age": row[3] or "",
            "height": row[4] or "",
            "weight": row[5] or "",
            "chronic_diseases": row[6] or "",
            "avatar": avatar_url
        })

    # POST: profil güncelleme
    data = request.json
    cursor.execute(
        """
        UPDATE users
        SET firstname = COALESCE(%s, firstname),
            lastname = COALESCE(%s, lastname),
            age = COALESCE(%s, age),
            height = COALESCE(%s, height),
            weight = COALESCE(%s, weight),
            chronic = COALESCE(%s, chronic)
        WHERE username=%s
        """,
        (data.get("firstname"), data.get("lastname"), data.get("age"),
         data.get("height"), data.get("weight"), data.get("chronic_diseases"), username)
    )
    conn.commit()
    return jsonify({"message": "Profil güncellendi"})

# -----------------------
# Avatar yükleme
# -----------------------
@app.route("/profile/avatar", methods=["POST"])
def upload_avatar():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token eksik"}), 401
    token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = decoded["username"]
    except:
        return jsonify({"error": "Geçersiz token"}), 401

    if "avatar" not in request.files:
        return jsonify({"error": "Dosya yok"}), 400

    file = request.files["avatar"]
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)

    cursor.execute("UPDATE users SET avatar = %s WHERE username = %s", (filename, username))
    conn.commit()

    return jsonify({"avatar": f"http://127.0.0.1:5000/uploads/{filename}"}), 200

# -----------------------
# Upload klasöründen dosya serve
# -----------------------
@app.route("/uploads/<filename>")
def serve_uploads(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# -----------------------
# Chat endpoint (CORS uyumlu)
# -----------------------
@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    # OPTIONS isteği ise sadece CORS header dön
    if request.method == "OPTIONS":
        response = app.make_response("")
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response, 200

    # -----------------------
    # Normal POST (mesaj) işlemleri
    # -----------------------
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token eksik"}), 401

    token = auth_header.split(" ")[1]
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = decoded["username"]
    except ExpiredSignatureError:
        return jsonify({"error": "Token süresi dolmuş"}), 401
    except InvalidTokenError:
        return jsonify({"error": "Geçersiz token"}), 401

    if waiting_for_bot.get(username, False):
        return jsonify({"error": "Bot cevabı gelmeden yeni mesaj gönderemezsiniz"}), 400

    data = request.json
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "Mesaj boş olamaz"}), 400

    chat_history.setdefault(username, []).append({"sender": "user", "text": user_message})
    waiting_for_bot[username] = True    

    # Profil bilgileri ve ekstra info
    cursor.execute("SELECT age, height, weight, chronic FROM users WHERE username=%s", (username,))
    row = cursor.fetchone()
    profile_info = {"age": row[0], "height": row[1], "weight": row[2], "chronic": row[3]} if row else {}
    extra_info = ""
    if profile_info.get("height") and profile_info.get("weight"):
        try:
            height_m = float(profile_info["height"]) / 100
            bmi = float(profile_info["weight"]) / (height_m ** 2)
            if bmi >= 32.5:
                extra_info += "Kullanıcının obezite durumu var. "    
            elif bmi >= 25:
                extra_info += "Kullanıcı fazla kilolu. "
            elif bmi < 18.5:
                extra_info += "Kullanıcı zayıf. "
        except:
            pass
    if profile_info.get("chronic"):
        extra_info += f"Kullanıcının kronik hastalıkları: {profile_info['chronic']}. "
    if profile_info.get("age"):
        extra_info += f"Kullanıcının yaşı: {profile_info['age']}. "    

    is_danger = any(word in user_message.lower() for word in danger_words)
    bot_reply = ""
    if is_danger:
        bot_reply += "⚠️ Bu ciddi bir durum olabilir. Lütfen 112'yi arayın veya en yakın acile gidin.\n\n"

    history_text = "".join([f"{m['sender'].capitalize()}: {m['text']}\n" for m in chat_history.get(username, [])[-10:]])

    prompt = f"""
Sen bir genel sağlık asistanısın. Kullanıcıya güvenli ve evde uygulanabilir tavsiyeler ver.
Sadece beslenme, yaşam tarzı ve basit çözümler öner. İlaç önerme.
Cevap verirken nazik, anlaşılır ve destekleyici ol. Gerektiğinde örnekler ver.
Cevaplarını **okunabilir şekilde başlık ve maddeler kullanarak ver**, uzun tek paragraflar oluşturma. 
Her adımı numaralandır veya maddele, gerekli yerlerde yeni satıra başlat.

Konuşma geçmişi:
{history_text if history_text else 'Yok.'}

Kullanıcı profili: {extra_info if extra_info else "Özel bilgi yok."}
Kullanıcının mesajı: {user_message}

Yanıtın kısa ve öz (2-3 cümle) olmalı.
Cevap Sonunda, cevabı destekliyecek ekstra bir öneride bulunmak için sor ve kullanıcı onaylarsa yap.
Cevaplarını gerekli yerlerde madde madde yap.
Cevaplarını gerekli yerlerde yeni satıra başlat.
Gerektiğinde kullanıcıya motivasyon verici ve pozitif ifadeler kullan.
Her cevabın sonunda, kullanıcının kendine dikkat etmesi için basit bir hatırlatma ekle (örn. "Bol su içmeyi unutmayın.").
"""

    try:
        response = requests.post(
            API_URL,
            headers={"Content-Type": "application/json", "X-goog-api-key": API_KEY},
            json={"contents": [{"parts": [{"text": prompt}]}]}
        )
        response.raise_for_status()
        normal_reply = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        normal_reply = "⚠️ Bot cevabı alınamadı."
        print("API Hatası:", e)

    bot_reply += normal_reply
    chat_history.setdefault(username, []).append({"sender": "bot", "text": bot_reply})
    waiting_for_bot[username] = False

    return jsonify({"reply": bot_reply})

# -----------------------
# Appointments GET/POST/DELETE
# -----------------------
@app.route("/appointments", methods=["GET", "POST"])
def appointments():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token eksik"}), 401
    token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = decoded["username"]
    except:
        return jsonify({"error": "Geçersiz token"}), 401

    if request.method == "GET":
        cursor.execute("SELECT id, title, datetime FROM appointments WHERE username=%s ORDER BY datetime", (username,))
        rows = cursor.fetchall()
        return jsonify([{"id": r[0], "title": r[1], "datetime": r[2].isoformat()} for r in rows])

    data = request.json
    title = data.get("title", "").strip()
    dt_str = data.get("datetime", "").strip()
    if not title or not dt_str:
        return jsonify({"error": "Başlık ve tarih gereklidir"}), 400
    try:
        dt = datetime.datetime.fromisoformat(dt_str)
    except ValueError:
        return jsonify({"error": "Geçersiz tarih formatı"}), 400

    cursor.execute(
        "INSERT INTO appointments (username, title, datetime) VALUES (%s, %s, %s) RETURNING id",
        (username, title, dt)
    )
    appointment_id = cursor.fetchone()[0]
    conn.commit()

    return jsonify({"id": appointment_id, "title": title, "datetime": dt.isoformat(), "message": "Randevu eklendi"})

@app.route("/appointments/<int:appt_id>", methods=["DELETE"])
def delete_appointment(appt_id):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token eksik"}), 401
    token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = decoded["username"]
    except:
        return jsonify({"error": "Geçersiz token"}), 401

    cursor.execute("DELETE FROM appointments WHERE id=%s AND username=%s RETURNING id", (appt_id, username))
    deleted = cursor.fetchone()
    conn.commit()

    if deleted:
        return jsonify({"message": "Randevu silindi"})
    else:
        return jsonify({"error": "Randevu bulunamadı"}), 404

# -----------------------
# Chat history
# -----------------------
@app.route("/history", methods=["GET"])
def history():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token eksik"}), 401
    token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = decoded["username"]
    except ExpiredSignatureError:
        return jsonify({"error": "Token süresi dolmuş"}), 401
    except InvalidTokenError:
        return jsonify({"error": "Geçersiz token"}), 401

    return jsonify(chat_history.get(username, []))

# -----------------------
# Doktora soru sorma (kullanıcı yeni soru)
# -----------------------
# Kullanıcı soru gönderimi
@app.route("/doctor-question", methods=["POST"])
def doctor_question():
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token gerekli"}), 401

    token = auth_header.split(" ")[1]
    try:
        data_token = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = data_token.get("username")
        if not username:
            return jsonify({"error": "Geçersiz token"}), 401
    except Exception as e:
        print("JWT Hatası:", e)
        return jsonify({"error": "Geçersiz token"}), 401

    # Kullanıcı id'sini al
    cursor.execute("SELECT id FROM users WHERE username=%s", (username,))
    row = cursor.fetchone()
    if not row:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    user_id = row[0]

    data = request.json
    subject = data.get("subject")
    message = data.get("message")

    if not subject or not message:
        return jsonify({"error": "Başlık ve mesaj boş olamaz"}), 400

    cursor.execute(
        """
        INSERT INTO doctor_questions (user_id, subject, message, status, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        """,
        (user_id, subject, message, "pending")
    )
    conn.commit()

    return jsonify({"message": "Soru başarıyla gönderildi"})



# Doktor cevabı veya kullanıcı tekrar cevabı
@app.route("/doctor-question/<int:question_id>/reply", methods=["POST"])
def reply_doctor_question(question_id):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return jsonify({"error": "Token gerekli"}), 401

    token = auth_header.split(" ")[1]
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        role = decoded.get("role")   # 👈 doktor mu kullanıcı mı?
    except Exception as e:
        print("JWT Hatası:", e)
        return jsonify({"error": "Geçersiz token"}), 401

    data = request.json
    reply = data.get("reply")

    if not reply:
        return jsonify({"error": "Cevap boş olamaz"}), 400

    if role == "doctor":
        cursor.execute(
            "UPDATE doctor_questions SET doctor_reply=%s, status='answered' WHERE id=%s",
            (reply, question_id)
        )
    else:  # user tekrar cevaplıyor
        cursor.execute(
            "UPDATE doctor_questions SET user_reply=%s, status='pending' WHERE id=%s",
            (reply, question_id)
        )


    conn.commit()
    return jsonify({"message": "Cevap kaydedildi"})






# -----------------------
# Doktor paneli - tüm soruları listele
# -----------------------
# Tüm soruları çek
@app.route("/doctor-questions", methods=["GET"])
def get_doctor_questions():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token gerekli"}), 401

    token = auth_header.split(" ")[1]
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        role = decoded.get("role")
    except Exception:
        return jsonify({"error": "Geçersiz token"}), 401

    if role != "doctor":
        return jsonify({"error": "Yetkisiz erişim"}), 403

    cursor.execute(
        """
        SELECT dq.id, u.firstname, u.lastname, dq.subject, dq.message, dq.doctor_reply, dq.user_reply, dq.status, dq.created_at
        FROM doctor_questions dq
        JOIN users u ON dq.user_id = u.id
        ORDER BY dq.created_at DESC
        """
    )
    questions = cursor.fetchall()
    result = []
    for q in questions:
        result.append({
            "id": q[0],
            "user_name": f"{q[1]} {q[2]}",
            "subject": q[3],
            "message": q[4],
            "doctor_reply": q[5],
            "user_reply": q[6],
            "status": q[7],
            "created_at": q[8].strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(result)



@app.route("/my-questions", methods=["GET"])
def get_my_questions():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Token gerekli"}), 401

    token = auth_header.split(" ")[1]
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        username = decoded.get("username")
    except Exception:
        return jsonify({"error": "Geçersiz token"}), 401

    # user_id bul
    cursor.execute("SELECT id FROM users WHERE username=%s", (username,))
    row = cursor.fetchone()
    if not row:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404
    user_id = row[0]

    # sadece kendi sorularını getir
    cursor.execute(
        """
        SELECT id, subject, message, doctor_reply, user_reply, status, created_at
        FROM doctor_questions
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (user_id,)
    )
    questions = cursor.fetchall()
    result = []
    for q in questions:
        result.append({
            "id": q[0],
            "subject": q[1],
            "message": q[2],
            "doctor_reply": q[3],
            "user_reply": q[4],
            "status": q[5],
            "created_at": q[6].strftime("%Y-%m-%d %H:%M:%S")
        })
    return jsonify(result)





# -----------------------
# Flask app çalıştır
# -----------------------
if __name__ == "__main__":
    app.run(debug=True, port=5000)
