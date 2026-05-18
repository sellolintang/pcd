# 🖼️ Editor Berkelas API (FastAPI + OpenCV)

Backend sederhana untuk eksperimen **Pengolahan Citra Digital (PCD)** menggunakan **FastAPI** dan **OpenCV**.  
Project ini masih tahap awal dan digunakan untuk **testing API Python** dalam memproses gambar yang dikirim dari frontend.

## 🚀 Fitur Saat Ini

API dapat menerima gambar lalu melakukan beberapa operasi pengolahan citra dasar:

- ✅ **Grayscale** → Mengubah gambar menjadi abu-abu
- ✅ **Blur** → Gaussian Blur
- ✅ **Canny Edge Detection** → Deteksi tepi gambar
- ✅ **Invert Color** → Membalik warna gambar (*negative image*)
- ✅ **Brightness Adjustment** → Menambah kecerahan gambar

---

## 🛠️ Tech Stack

- **Python**
- **FastAPI**
- **OpenCV (cv2)**
- **NumPy**
- **Uvicorn**

---

## 📂 Struktur Project

```bash
project-folder/
│── main.py
│── requirements.txt
│── README.md
```

### Keterangan File

| File | Fungsi |
|-------|---------|
| `main.py` | Main backend FastAPI |
| `requirements.txt` | Dependency Python project |
| `README.md` | Dokumentasi project |

---

## ⚙️ Instalasi

### 1. Clone Repository

```bash
git clone https://github.com/username/repository-name.git
cd repository-name
```

### 2. (Opsional) Buat Virtual Environment

#### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

#### Mac/Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

---

### 3. Install Dependencies

Karena project ini menggunakan `requirements.txt`, cukup jalankan:

```bash
pip install -r requirements.txt
```

---

## ▶️ Menjalankan Server

Jalankan backend dengan command berikut:

```bash
python main.py
```

Atau menggunakan Uvicorn secara manual:

```bash
uvicorn main:app --reload
```

Server akan berjalan di:

```txt
http://127.0.0.1:8000
```

---

# 📖 API Documentation

FastAPI menyediakan dokumentasi otomatis.

### Swagger UI

Buka di browser:

```txt
http://127.0.0.1:8000/docs
```

### ReDoc

```txt
http://127.0.0.1:8000/redoc
```

Di sana kamu bisa langsung mencoba endpoint API tanpa Postman.

---

# 🔌 API Endpoints

## 1. Health Check

Digunakan untuk memastikan backend berjalan dengan baik.

### Request

**Method:** `GET`

```http
GET /api/health
```

### Full URL

```txt
http://127.0.0.1:8000/api/health
```

### Response

```json
{
  "status": "Backend PCD berjalan lancar!"
}
```

---

## 2. Process Image

Digunakan untuk memproses gambar berdasarkan operasi tertentu.

### Request

**Method:** `POST`

```http
POST /api/process
```

### Full URL

```txt
http://127.0.0.1:8000/api/process
```

### Body (Form Data)

| Key | Type | Value |
|------|------|--------|
| `file` | File | Upload gambar |
| `operation` | Text | Jenis operasi |

### Operation yang Didukung

| Operation | Deskripsi |
|------------|------------|
| `grayscale` | Mengubah gambar menjadi grayscale |
| `blur` | Gaussian blur |
| `canny` | Edge detection menggunakan Canny |
| `invert` | Membalik warna gambar |
| `brightness` | Menambah brightness gambar |

---

# 📬 Cara Menggunakan API di Postman

## 1. Jalankan Backend

Pastikan backend sudah berjalan:

```bash
python main.py
```

Jika berhasil, akan muncul output seperti:

```txt
Uvicorn running on http://127.0.0.1:8000
```

---

## 2. Test Endpoint Health Check

Buka **Postman** lalu:

### Method

```txt
GET
```

### URL

```txt
http://127.0.0.1:8000/api/health
```

Klik **Send**

### Expected Response

```json
{
  "status": "Backend PCD berjalan lancar!"
}
```

Jika response muncul, berarti backend berhasil berjalan.

---

## 3. Test Endpoint Process Image

### Step 1 — Buat Request Baru

Pilih method:

```txt
POST
```

### URL

```txt
http://127.0.0.1:8000/api/process
```

---

### Step 2 — Buka Tab Body

Pilih:

```txt
Body → form-data
```

Tambahkan data berikut:

| Key | Type | Value |
|------|------|--------|
| `file` | File | Upload gambar |
| `operation` | Text | `grayscale` |

Contoh:

| Key | Type | Value |
|------|------|--------|
| `file` | File | cat.jpg |
| `operation` | Text | blur |

---

### Step 3 — Klik Send

Postman akan mengirim gambar ke backend.

Karena API mengembalikan:

```txt
image/jpeg
```

maka response berupa **gambar hasil pemrosesan**.

Klik:

```txt
Save Response
```

untuk menyimpan hasil gambar.

---

## 📌 Contoh Testing Operation

### Grayscale

```txt
operation = grayscale
```

### Blur

```txt
operation = blur
```

### Edge Detection

```txt
operation = canny
```

### Invert Color

```txt
operation = invert
```

### Brightness

```txt
operation = brightness
```

---

## 🧠 Cara Kerja Backend

Alur kerja API:

1. User mengupload gambar
2. Backend membaca file sebagai **byte**
3. Byte dikonversi menjadi **NumPy Array**
4. OpenCV melakukan pengolahan citra sesuai operation
5. Hasil di-encode kembali ke format **JPEG**
6. Backend mengirim hasil gambar menggunakan `StreamingResponse`

---

## 📈 Roadmap Pengembangan

Fitur yang direncanakan untuk versi selanjutnya:

- [ ] Crop Image
- [ ] Rotate Image
- [ ] Resize Image
- [ ] Sharpening
- [ ] Thresholding
- [ ] Histogram Equalization
- [ ] Brightness & Contrast Adjustable
- [ ] Multiple File Upload
- [ ] Undo / Redo
- [ ] Layer System
- [ ] Frontend Integration (React/Vite)
- [ ] Filter seperti Photoshop sederhana

---

## ⚠️ Disclaimer

Project ini masih berupa **prototype/testing backend API** untuk eksplorasi **FastAPI + OpenCV** dalam konteks pembelajaran **Pengolahan Citra Digital (PCD)** dan belum ditujukan untuk production.

---

## 👨‍💻 Author

Developed for learning and experimentation with **Python Image Processing API**.