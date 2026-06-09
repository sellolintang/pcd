import cv2
import numpy as np
import io
import math
import heapq
import matplotlib
import matplotlib.pyplot as plt

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from collections import Counter

matplotlib.use("Agg")

app = FastAPI(title="Editor Berkelas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_cnn_model = None


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


def read_image_from_upload_bytes(contents: bytes):
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="File gambar tidak valid.")
    return img


def encode_image(img, quality=95, output_format="jpg"):
    quality = int(np.clip(int(quality), 1, 100))
    output_format = (output_format or "jpg").lower().replace(".", "")

    if output_format == "jpeg":
        output_format = "jpg"

    if output_format == "jpg":
        ext = ".jpg"
        media_type = "image/jpeg"
        params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]

    elif output_format == "png":
        ext = ".png"
        media_type = "image/png"
        params = [int(cv2.IMWRITE_PNG_COMPRESSION), 3]

    elif output_format == "bmp":
        ext = ".bmp"
        media_type = "image/bmp"
        params = []

    else:
        raise HTTPException(
            status_code=400,
            detail="Format output tidak didukung. Gunakan jpg, png, atau bmp."
        )

    is_success, encoded_img = cv2.imencode(ext, img, params)

    if not is_success:
        raise HTTPException(status_code=500, detail="Gagal melakukan encoding gambar.")

    return StreamingResponse(
        io.BytesIO(encoded_img.tobytes()),
        media_type=media_type
    )


def to_gray(img):
    if len(img.shape) == 2:
        return img
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


# =========================================================
# A. IMAGE ENHANCEMENT
# =========================================================
def adjust_brightness_contrast(img, brightness=0, contrast=0):
    brightness = int(brightness)
    contrast = int(contrast)
    alpha = 1.0 + (contrast / 100.0)
    beta = brightness
    if alpha < 0:
        alpha = 0
    return cv2.convertScaleAbs(img, alpha=alpha, beta=beta)


def histogram_equalization(img):
    if len(img.shape) == 2:
        return cv2.equalizeHist(img)

    ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
    y, cr, cb = cv2.split(ycrcb)
    y_equalized = cv2.equalizeHist(y)
    merged = cv2.merge((y_equalized, cr, cb))
    return cv2.cvtColor(merged, cv2.COLOR_YCrCb2BGR)


def sharpen_image(img, strength=1.0):
    strength = max(float(strength), 0)
    kernel = np.array([
        [0, -strength, 0],
        [-strength, 1 + (4 * strength), -strength],
        [0, -strength, 0]
    ], dtype=np.float32)
    return cv2.filter2D(img, -1, kernel)


def smoothing_blur(img, kernel_size=15):
    kernel_size = make_odd_kernel(kernel_size)
    return cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)


# =========================================================
# B. GEOMETRIC TRANSFORMATION
# =========================================================
def get_interpolation(interpolation: str):
    if interpolation == "nearest":
        return cv2.INTER_NEAREST
    return cv2.INTER_LINEAR


def rotate_image(img, angle, interpolation_code):
    h, w = img.shape[:2]
    center = (w / 2, h / 2)
    matrix = cv2.getRotationMatrix2D(center, float(angle), 1.0)

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
        [1, 0, int(dx)],
        [0, 1, int(dy)]
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
    width = int(width)
    height = int(height)
    scale = float(scale)

    if width > 0 and height > 0:
        new_size = (width, height)
    else:
        new_w = int(w * scale)
        new_h = int(h * scale)
        new_size = (new_w, new_h)

    if new_size[0] <= 0 or new_size[1] <= 0:
        raise HTTPException(status_code=400, detail="Ukuran resize tidak valid.")

    return cv2.resize(img, new_size, interpolation=interpolation_code)


def crop_image(img, crop_x, crop_y, crop_w, crop_h):
    h, w = img.shape[:2]
    x1 = max(0, int(crop_x))
    y1 = max(0, int(crop_y))
    x2 = min(w, int(crop_x) + int(crop_w))
    y2 = min(h, int(crop_y) + int(crop_h))

    if x2 <= x1 or y2 <= y1:
        return img

    return img[y1:y2, x1:x2]


# =========================================================
# C. IMAGE RESTORATION / NOISE REDUCTION
# =========================================================
def median_filter_image(img, kernel_size=5):
    kernel_size = make_odd_kernel(kernel_size)
    if kernel_size < 3:
        kernel_size = 3
    return cv2.medianBlur(img, kernel_size)


