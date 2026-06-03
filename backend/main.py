from fastapi import FastAPI, File, UploadFile, Form, HTTPException
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

def make_odd_kernel(value):
    value = int(value)

    if value < 1:
        value = 1

    if value % 2 == 0:
        value += 1

    return value


def adjust_brightness_contrast(img, brightness=0, contrast=0):
    brightness = int(brightness)
    contrast = int(contrast)

    alpha = 1.0 + (contrast / 100.0)
    beta = brightness

    if alpha < 0:
        alpha = 0

    result = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)
    return result


def histogram_equalization(img):
    if len(img.shape) == 2:
        return cv2.equalizeHist(img)

    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    y, cr, cb = cv2.split(ycrcb)

    y_equalized = cv2.equalizeHist(y)

    merged = cv2.merge((y_equalized, cr, cb))
    result = cv2.cvtColor(merged, cv2.COLOR_YCrCb2BGR)

    return result


def sharpen_image(img, strength=1.0):
    strength = float(strength)

    if strength < 0:
        strength = 0

    kernel = np.array([
        [0, -strength, 0],
        [-strength, 1 + (4 * strength), -strength],
        [0, -strength, 0]
    ], dtype=np.float32)

    result = cv2.filter2D(img, -1, kernel)
    return result


def smoothing_blur(img, kernel_size=15):
    kernel_size = make_odd_kernel(kernel_size)

    result = cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)
    return result

def get_interpolation(interpolation: str):
    if interpolation == "nearest":
        return cv2.INTER_NEAREST
    return cv2.INTER_LINEAR


def rotate_image(img, angle, interpolation_code):
    h, w = img.shape[:2]
    center = (w / 2, h / 2)

    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)

    cos = abs(matrix[0, 0])
    sin = abs(matrix[0, 1])

    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))

    matrix[0, 2] += (new_w / 2) - center[0]
    matrix[1, 2] += (new_h / 2) - center[1]

    return cv2.warpAffine(
        img,
        matrix,
        (new_w, new_h),
        flags=interpolation_code,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0)
    )


def translate_image(img, dx, dy, interpolation_code):
    h, w = img.shape[:2]

    matrix = np.float32([
        [1, 0, dx],
        [0, 1, dy]
    ])

    return cv2.warpAffine(
        img,
        matrix,
        (w, h),
        flags=interpolation_code,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0)
    )


def resize_image(img, width, height, scale, interpolation_code):
    h, w = img.shape[:2]

    if width > 0 and height > 0:
        new_size = (width, height)
    else:
        new_w = int(w * scale)
        new_h = int(h * scale)
        new_size = (new_w, new_h)

    return cv2.resize(img, new_size, interpolation=interpolation_code)


def crop_image(img, crop_x, crop_y, crop_w, crop_h):
    h, w = img.shape[:2]

    x1 = max(0, crop_x)
    y1 = max(0, crop_y)
    x2 = min(w, crop_x + crop_w)
    y2 = min(h, crop_y + crop_h)

    if x2 <= x1 or y2 <= y1:
        return img

    return img[y1:y2, x1:x2]

@app.post("/api/process")
async def process_image(
    file: UploadFile = File(...),
    operation: str = Form(...),
    
    brightness_value: int = Form(0),
    contrast_value: int = Form(0),
    blur_kernel: int = Form(15),
    sharpen_strength: float = Form(1.0),

    angle: float = Form(0),
    dx: int = Form(0),
    dy: int = Form(0),
    width: int = Form(0),
    height: int = Form(0),
    scale: float = Form(1.0),
    crop_x: int = Form(0),
    crop_y: int = Form(0),
    crop_w: int = Form(100),
    crop_h: int = Form(100),
    interpolation: str = Form("bilinear")
):
    # 1. Baca byte gambar yang diupload
    contents = await file.read()
    
    # 2. Konversi byte array ke bentuk Numpy Array lalu di-decode oleh OpenCV
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Inisialisasi variabel untuk gambar hasil proses
    processed_img = img
    
    interpolation_code = get_interpolation(interpolation)

    # 3. Lakukan operasi Pengolahan Citra berdasarkan parameter 'operation'
    if operation == "grayscale":
        processed_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
    elif operation == "blur":
        # Gaussian Blur
        processed_img = smoothing_blur(img, blur_kernel)
        
    elif operation == "canny":
        # Edge Detection menggunakan Canny
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        processed_img = cv2.Canny(gray, 100, 200)
        
    elif operation == "invert":
        # Operasi inversi warna (Negative Image)
        processed_img = cv2.bitwise_not(img)
        
    elif operation == "brightness":
        processed_img = adjust_brightness_contrast(
        img,
        brightness=brightness_value,
        contrast=0
    )

    elif operation == "contrast":
        processed_img = adjust_brightness_contrast(
            img,
            brightness=0,
            contrast=contrast_value
        )

    elif operation == "brightness_contrast":
        processed_img = adjust_brightness_contrast(
            img,
            brightness=brightness_value,
            contrast=contrast_value
        )

    elif operation == "histogram_equalization":
        processed_img = histogram_equalization(img)

    elif operation == "sharpen":
        processed_img = sharpen_image(img, sharpen_strength)
    
    elif operation == "rotate":
        processed_img = rotate_image(img, angle, interpolation_code)

    elif operation == "flip_horizontal":
        processed_img = cv2.flip(img, 1)

    elif operation == "flip_vertical":
        processed_img = cv2.flip(img, 0)

    elif operation == "resize":
        processed_img = resize_image(img, width, height, scale, interpolation_code)

    elif operation == "translate":
        processed_img = translate_image(img, dx, dy, interpolation_code)

    elif operation == "crop":
        processed_img = crop_image(img, crop_x, crop_y, crop_w, crop_h)

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