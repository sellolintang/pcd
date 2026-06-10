// ============================================================
// App.jsx
// Frontend React untuk Mini Photoshop Pengolahan Citra Digital
// Fungsi utama:
// - upload gambar
// - memilih operasi PCD
// - mengirim gambar dan parameter ke backend FastAPI
// - menampilkan gambar original dan hasil proses
// - export gambar
// - analisis histogram
// - deteksi objek CNN
// ============================================================

import { useRef, useState } from 'react'
import './index.css'

// URL backend FastAPI.
// Jika backend berjalan di port lain, ubah nilai ini.
const API_BASE_URL = 'http://127.0.0.1:8000'

// ============================================================
// KOMPONEN KECIL UNTUK INPUT
// Komponen ini dibuat agar kode utama lebih rapi.
// ============================================================

function Slider({ label, value, min, max, step = 1, onChange }) {
  return (
    <label className="field">
      <div className="fieldHeader">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function NumberInput({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>

      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function SelectInput({ label, value, onChange, children }) {
  return (
    <label className="field">
      <span>{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  )
}

function ToolButton({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      className="toolButton"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function Panel({ title, description, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <p>{description}</p>

      <div className="panelBody">
        {children}
      </div>
    </section>
  )
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================

export default function App() {
  const fileInputRef = useRef(null)

  // State gambar.
  const [originalImage, setOriginalImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)

  // File asli tetap disimpan untuk fitur before-after dan histogram.
  const [originalFile, setOriginalFile] = useState(null)

  // selectedFile adalah file yang akan diproses berikutnya.
  // Setelah proses berhasil, selectedFile diganti menjadi hasil proses.
  const [selectedFile, setSelectedFile] = useState(null)

  // State tampilan.
  const [status, setStatus] = useState('Upload gambar untuk mulai mengedit.')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeGroup, setActiveGroup] = useState('enhancement')
  const [previewMode, setPreviewMode] = useState('split')

  // State data hasil analisis.
  const [histogramData, setHistogramData] = useState(null)
  const [cnnResult, setCnnResult] = useState(null)

  // Parameter enhancement.
  const [brightnessValue, setBrightnessValue] = useState(0)
  const [contrastValue, setContrastValue] = useState(0)
  const [blurKernel, setBlurKernel] = useState(15)
  const [sharpenStrength, setSharpenStrength] = useState(1)

  // Parameter restoration.
  const [medianKernel, setMedianKernel] = useState(5)
  const [noiseKernel, setNoiseKernel] = useState(5)

  // Parameter transform.
  const [rotateAngle, setRotateAngle] = useState(0)
  const [resizeWidth, setResizeWidth] = useState(300)
  const [resizeHeight, setResizeHeight] = useState(300)
  const [translateX, setTranslateX] = useState(50)
  const [translateY, setTranslateY] = useState(50)

  // Parameter crop manual.
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropW, setCropW] = useState(200)
  const [cropH, setCropH] = useState(200)

  const [interpolation, setInterpolation] = useState('bilinear')

  // Parameter edge dan binary.
  const [thresholdValue, setThresholdValue] = useState(127)
  const [cannyLow, setCannyLow] = useState(100)
  const [cannyHigh, setCannyHigh] = useState(200)
  const [morphologyKernel, setMorphologyKernel] = useState(3)

  // Parameter warna.
  const [channel, setChannel] = useState('r')
  const [hueShift, setHueShift] = useState(0)
  const [saturationValue, setSaturationValue] = useState(0)

  // Parameter segmentasi.
  const [clusterCount, setClusterCount] = useState(3)

  // Parameter compression.
  const [jpegQuality, setJpegQuality] = useState(70)
  const [quantizationLevel, setQuantizationLevel] = useState(32)

  // Parameter export.
  const [exportFilename, setExportFilename] = useState('hasil-edit')
  const [exportFormat, setExportFormat] = useState('jpg')
  const [exportQuality, setExportQuality] = useState(95)

  // Parameter CNN.
  const [cnnTargetObject, setCnnTargetObject] = useState('general')

  // Daftar grup fitur di sidebar.
  const groups = [
    { id: 'enhancement', label: 'Enhance' },
    { id: 'restoration', label: 'Restore' },
    { id: 'transform', label: 'Transform' },
    { id: 'edge', label: 'Edge' },
    { id: 'color', label: 'Color' },
    { id: 'segment', label: 'Segment' },
    { id: 'compress', label: 'Compress' },
    { id: 'analyze', label: 'Analyze' },
    { id: 'cnn', label: 'CNN' },
    { id: 'export', label: 'Export' }
  ]

  // ============================================================
  // HANDLE FILE UPLOAD
  // ============================================================

  function handleUpload(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const imageUrl = URL.createObjectURL(file)

    setOriginalFile(file)
    setSelectedFile(file)
    setOriginalImage(imageUrl)
    setProcessedImage(null)
    setHistogramData(null)
    setCnnResult(null)
    setStatus(`Gambar "${file.name}" berhasil diupload.`)
  }

  // ============================================================
  // MEMBUAT FORMDATA UNTUK BACKEND
  // Semua parameter dikirim, tetapi backend hanya memakai yang sesuai operation.
  // ============================================================

  function buildFormData(operation) {
    const formData = new FormData()

    formData.append('file', selectedFile)
    formData.append('operation', operation)

    // Enhancement
    formData.append('brightness_value', brightnessValue)
    formData.append('contrast_value', contrastValue)
    formData.append('blur_kernel', blurKernel)
    formData.append('sharpen_strength', sharpenStrength)

    // Restoration
    formData.append('median_kernel', medianKernel)
    formData.append('noise_kernel', noiseKernel)

    // Transform
    formData.append('angle', rotateAngle)
    formData.append('dx', translateX)
    formData.append('dy', translateY)
    formData.append('width', resizeWidth)
    formData.append('height', resizeHeight)
    formData.append('scale', 1)
    formData.append('crop_x', cropX)
    formData.append('crop_y', cropY)
    formData.append('crop_w', cropW)
    formData.append('crop_h', cropH)
    formData.append('interpolation', interpolation)

    // Edge
    formData.append('threshold_value', thresholdValue)
    formData.append('canny_low', cannyLow)
    formData.append('canny_high', cannyHigh)
    formData.append('morph_kernel', morphologyKernel)
    formData.append('morph_iterations', 1)

    // Color
    formData.append('channel', channel)
    formData.append('hue_value', hueShift)
    formData.append('saturation_value', saturationValue)

    // Segmentation
    formData.append('segment_k', clusterCount)

    // Compression
    formData.append('jpeg_quality', jpegQuality)
    formData.append('quantization_level', quantizationLevel)

    // Output
    formData.append('output_format', 'jpg')

    return formData
  }

  // ============================================================
  // PROSES GAMBAR
  // ============================================================

  async function processImage(operation) {
    if (!selectedFile) {
      setStatus('Upload gambar terlebih dahulu.')
      return
    }

    setIsProcessing(true)
    setStatus(`Memproses operasi: ${operation} ...`)

    try {
      const response = await fetch(`${API_BASE_URL}/api/process`, {
        method: 'POST',
        body: buildFormData(operation)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }

      const blob = await response.blob()
      const outputUrl = URL.createObjectURL(blob)

      // Hasil proses ditampilkan sebagai preview.
      setProcessedImage(outputUrl)

      // Blob hasil proses dijadikan File agar bisa diproses lagi secara berantai.
      const nextFile = new File([blob], 'processed.jpg', { type: blob.type })
      setSelectedFile(nextFile)

      setStatus(`Operasi ${operation} berhasil.`)
    } catch (error) {
      setStatus(`Gagal memproses gambar: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================
  // RESET GAMBAR KE KONDISI AWAL
  // ============================================================

  function resetImage() {
    if (!originalFile || !originalImage) {
      return
    }

    setSelectedFile(originalFile)
    setProcessedImage(null)
    setHistogramData(null)
    setCnnResult(null)
    setStatus('Gambar dikembalikan ke versi original.')
  }

  // ============================================================
  // EXPORT GAMBAR
  // ============================================================

  async function exportImage() {
    if (!selectedFile) {
      setStatus('Tidak ada gambar yang bisa diexport.')
      return
    }

    setIsProcessing(true)
    setStatus('Mengekspor gambar ...')

    try {
      const formData = new FormData()

      formData.append('file', selectedFile)
      formData.append('output_format', exportFormat)
      formData.append('jpeg_quality', exportQuality)

      const response = await fetch(`${API_BASE_URL}/api/export`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `${exportFilename}.${exportFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setStatus('Gambar berhasil diexport.')
    } catch (error) {
      setStatus(`Gagal export gambar: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================
  // HISTOGRAM SUMMARY
  // ============================================================

  async function loadHistogramSummary() {
    if (!selectedFile) {
      setStatus('Upload gambar terlebih dahulu.')
      return
    }

    setIsProcessing(true)
    setStatus('Menghitung histogram ...')

    try {
      const formData = new FormData()

      formData.append('current_file', selectedFile)

      if (originalFile) {
        formData.append('original_file', originalFile)
      }

      const response = await fetch(`${API_BASE_URL}/api/histogram`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }

      const data = await response.json()

      setHistogramData(data)
      setStatus('Histogram berhasil dihitung.')
    } catch (error) {
      setStatus(`Gagal menghitung histogram: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================
  // CNN OBJECT RECOGNITION
  // ============================================================

  async function recognizeObject() {
    if (!selectedFile) {
      setStatus('Upload gambar terlebih dahulu.')
      return
    }

    setIsProcessing(true)
    setStatus('Menjalankan CNN recognition ...')

    try {
      const formData = new FormData()

      formData.append('file', selectedFile)
      formData.append('target_object', cnnTargetObject)

      const response = await fetch(`${API_BASE_URL}/api/cnn/recognize`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText)
      }

      const data = await response.json()

      setCnnResult(data)
      setStatus(data.message || 'CNN recognition selesai.')
    } catch (error) {
      setStatus(`Gagal menjalankan CNN: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // ============================================================
  // PANEL FITUR BERDASARKAN GRUP AKTIF
  // ============================================================

  function renderActivePanel() {
    const disabled = !selectedFile || isProcessing

    if (activeGroup === 'enhancement') {
      return (
        <Panel
          title="Image Enhancement"
          description="Fitur untuk meningkatkan kualitas visual gambar."
        >
          <Slider label="Brightness" value={brightnessValue} min={-100} max={100} onChange={setBrightnessValue} />
          <Slider label="Contrast" value={contrastValue} min={-100} max={100} onChange={setContrastValue} />
          <Slider label="Blur Kernel" value={blurKernel} min={1} max={51} step={2} onChange={setBlurKernel} />
          <Slider label="Sharpen Strength" value={sharpenStrength} min={0} max={5} step={0.1} onChange={setSharpenStrength} />

          <div className="buttonGrid">
            <ToolButton disabled={disabled} onClick={() => processImage('grayscale')}>Grayscale</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('invert')}>Invert</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('brightness')}>Brightness</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('contrast')}>Contrast</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('brightness_contrast')}>Brightness + Contrast</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('blur')}>Gaussian Blur</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('histogram_equalization')}>Histogram Equalization</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('sharpen')}>Sharpen</ToolButton>
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'restoration') {
      return (
        <Panel
          title="Image Restoration"
          description="Fitur untuk mengurangi noise dan memperbaiki kualitas citra."
        >
          <Slider label="Median Kernel" value={medianKernel} min={3} max={21} step={2} onChange={setMedianKernel} />
          <Slider label="Noise Kernel" value={noiseKernel} min={3} max={21} step={2} onChange={setNoiseKernel} />

          <div className="buttonGrid">
            <ToolButton disabled={disabled} onClick={() => processImage('gaussian_noise_reduction')}>Gaussian Noise Reduction</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('median_filter')}>Median Filter</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('salt_pepper_removal')}>Salt Pepper Removal</ToolButton>
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'transform') {
      return (
        <Panel
          title="Geometric Transformation"
          description="Fitur untuk rotasi, resize, translasi, flip, dan crop."
        >
          <SelectInput label="Interpolation" value={interpolation} onChange={setInterpolation}>
            <option value="bilinear">Bilinear</option>
            <option value="nearest">Nearest</option>
          </SelectInput>

          <Slider label="Rotate Angle" value={rotateAngle} min={-180} max={180} onChange={setRotateAngle} />

          <div className="twoColumn">
            <NumberInput label="Resize Width" value={resizeWidth} onChange={setResizeWidth} />
            <NumberInput label="Resize Height" value={resizeHeight} onChange={setResizeHeight} />
            <NumberInput label="Translate X" value={translateX} onChange={setTranslateX} />
            <NumberInput label="Translate Y" value={translateY} onChange={setTranslateY} />
            <NumberInput label="Crop X" value={cropX} onChange={setCropX} />
            <NumberInput label="Crop Y" value={cropY} onChange={setCropY} />
            <NumberInput label="Crop Width" value={cropW} onChange={setCropW} />
            <NumberInput label="Crop Height" value={cropH} onChange={setCropH} />
          </div>

          <div className="buttonGrid">
            <ToolButton disabled={disabled} onClick={() => processImage('rotate')}>Rotate</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('resize')}>Resize</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('translate')}>Translate</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('crop')}>Crop Manual</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('flip_horizontal')}>Flip Horizontal</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('flip_vertical')}>Flip Vertical</ToolButton>
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'edge') {
      return (
        <Panel
          title="Binary and Edge Processing"
          description="Fitur threshold, deteksi tepi, dan operasi morfologi."
        >
          <Slider label="Threshold" value={thresholdValue} min={0} max={255} onChange={setThresholdValue} />
          <Slider label="Canny Low" value={cannyLow} min={0} max={255} onChange={setCannyLow} />
          <Slider label="Canny High" value={cannyHigh} min={0} max={255} onChange={setCannyHigh} />
          <Slider label="Morphology Kernel" value={morphologyKernel} min={1} max={21} step={2} onChange={setMorphologyKernel} />

          <div className="buttonGrid">
            <ToolButton disabled={disabled} onClick={() => processImage('threshold')}>Threshold</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('canny')}>Canny</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('sobel')}>Sobel</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('prewitt')}>Prewitt</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('robert')}>Robert</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('laplacian')}>Laplacian</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('log')}>LoG</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('erosion')}>Erosion</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('dilation')}>Dilation</ToolButton>
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'color') {
      return (
        <Panel
          title="Color Processing"
          description="Fitur untuk memproses channel warna, hue, dan saturation."
        >
          <SelectInput label="Channel" value={channel} onChange={setChannel}>
            <option value="r">Red</option>
            <option value="g">Green</option>
            <option value="b">Blue</option>
          </SelectInput>

          <Slider label="Hue Shift" value={hueShift} min={-90} max={90} onChange={setHueShift} />
          <Slider label="Saturation" value={saturationValue} min={-100} max={100} onChange={setSaturationValue} />

          <div className="buttonGrid">
            <ToolButton disabled={disabled} onClick={() => processImage('channel_split')}>Channel Split</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('hue_saturation')}>Hue + Saturation</ToolButton>
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'segment') {
      return (
        <Panel
          title="Image Segmentation"
          description="Fitur segmentasi berbasis threshold, edge, dan region."
        >
          <Slider label="Threshold" value={thresholdValue} min={0} max={255} onChange={setThresholdValue} />
          <Slider label="Cluster Count" value={clusterCount} min={2} max={8} onChange={setClusterCount} />

          <div className="buttonGrid">
            <ToolButton disabled={disabled} onClick={() => processImage('threshold_segmentation')}>Threshold Segmentation</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('edge_segmentation')}>Edge Segmentation</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('region_segmentation')}>Region Segmentation</ToolButton>
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'compress') {
      return (
        <Panel
          title="Image Compression"
          description="Fitur kompresi JPEG, quantization, dan simulasi lossless compression."
        >
          <Slider label="JPEG Quality" value={jpegQuality} min={1} max={100} onChange={setJpegQuality} />
          <Slider label="Quantization Level" value={quantizationLevel} min={2} max={128} onChange={setQuantizationLevel} />

          <div className="buttonGrid">
            <ToolButton disabled={disabled} onClick={() => processImage('jpeg_compression')}>JPEG Compression</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('quantization')}>Quantization</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('rle_preview')}>RLE Preview</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('huffman_preview')}>Huffman Preview</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('arithmetic_preview')}>Arithmetic Preview</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('lzw_preview')}>LZW Preview</ToolButton>
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'analyze') {
      return (
        <Panel
          title="Histogram Analysis"
          description="Fitur untuk melihat visual histogram dan statistik gambar."
        >
          <div className="buttonGrid">
            <ToolButton disabled={disabled} onClick={() => processImage('histogram_gray')}>Show Gray Histogram</ToolButton>
            <ToolButton disabled={disabled} onClick={() => processImage('histogram_rgb')}>Show RGB Histogram</ToolButton>
            <ToolButton disabled={disabled} onClick={loadHistogramSummary}>Load Histogram Summary</ToolButton>
          </div>

          {histogramData && (
            <div className="resultBox">
              <h3>Histogram Summary</h3>
              <p>Width: {histogramData.current.width}px</p>
              <p>Height: {histogramData.current.height}px</p>
              <p>Gray Mean: {histogramData.current.gray_mean}</p>
              <p>Gray Std: {histogramData.current.gray_std}</p>
              <p>Gray Min: {histogramData.current.gray_min}</p>
              <p>Gray Max: {histogramData.current.gray_max}</p>
              <p>Gray Median: {histogramData.current.gray_median}</p>
            </div>
          )}
        </Panel>
      )
    }

    if (activeGroup === 'cnn') {
      return (
        <Panel
          title="CNN Object Recognition"
          description="Fitur tambahan untuk mengenali objek memakai MobileNetV2 pretrained ImageNet."
        >
          <label className="field">
            <span>Target Object</span>
            <input
              type="text"
              value={cnnTargetObject}
              onChange={(event) => setCnnTargetObject(event.target.value)}
              placeholder="general atau nama objek"
            />
          </label>

          <ToolButton disabled={disabled} onClick={recognizeObject}>
            Recognize Object
          </ToolButton>

          {cnnResult && (
            <div className="resultBox">
              <h3>Hasil CNN</h3>
              <p>Model: {cnnResult.model}</p>
              <p>Label utama: {cnnResult.label}</p>
              <p>Confidence: {cnnResult.confidence}%</p>
              <p>Target detected: {String(cnnResult.is_target_detected)}</p>

              <ol>
                {cnnResult.top_predictions?.map((item) => (
                  <li key={item.rank}>
                    {item.rank}. {item.label} - {item.confidence}%
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Panel>
      )
    }

    return (
      <Panel
        title="Export Image"
        description="Simpan gambar hasil editing ke format JPG, PNG, atau BMP."
      >
        <label className="field">
          <span>File Name</span>
          <input
            type="text"
            value={exportFilename}
            onChange={(event) => setExportFilename(event.target.value)}
          />
        </label>

        <SelectInput label="Format" value={exportFormat} onChange={setExportFormat}>
          <option value="jpg">JPG</option>
          <option value="png">PNG</option>
          <option value="bmp">BMP</option>
        </SelectInput>

        <Slider label="JPEG Quality" value={exportQuality} min={1} max={100} onChange={setExportQuality} />

        <ToolButton disabled={disabled} onClick={exportImage}>
          Download Image
        </ToolButton>
      </Panel>
    )
  }

  // ============================================================
  // RENDER UI UTAMA
  // ============================================================

  return (
    <main className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Pengolahan Citra Digital</p>
          <h1>Mini Photoshop PCD</h1>
          <p className="subtitle">
            Editor gambar berbasis React, FastAPI, OpenCV, dan NumPy.
          </p>
        </div>

        <div className="headerActions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            hidden
          />

          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Upload Image
          </button>

          <button type="button" onClick={resetImage} disabled={!originalFile}>
            Reset
          </button>
        </div>
      </header>

      <section className="statusBar">
        {isProcessing ? 'Processing...' : status}
      </section>

      <div className="layout">
        <aside className="sidebar">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={activeGroup === group.id ? 'active' : ''}
              onClick={() => setActiveGroup(group.id)}
            >
              {group.label}
            </button>
          ))}
        </aside>

        <section className="workspace">
          <section className="previewCard">
            <div className="previewHeader">
              <h2>Preview</h2>

              <select
                value={previewMode}
                onChange={(event) => setPreviewMode(event.target.value)}
              >
                <option value="split">Before / After</option>
                <option value="result">Result Only</option>
                <option value="original">Original Only</option>
              </select>
            </div>

            {!originalImage && (
              <div className="emptyState">
                Belum ada gambar. Klik Upload Image untuk mulai.
              </div>
            )}

            {originalImage && previewMode === 'split' && (
              <div className="imageGrid">
                <div>
                  <h3>Original</h3>
                  <img src={originalImage} alt="Original" />
                </div>

                <div>
                  <h3>Processed</h3>
                  {processedImage ? (
                    <img src={processedImage} alt="Processed" />
                  ) : (
                    <div className="emptyState small">Belum ada hasil proses.</div>
                  )}
                </div>
              </div>
            )}

            {originalImage && previewMode === 'original' && (
              <img className="singleImage" src={originalImage} alt="Original" />
            )}

            {originalImage && previewMode === 'result' && (
              processedImage ? (
                <img className="singleImage" src={processedImage} alt="Processed" />
              ) : (
                <div className="emptyState small">Belum ada hasil proses.</div>
              )
            )}
          </section>

          {renderActivePanel()}
        </section>
      </div>
    </main>
  )
}