def salt_pepper_noise_removal(img, kernel_size=5):
    kernel_size = make_odd_kernel(kernel_size)
    if kernel_size < 3:
        kernel_size = 3
    return cv2.medianBlur(img, kernel_size)


# =========================================================
# D. BINARY & EDGE PROCESSING
# =========================================================
def threshold_image(img, threshold_value=127):
    gray = to_gray(img)
    threshold_value = int(np.clip(int(threshold_value), 0, 255))
    _, result = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
    return result


def canny_edge(img, canny_low=100, canny_high=200):
    gray = to_gray(img)
    canny_low = int(canny_low)
    canny_high = int(canny_high)
    return cv2.Canny(gray, canny_low, canny_high)


def sobel_edge(img):
    gray = to_gray(img)
    grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = cv2.magnitude(grad_x, grad_y)
    return cv2.convertScaleAbs(magnitude)


def prewitt_edge(img):
    gray = to_gray(img)
    kernel_x = np.array([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], dtype=np.float32)
    kernel_y = np.array([[1, 1, 1], [0, 0, 0], [-1, -1, -1]], dtype=np.float32)
    grad_x = cv2.filter2D(gray, cv2.CV_32F, kernel_x)
    grad_y = cv2.filter2D(gray, cv2.CV_32F, kernel_y)
    magnitude = cv2.magnitude(grad_x, grad_y)
    return cv2.convertScaleAbs(magnitude)


def robert_edge(img):
    gray = to_gray(img)
    kernel_x = np.array([[1, 0], [0, -1]], dtype=np.float32)
    kernel_y = np.array([[0, 1], [-1, 0]], dtype=np.float32)
    grad_x = cv2.filter2D(gray, cv2.CV_32F, kernel_x)
    grad_y = cv2.filter2D(gray, cv2.CV_32F, kernel_y)
    magnitude = cv2.magnitude(grad_x, grad_y)
    return cv2.convertScaleAbs(magnitude)


def laplacian_edge(img):
    gray = to_gray(img)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return cv2.convertScaleAbs(lap)


def log_edge(img, kernel_size=5):
    gray = to_gray(img)
    kernel_size = make_odd_kernel(kernel_size)
    blurred = cv2.GaussianBlur(gray, (kernel_size, kernel_size), 0)
    lap = cv2.Laplacian(blurred, cv2.CV_64F)
    return cv2.convertScaleAbs(lap)


def morphology_operation(img, operation="erosion", kernel_size=3, iterations=1):
    binary = threshold_image(img, 127)
    kernel_size = make_odd_kernel(kernel_size)
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    iterations = max(1, int(iterations))

    if operation == "dilation":
        return cv2.dilate(binary, kernel, iterations=iterations)
    return cv2.erode(binary, kernel, iterations=iterations)


# =========================================================
# E. COLOR PROCESSING
# =========================================================
def split_rgb_channel(img, channel="r"):
    result = np.zeros_like(img)
    channel = channel.lower()

    if channel == "b":
        result[:, :, 0] = img[:, :, 0]
    elif channel == "g":
        result[:, :, 1] = img[:, :, 1]
    else:
        result[:, :, 2] = img[:, :, 2]

    return result


def adjust_hue_saturation(img, hue_value=0, saturation_value=0):
    hue_value = int(hue_value)
    saturation_value = int(saturation_value)

    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    h = ((h.astype(np.int16) + hue_value) % 180).astype(np.uint8)
    s = np.clip(s.astype(np.int16) + saturation_value, 0, 255).astype(np.uint8)

    adjusted = cv2.merge((h, s, v))
    return cv2.cvtColor(adjusted, cv2.COLOR_HSV2BGR)


# =========================================================
# F. IMAGE SEGMENTATION
# =========================================================
def threshold_segmentation(img, threshold_value=127):
    gray = to_gray(img)
    threshold_value = int(np.clip(int(threshold_value), 0, 255))
    _, mask = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
    return cv2.bitwise_and(img, img, mask=mask)


def edge_based_segmentation(img, canny_low=100, canny_high=200):
    edges = canny_edge(img, canny_low, canny_high)
    return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)


def region_based_segmentation(img, k=3):
    k = int(np.clip(int(k), 2, 8))
    pixel_values = img.reshape((-1, 3))
    pixel_values = np.float32(pixel_values)

    criteria = (
        cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER,
        50,
        0.2
    )
    _, labels, centers = cv2.kmeans(
        pixel_values,
        k,
        None,
        criteria,
        5,
        cv2.KMEANS_RANDOM_CENTERS
    )

    centers = np.uint8(centers)
    segmented = centers[labels.flatten()]
    return segmented.reshape(img.shape)


