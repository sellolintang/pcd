from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import cv2
import numpy as np
import io

app = FastAPI(title="Editor Berkelas API")

# Konfigurasi CORS (walaupun sudah di-proxy oleh Vite, ini tetap praktik yang baik)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Saat produksi ganti dengan domain frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "Backend PCD berjalan lancar!"}

@app.post("/api/process")
async def process_image(
    file: UploadFile = File(...), 
    operation: str = Form(...)
):
    # 1. Baca byte gambar yang diupload
    contents = await file.read()
    
    # 2. Konversi byte array ke bentuk Numpy Array lalu di-decode oleh OpenCV
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Inisialisasi variabel untuk gambar hasil proses
    processed_img = img

    # 3. Lakukan operasi Pengolahan Citra berdasarkan parameter 'operation'
    if operation == "grayscale":
        processed_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
    elif operation == "blur":
        # Gaussian Blur
        processed_img = cv2.GaussianBlur(img, (15, 15), 0)
        
    elif operation == "canny":
        # Edge Detection menggunakan Canny
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        processed_img = cv2.Canny(gray, 100, 200)
        
    elif operation == "invert":
        # Operasi inversi warna (Negative Image)
        processed_img = cv2.bitwise_not(img)
        
    elif operation == "brightness":
        # Contoh menambah brightness
        value = 50
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        v = cv2.add(v, value)
        v[v > 255] = 255
        v[v < 0] = 0
        final_hsv = cv2.merge((h, s, v))
        processed_img = cv2.cvtColor(final_hsv, cv2.HSV2BGR)

    # 4. Encode kembali matriks gambar menjadi format JPEG
    is_success, encoded_img = cv2.imencode(".jpg", processed_img)
    
    # 5. Kembalikan gambar sebagai StreamingResponse ke frontend
    return StreamingResponse(
        io.BytesIO(encoded_img.tobytes()), 
        media_type="image/jpeg"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)