# =========================================================
# G. IMAGE COMPRESSION
# =========================================================
def estimate_huffman_bits(data):
    counts = Counter(data.tolist())

    if len(counts) == 0:
        return 0

    if len(counts) == 1:
        return len(data)

    heap = list(counts.values())
    heapq.heapify(heap)

    total_bits = 0

    while len(heap) > 1:
        first = heapq.heappop(heap)
        second = heapq.heappop(heap)
        merged = first + second
        total_bits += merged
        heapq.heappush(heap, merged)

    return total_bits


def estimate_arithmetic_bits(data):
    counts = Counter(data.tolist())
    total = len(data)

    if total == 0:
        return 0

    entropy = 0.0

    for count in counts.values():
        probability = count / total
        entropy -= probability * math.log2(probability)

    return int(math.ceil(entropy * total)) + 32


def estimate_lzw_bits(data):
    values = data.tolist()

    if len(values) == 0:
        return 0

    dictionary = {(i,): i for i in range(256)}
    next_code = 256
    max_dictionary_size = 4096

    current = ()
    code_count = 0

    for value in values:
        value = int(value)
        combined = current + (value,)

        if combined in dictionary:
            current = combined
        else:
            code_count += 1

            if next_code < max_dictionary_size:
                dictionary[combined] = next_code
                next_code += 1

            current = (value,)

    if current:
        code_count += 1

    return code_count * 12


def compression_report_canvas(img, method="huffman"):
    gray = to_gray(img)
    data = gray.flatten()

    original_bits = len(data) * 8

    if method == "huffman":
        compressed_bits = estimate_huffman_bits(data)
        title = "Huffman Compression Simulation"
    elif method == "arithmetic":
        compressed_bits = estimate_arithmetic_bits(data)
        title = "Arithmetic Compression Simulation"
    elif method == "lzw":
        compressed_bits = estimate_lzw_bits(data)
        title = "LZW Compression Simulation"
    else:
        compressed_bits = original_bits
        title = "Compression Simulation"

    compressed_bits = max(1, compressed_bits)
    compression_ratio = original_bits / compressed_bits
    saving_percent = (1 - (compressed_bits / original_bits)) * 100 if original_bits > 0 else 0

    canvas = np.full((420, 760, 3), 255, dtype=np.uint8)

    lines = [
        title,
        f"Original size     : {original_bits:,} bits",
        f"Compressed size   : {compressed_bits:,} bits",
        f"Compression ratio : {compression_ratio:.2f} : 1",
        f"Saving estimate   : {saving_percent:.2f}%",
        "",
        "Note:",
        "This output is a visual simulation based on grayscale pixel data.",
        "The method estimates compression efficiency for learning purposes."
    ]

    y = 55
    for index, line in enumerate(lines):
        font_scale = 0.85 if index == 0 else 0.62
        thickness = 2 if index == 0 else 1
        cv2.putText(
            canvas,
            line,
            (35, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (20, 20, 20),
            thickness,
            cv2.LINE_AA
        )
        y += 42

    return canvas

def quantization_compression(img, quantization_level=32):
    quantization_level = int(np.clip(int(quantization_level), 2, 128))
    step = max(1, 256 // quantization_level)
    result = (img // step) * step
    return result.astype(np.uint8)


def rle_visual_simulation(img):
    gray = to_gray(img)
    result = quantization_compression(cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR), 16)
    return result


# =========================================================
# H. HISTOGRAM ANALYSIS
# =========================================================
def matplotlib_figure_to_bgr(fig):
    buffer = io.BytesIO()
    fig.savefig(buffer, format="png", bbox_inches="tight", dpi=120)
    plt.close(fig)

    buffer.seek(0)
    image_array = np.frombuffer(buffer.getvalue(), np.uint8)
    img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=500, detail="Gagal membuat visualisasi histogram.")

    return img


def create_histogram_canvas(img, mode="rgb", title="Histogram"):
    fig, ax = plt.subplots(figsize=(7.5, 4.2))

    if mode == "gray":
        gray = to_gray(img)
        ax.hist(gray.ravel(), bins=256, range=(0, 256))
        ax.set_title(title)
        ax.set_xlabel("Intensity")
        ax.set_ylabel("Frequency")

    else:
        channel_data = [
            (img[:, :, 2].ravel(), "Red"),
            (img[:, :, 1].ravel(), "Green"),
            (img[:, :, 0].ravel(), "Blue")
        ]

        for values, label in channel_data:
            ax.hist(values, bins=256, range=(0, 256), alpha=0.45, label=label)

        ax.set_title(title)
        ax.set_xlabel("Intensity")
        ax.set_ylabel("Frequency")
        ax.legend()

    ax.grid(True, alpha=0.25)

    return matplotlib_figure_to_bgr(fig)


def compare_histogram_canvas(original_img, processed_img, mode="rgb"):
    before = create_histogram_canvas(original_img, mode, "Before Histogram")
    after = create_histogram_canvas(processed_img, mode, "After Histogram")

    max_height = max(before.shape[0], after.shape[0])

    def resize_to_height(image, target_height):
        h, w = image.shape[:2]
        if h == target_height:
            return image
        new_width = int(w * (target_height / h))
        return cv2.resize(image, (new_width, target_height), interpolation=cv2.INTER_AREA)

    before = resize_to_height(before, max_height)
    after = resize_to_height(after, max_height)

    divider = np.full((max_height, 20, 3), 245, dtype=np.uint8)

    return np.hstack([before, divider, after])

# =========================================================
# MAIN IMAGE PROCESSING ENDPOINT
# =========================================================
@app.post("/api/export")
async def export_image(
    file: UploadFile = File(...),
    output_format: str = Form("jpg"),
    jpeg_quality: int = Form(95)
):
    contents = await file.read()
    img = read_image_from_upload_bytes(contents)

    return encode_image(
        img,
        quality=jpeg_quality,
        output_format=output_format
    )

@app.post("/api/process")
async def process_image(
    file: UploadFile = File(...),
    operation: str = Form(...),

    # A. Enhancement
    brightness_value: int = Form(0),
    contrast_value: int = Form(0),
    blur_kernel: int = Form(15),
    sharpen_strength: float = Form(1.0),

    # C. Restoration
    median_kernel: int = Form(5),
    noise_kernel: int = Form(5),

    # B. Geometric Transformation
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
    interpolation: str = Form("bilinear"),

    # D. Binary & Edge
    threshold_value: int = Form(127),
    canny_low: int = Form(100),
    canny_high: int = Form(200),
    morph_kernel: int = Form(3),
    morph_iterations: int = Form(1),

    # E. Color Processing
    channel: str = Form("r"),
    hue_value: int = Form(0),
    saturation_value: int = Form(0),

    # F. Segmentation
    segment_k: int = Form(3),

    # G. Compression
    jpeg_quality: int = Form(70),
    quantization_level: int = Form(32),

    # H. Histogram
    histogram_mode: str = Form("rgb"),
    output_format: str = Form("jpg")
):
    contents = await file.read()
    img = read_image_from_upload_bytes(contents)
    processed_img = img
    output_quality = 95
    interpolation_code = get_interpolation(interpolation)

    # A. Enhancement
    if operation == "grayscale":
        processed_img = to_gray(img)
    elif operation == "blur":
        processed_img = smoothing_blur(img, blur_kernel)
    elif operation == "invert":
        processed_img = cv2.bitwise_not(img)
    elif operation == "brightness":
        processed_img = adjust_brightness_contrast(img, brightness=brightness_value, contrast=0)
    elif operation == "contrast":
        processed_img = adjust_brightness_contrast(img, brightness=0, contrast=contrast_value)
    elif operation == "brightness_contrast":
        processed_img = adjust_brightness_contrast(img, brightness=brightness_value, contrast=contrast_value)
    elif operation == "histogram_equalization":
        processed_img = histogram_equalization(img)
    elif operation == "sharpen":
        processed_img = sharpen_image(img, sharpen_strength)

    # C. Restoration
    elif operation == "gaussian_noise_reduction":
        processed_img = smoothing_blur(img, blur_kernel)
    elif operation == "median_filter":
        processed_img = median_filter_image(img, median_kernel)
    elif operation == "salt_pepper_removal":
        processed_img = salt_pepper_noise_removal(img, noise_kernel)

    # B. Geometric Transformation
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

    # D. Binary & Edge Processing
    elif operation == "threshold":
        processed_img = threshold_image(img, threshold_value)
    elif operation == "canny":
        processed_img = canny_edge(img, canny_low, canny_high)
    elif operation == "sobel":
        processed_img = sobel_edge(img)
    elif operation == "prewitt":
        processed_img = prewitt_edge(img)
    elif operation == "robert":
        processed_img = robert_edge(img)
    elif operation == "laplacian":
        processed_img = laplacian_edge(img)
    elif operation == "log":
        processed_img = log_edge(img, blur_kernel)
    elif operation == "erosion":
        processed_img = morphology_operation(img, "erosion", morph_kernel, morph_iterations)
    elif operation == "dilation":
        processed_img = morphology_operation(img, "dilation", morph_kernel, morph_iterations)

    # E. Color Processing
    elif operation == "channel_split":
        processed_img = split_rgb_channel(img, channel)
    elif operation == "hue_saturation":
        processed_img = adjust_hue_saturation(img, hue_value, saturation_value)

    # F. Segmentation
    elif operation == "threshold_segmentation":
        processed_img = threshold_segmentation(img, threshold_value)
    elif operation == "edge_segmentation":
        processed_img = edge_based_segmentation(img, canny_low, canny_high)
    elif operation == "region_segmentation":
        processed_img = region_based_segmentation(img, segment_k)

    # G. Compression
    elif operation == "jpeg_compression":
        processed_img = img
        output_quality = jpeg_quality
    elif operation == "quantization":
        processed_img = quantization_compression(img, quantization_level)
    elif operation == "rle_preview":
        processed_img = rle_visual_simulation(img)
    elif operation == "huffman_preview":
        processed_img = compression_report_canvas(img, "huffman")
    elif operation == "arithmetic_preview":
        processed_img = compression_report_canvas(img, "arithmetic")
    elif operation == "lzw_preview":
        processed_img = compression_report_canvas(img, "lzw")

    # H. Histogram Analysis
    elif operation == "histogram_gray":
        processed_img = create_histogram_canvas(img, mode="gray", title="Grayscale Histogram")
    elif operation == "histogram_rgb":
        processed_img = create_histogram_canvas(img, mode="rgb", title="RGB Histogram")

    else:
        raise HTTPException(status_code=400, detail=f"Operation '{operation}' belum tersedia.")

    return encode_image(processed_img, output_quality, output_format)


@app.post("/api/histogram/compare")
async def compare_histogram(
    original_file: UploadFile = File(...),
    processed_file: UploadFile = File(...),
    histogram_mode: str = Form("rgb")
):
    original_img = read_image_from_upload_bytes(await original_file.read())
    processed_img = read_image_from_upload_bytes(await processed_file.read())
    histogram_mode = "gray" if histogram_mode == "gray" else "rgb"
    canvas = compare_histogram_canvas(original_img, processed_img, histogram_mode)
    return encode_image(canvas, 95)


@app.post("/api/cnn/recognize")
async def cnn_recognize(file: UploadFile = File(...)):
    """
    CNN object recognition menggunakan MobileNetV2 jika TensorFlow tersedia.
    Jika TensorFlow belum terpasang, endpoint tidak membuat server error,
    tetapi mengembalikan informasi bahwa dependency belum tersedia.
    """
    global _cnn_model

    contents = await file.read()
    img = read_image_from_upload_bytes(contents)

    try:
        from tensorflow.keras.applications.mobilenet_v2 import (
            MobileNetV2,
            preprocess_input,
            decode_predictions
        )
    except Exception:
        return JSONResponse({
            "success": False,
            "message": "TensorFlow belum terinstall. Install dengan: pip install tensorflow",
            "label": "CNN unavailable",
            "confidence": 0
        })

    if _cnn_model is None:
        try:
            _cnn_model = MobileNetV2(weights="imagenet")
        except Exception as exc:
            return JSONResponse({
                "success": False,
                "message": f"Model MobileNetV2 belum bisa dimuat: {str(exc)}",
                "label": "Model unavailable",
                "confidence": 0
            })

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (224, 224))
    arr = np.expand_dims(resized.astype(np.float32), axis=0)
    arr = preprocess_input(arr)

    preds = _cnn_model.predict(arr, verbose=0)
    decoded = decode_predictions(preds, top=3)[0]

    results = [
        {
            "label": item[1].replace("_", " "),
            "confidence": round(float(item[2]) * 100, 2)
        }
        for item in decoded
    ]

    return JSONResponse({
        "success": True,
        "message": "CNN object recognition berhasil.",
        "label": results[0]["label"],
        "confidence": results[0]["confidence"],
        "top_predictions": results
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
