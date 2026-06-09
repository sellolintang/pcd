import { useRef, useState } from 'react'
import Slider from './components/Slider'

function App() {
  const fileInputRef = useRef(null)

  const [originalImage, setOriginalImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [status, setStatus] = useState('Upload gambar untuk mulai mengedit.')
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeGroup, setActiveGroup] = useState('enhancement')
  const [previewMode, setPreviewMode] = useState('split')
  const [histogramData, setHistogramData] = useState(null)
  const [cnnResult, setCnnResult] = useState(null)

  // Enhancement
  const [brightnessValue, setBrightnessValue] = useState(0)
  const [contrastValue, setContrastValue] = useState(0)
  const [blurKernel, setBlurKernel] = useState(15)
  const [sharpenStrength, setSharpenStrength] = useState(1)

  // Restoration
  const [medianKernel, setMedianKernel] = useState(5)
  const [noiseKernel, setNoiseKernel] = useState(5)

  // Transform
  const [rotateAngle, setRotateAngle] = useState(0)
  const [resizeWidth, setResizeWidth] = useState(300)
  const [resizeHeight, setResizeHeight] = useState(300)
  const [translateX, setTranslateX] = useState(50)
  const [translateY, setTranslateY] = useState(50)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropW, setCropW] = useState(200)
  const [cropH, setCropH] = useState(200)
  const [interpolation, setInterpolation] = useState('bilinear')

  // Interactive crop
  const [cropMode, setCropMode] = useState(false)
  const [cropSelection, setCropSelection] = useState(null) // { x, y, w, h } in display px
  const [cropDragStart, setCropDragStart] = useState(null)
  const cropImageRef = useRef(null)

  // Edge & Binary
  const [thresholdValue, setThresholdValue] = useState(127)
  const [cannyLow, setCannyLow] = useState(100)
  const [cannyHigh, setCannyHigh] = useState(200)
  const [morphologyKernel, setMorphologyKernel] = useState(3)

  // Color
  const [channel, setChannel] = useState('red')
  const [hueShift, setHueShift] = useState(0)
  const [saturationValue, setSaturationValue] = useState(0)

  // Segmentation
  const [clusterCount, setClusterCount] = useState(3)

  // Compression
  const [jpegQuality, setJpegQuality] = useState(70)
  const [quantizationLevels, setQuantizationLevels] = useState(8)

  const groups = [
    { id: 'enhancement', icon: '1', title: 'Enhance', subtitle: 'Brightness, contrast, sharpen' },
    { id: 'restoration', icon: '2', title: 'Restore', subtitle: 'Noise reduction' },
    { id: 'transform', icon: '3', title: 'Transform', subtitle: 'Rotate, crop, resize' },
    { id: 'edge', icon: '4', title: 'Edge', subtitle: 'Threshold & edges' },
    { id: 'color', icon: '5', title: 'Color', subtitle: 'RGB, hue, saturation' },
    { id: 'segmentation', icon: '6', title: 'Segment', subtitle: 'Threshold, edge, region' },
    { id: 'compression', icon: '7', title: 'Compress', subtitle: 'JPEG, quantization' },
    { id: 'analysis', icon: '8', title: 'Analyze', subtitle: 'Histogram & CNN' }
  ]

  const operationLabels = {
    brightness_contrast: 'Brightness & Contrast',
    histogram_equalization: 'Histogram Equalization',
    blur: 'Gaussian Blur',
    sharpen: 'Sharpen',
    gaussian_noise_reduction: 'Gaussian Noise Reduction',
    median_filter: 'Median Filter',
    salt_pepper_removal: 'Salt & Pepper Removal',
    rotate: 'Rotate',
    flip_horizontal: 'Flip Horizontal',
    flip_vertical: 'Flip Vertical',
    resize: 'Resize',
    translate: 'Translate',
    crop: 'Crop',
    threshold: 'Threshold',
    canny: 'Canny',
    sobel: 'Sobel',
    prewitt: 'Prewitt',
    robert: 'Robert',
    laplacian: 'Laplacian',
    log: 'Laplacian of Gaussian',
    erosion: 'Erosion',
    dilation: 'Dilation',
    grayscale: 'Grayscale',
    invert: 'Invert Color',
    channel_split: 'Channel Split',
    hue_saturation: 'Hue & Saturation',
    segmentation_threshold: 'Threshold Segmentation',
    segmentation_edge: 'Edge Segmentation',
    segmentation_region: 'Region Segmentation',
    jpeg_compress: 'JPEG Compression',
    quantization: 'Quantization',
    rle_preview: 'RLE Preview'
  }

  const requireImage = () => {
    if (!selectedFile) {
      setStatus('Silakan upload gambar terlebih dahulu.')
      return false
    }
    return true
  }

  const readError = async (response) => {
    const text = await response.text()
    try {
      const json = JSON.parse(text)
      return json.detail || text
    } catch {
      return text || 'Terjadi kesalahan proses.'
    }
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    setOriginalFile(file)
    setSelectedFile(file)
    setOriginalImage(url)
    setProcessedImage(null)
    setHistogramData(null)
    setCnnResult(null)
    setStatus(`Gambar berhasil dimuat: ${file.name}`)
    event.target.value = ''
  }

  const handleProcessImage = async (operation, params = {}) => {
    if (!requireImage()) return

    try {
      setIsProcessing(true)
      setHistogramData(null)
      setCnnResult(null)
      setStatus(`Memproses ${operationLabels[operation] || operation}...`)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('operation', operation)

      Object.entries(params).forEach(([key, value]) => {
        formData.append(key, value)
      })

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const newFile = new File([blob], 'processed-image.jpg', {
        type: blob.type || 'image/jpeg'
      })

      setProcessedImage(url)
      setSelectedFile(newFile)
      setPreviewMode('split')
      setStatus(`Selesai: ${operationLabels[operation] || operation}.`)
    } catch (error) {
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVisualHistogram = async (operation) => {
    if (!requireImage()) return

    try {
      setIsProcessing(true)
      setHistogramData(null)
      setCnnResult(null)
      setStatus('Membuat histogram...')

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('operation', operation)

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      // Histogram hanya ditampilkan sebagai preview,
      // selectedFile tidak diganti supaya gambar aktif tetap gambar asli/hasil edit.
      setProcessedImage(url)
      setPreviewMode('after')
      setStatus('Histogram berhasil ditampilkan.')
    } catch (error) {
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompareHistogram = async (mode = 'rgb') => {
    if (!originalFile || !selectedFile) {
      setStatus('Upload gambar terlebih dahulu.')
      return
    }

    try {
      setIsProcessing(true)
      setHistogramData(null)
      setCnnResult(null)
      setStatus('Membandingkan histogram before-after...')

      const formData = new FormData()
      formData.append('original_file', originalFile)
      formData.append('processed_file', selectedFile)
      formData.append('histogram_mode', mode)

      const response = await fetch('/api/histogram/compare', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)

      setProcessedImage(url)
      setPreviewMode('after')
      setStatus('Compare histogram berhasil ditampilkan.')
    } catch (error) {
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResetImage = () => {
    if (!originalFile) {
      setStatus('Belum ada gambar untuk di-reset.')
      return
    }

    setSelectedFile(originalFile)
    setProcessedImage(null)
    setHistogramData(null)
    setCnnResult(null)
    setStatus('Gambar dikembalikan ke kondisi awal.')
  }

  const handleSaveImage = () => {
    const imageToSave = processedImage || originalImage
    if (!imageToSave) {
      setStatus('Belum ada gambar untuk disimpan.')
      return
    }

    const link = document.createElement('a')
    link.href = imageToSave
    link.download = processedImage ? 'hasil-edit.jpg' : 'gambar-awal.jpg'
    link.click()
    setStatus('Gambar berhasil disimpan.')
  }

  const handleHistogram = async () => {
    if (!requireImage()) return

    try {
      setIsProcessing(true)
      setCnnResult(null)
      setStatus('Menghitung histogram gambar...')

      const formData = new FormData()
      formData.append('current_file', selectedFile)

      if (originalFile) {
        formData.append('original_file', originalFile)
      }

      const response = await fetch('/api/histogram', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const data = await response.json()
      setHistogramData(data)
      setStatus('Histogram berhasil dihitung.')
    } catch (error) {
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCnnRecognize = async () => {
    if (!requireImage()) return

    try {
      setIsProcessing(true)
      setHistogramData(null)
      setCnnResult(null)
      setStatus('Menjalankan CNN Object Recognition...')

      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/cnn/recognize', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const data = await response.json()
      setCnnResult(data)

      const predictions = data.top_predictions
        ?.map((item) => `${item.label} (${item.confidence}%)`)
        .join(', ')

      setStatus(`CNN selesai: ${predictions}`)
    } catch (error) {
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Convert display-space selection to actual image coordinates
  const getImageCropCoords = () => {
    const img = cropImageRef.current
    const container = cropContainerRef.current
    if (!img || !container || !cropSelection) return null
    const imgRect = img.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    // offset of image inside container
    const offsetX = imgRect.left - containerRect.left
    const offsetY = imgRect.top - containerRect.top
    // selection is in container space; convert to image-display space
    const selInImgX = cropSelection.x - offsetX
    const selInImgY = cropSelection.y - offsetY
    // scale to natural image size
    const scaleX = img.naturalWidth / imgRect.width
    const scaleY = img.naturalHeight / imgRect.height
    const x = Math.max(0, Math.round(selInImgX * scaleX))
    const y = Math.max(0, Math.round(selInImgY * scaleY))
    const w = Math.round(cropSelection.w * scaleX)
    const h = Math.round(cropSelection.h * scaleY)
    return { x, y, w, h }
  }

  const handleCropMouseDown = (e) => {
    if (!cropMode) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropDragStart({ x, y })
    setCropSelection({ x, y, w: 0, h: 0 })
  }

  const handleCropMouseMove = (e) => {
    if (!cropMode || !cropDragStart) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCropSelection({
      x: Math.min(x, cropDragStart.x),
      y: Math.min(y, cropDragStart.y),
      w: Math.abs(x - cropDragStart.x),
      h: Math.abs(y - cropDragStart.y),
    })
  }

  const handleCropMouseUp = (e) => {
    if (!cropMode) return
    e.preventDefault()
    setCropDragStart(null)
    // selection is now locked; user will click Apply
  }

  const handleApplyCrop = () => {
    const coords = getImageCropCoords()
    if (!coords || coords.w < 5 || coords.h < 5) {
      setStatus('Pilih area crop terlebih dahulu dengan drag di gambar.')
      return
    }
    setCropMode(false)
    setCropSelection(null)
    handleProcessImage('crop', { crop_x: coords.x, crop_y: coords.y, crop_w: coords.w, crop_h: coords.h })
  }

  const activeGroupData = groups.find((item) => item.id === activeGroup)

  const buttonBase =
    'rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50'

  const primaryButton =
    `${buttonBase} bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-950/40`

  const secondaryButton =
    `${buttonBase} bg-white text-slate-800 hover:bg-slate-100`

  const toolButton =
    `${buttonBase} w-full bg-slate-100 text-slate-800 hover:bg-blue-600 hover:text-white`

  const outlineButton =
    `${buttonBase} border border-slate-300 bg-white text-slate-700 hover:border-blue-500 hover:text-blue-600`

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

  // const Slider = ({ label, value, min, max, step = 1, onChange }) => {
  //   const numericValue = Number(value)
  //   const numericMin = Number(min)
  //   const numericMax = Number(max)
  //   const numericStep = Number(step)

  //   const percentage =
  //     ((numericValue - numericMin) / (numericMax - numericMin)) * 100

  //   const clampValue = (value) => {
  //     return Math.min(numericMax, Math.max(numericMin, value))
  //   }

  //   const snapToStep = (value) => {
  //     const steppedValue =
  //       Math.round((value - numericMin) / numericStep) * numericStep + numericMin

  //     return Number(steppedValue.toFixed(4))
  //   }

  //   const updateValueFromPointer = (event, trackElement) => {
  //     const rect = trackElement.getBoundingClientRect()
  //     const pointerX = event.clientX - rect.left
  //     const rawPercentage = pointerX / rect.width
  //     const rawValue = numericMin + rawPercentage * (numericMax - numericMin)
  //     const nextValue = snapToStep(clampValue(rawValue))

  //     onChange(nextValue)
  //   }

  //   const handlePointerDown = (event) => {
  //     event.preventDefault()

  //     const trackElement = event.currentTarget

  //     updateValueFromPointer(event, trackElement)

  //     const handlePointerMove = (moveEvent) => {
  //       moveEvent.preventDefault()
  //       updateValueFromPointer(moveEvent, trackElement)
  //     }

  //     const handlePointerUp = () => {
  //       window.removeEventListener('pointermove', handlePointerMove)
  //       window.removeEventListener('pointerup', handlePointerUp)
  //     }

  //     window.addEventListener('pointermove', handlePointerMove)
  //     window.addEventListener('pointerup', handlePointerUp)
  //   }

  //   return (
  //     <div className="rounded-2xl border border-slate-200 bg-white p-4">
  //       <div className="mb-3 flex items-center justify-between">
  //         <span className="text-sm font-medium text-slate-700">{label}</span>

  //         <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
  //           {numericValue}
  //         </span>
  //       </div>

  //       <div
  //         role="slider"
  //         tabIndex={0}
  //         aria-label={label}
  //         aria-valuemin={numericMin}
  //         aria-valuemax={numericMax}
  //         aria-valuenow={numericValue}
  //         onPointerDown={handlePointerDown}
  //         className="relative h-8 w-full cursor-pointer select-none touch-none"
  //       >
  //         <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-slate-200">
  //           <div
  //             className="h-full rounded-full bg-blue-600"
  //             style={{ width: `${percentage}%` }}
  //           />
  //         </div>

  //         <div
  //           className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow"
  //           style={{ left: `${percentage}%` }}
  //         />
  //       </div>
  //     </div>
  //   )
  // }

  const NumberInput = ({ label, value, onChange }) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  )

  const SelectInput = ({ label, value, onChange, children }) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        {children}
      </select>
    </label>
  )

  const ToolButton = ({ children, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={isProcessing || !selectedFile}
      className={toolButton}
    >
      {children}
    </button>
  )

  const Panel = ({ title, description, children }) => (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
          {activeGroupData?.icon} {activeGroupData?.title}
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )

  const renderPanel = () => {
    if (activeGroup === 'enhancement') {
      return (
        <Panel
          title="Image Enhancement"
          description="Atur kualitas visual gambar secara cepat."
        >
          <Slider label="Brightness" value={brightnessValue} min="-100" max="100" onChange={setBrightnessValue} />
          <Slider label="Contrast" value={contrastValue} min="-100" max="100" onChange={setContrastValue} />

          <ToolButton
            onClick={() =>
              handleProcessImage('brightness_contrast', {
                brightness_value: brightnessValue,
                contrast_value: contrastValue
              })
            }
          >
            Apply Brightness & Contrast
          </ToolButton>

          <Slider label="Blur Kernel" value={blurKernel} min="1" max="31" step="2" onChange={setBlurKernel} />

          <div className="grid grid-cols-2 gap-3">
            <ToolButton onClick={() => handleProcessImage('blur', { blur_kernel: blurKernel })}>
              Blur
            </ToolButton>
            <ToolButton onClick={() => handleProcessImage('histogram_equalization')}>
              Equalize
            </ToolButton>
          </div>

          <Slider label="Sharpen Strength" value={sharpenStrength} min="0" max="3" step="0.1" onChange={setSharpenStrength} />

          <ToolButton onClick={() => handleProcessImage('sharpen', { sharpen_strength: sharpenStrength })}>
            Sharpen Image
          </ToolButton>
        </Panel>
      )
    }

    if (activeGroup === 'restoration') {
      return (
        <Panel
          title="Restoration / Noise Reduction"
          description="Kurangi noise dan perbaiki citra yang kurang bersih."
        >
          <Slider label="Gaussian Kernel" value={blurKernel} min="1" max="31" step="2" onChange={setBlurKernel} />
          <ToolButton onClick={() => handleProcessImage('gaussian_noise_reduction', { blur_kernel: blurKernel })}>
            Gaussian Noise Reduction
          </ToolButton>

          <Slider label="Median Kernel" value={medianKernel} min="3" max="15" step="2" onChange={setMedianKernel} />
          <ToolButton onClick={() => handleProcessImage('median_filter', { median_kernel: medianKernel })}>
            Median Filter
          </ToolButton>

          <Slider label="Salt & Pepper Kernel" value={noiseKernel} min="3" max="15" step="2" onChange={setNoiseKernel} />
          <ToolButton onClick={() => handleProcessImage('salt_pepper_removal', { noise_kernel: noiseKernel })}>
            Remove Salt & Pepper
          </ToolButton>
        </Panel>
      )
    }

    if (activeGroup === 'transform') {
      return (
        <Panel
          title="Geometric Transformation"
          description="Ubah bentuk, posisi, dan ukuran gambar."
        >
          <SelectInput label="Interpolation" value={interpolation} onChange={setInterpolation}>
            <option value="bilinear">Bilinear</option>
            <option value="nearest">Nearest</option>
          </SelectInput>

          <Slider label="Rotate Angle" value={rotateAngle} min="0" max="360" onChange={setRotateAngle} />
          <ToolButton onClick={() => handleProcessImage('rotate', { angle: rotateAngle, interpolation })}>
            Rotate
          </ToolButton>

          <div className="grid grid-cols-2 gap-3">
            <ToolButton onClick={() => handleProcessImage('flip_horizontal')}>Flip H</ToolButton>
            <ToolButton onClick={() => handleProcessImage('flip_vertical')}>Flip V</ToolButton>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Width" value={resizeWidth} onChange={setResizeWidth} />
            <NumberInput label="Height" value={resizeHeight} onChange={setResizeHeight} />
          </div>
          <ToolButton onClick={() => handleProcessImage('resize', { width: resizeWidth, height: resizeHeight, interpolation })}>
            Resize
          </ToolButton>

          <div className="grid grid-cols-2 gap-3">
            <NumberInput label="Move X" value={translateX} onChange={setTranslateX} />
            <NumberInput label="Move Y" value={translateY} onChange={setTranslateY} />
          </div>
          <ToolButton onClick={() => handleProcessImage('translate', { dx: translateX, dy: translateY, interpolation })}>
            Translate
          </ToolButton>

          {/* Interactive Crop */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Crop</span>
              {cropSelection && (
                <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg">
                  {Math.round(cropSelection.w)} × {Math.round(cropSelection.h)}px
                </span>
              )}
            </div>
            {!cropMode ? (
              <button
                type="button"
                onClick={() => { setCropMode(true); setCropSelection(null) }}
                disabled={isProcessing || !selectedFile}
                className={`${toolButton} flex items-center justify-center gap-2`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M3 7h4M17 3v4M21 7h-4M7 21v-4M3 17h4M17 21v-4M21 17h-4M9 9h6v6H9z" />
                </svg>
                Select Crop Area
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 leading-relaxed">
                  🖱️ Drag di gambar <strong>Before</strong> untuk memilih area crop.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={!cropSelection || cropSelection.w < 5}
                    className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40`}
                  >
                    Apply Crop
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCropMode(false); setCropSelection(null) }}
                    className={`${buttonBase} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'edge') {
      return (
        <Panel
          title="Binary & Edge Processing"
          description="Deteksi tepi, thresholding, dan morfologi citra."
        >
          <Slider label="Threshold" value={thresholdValue} min="0" max="255" onChange={setThresholdValue} />
          <ToolButton onClick={() => handleProcessImage('threshold', { threshold_value: thresholdValue })}>
            Binary Threshold
          </ToolButton>

          <div className="grid grid-cols-2 gap-3">
            <Slider label="Canny Low" value={cannyLow} min="0" max="255" onChange={setCannyLow} />
            <Slider label="Canny High" value={cannyHigh} min="0" max="255" onChange={setCannyHigh} />
          </div>
          <ToolButton onClick={() => handleProcessImage('canny', { canny_low: cannyLow, canny_high: cannyHigh })}>
            Canny Edge
          </ToolButton>

          <div className="grid grid-cols-2 gap-3">
            <ToolButton onClick={() => handleProcessImage('sobel')}>Sobel</ToolButton>
            <ToolButton onClick={() => handleProcessImage('prewitt')}>Prewitt</ToolButton>
            <ToolButton onClick={() => handleProcessImage('robert')}>Robert</ToolButton>
            <ToolButton onClick={() => handleProcessImage('laplacian')}>Laplacian</ToolButton>
          </div>

          <ToolButton onClick={() => handleProcessImage('log', { blur_kernel: blurKernel })}>
            Laplacian of Gaussian
          </ToolButton>

          <Slider label="Morphology Kernel" value={morphologyKernel} min="3" max="15" step="2" onChange={setMorphologyKernel} />
          <div className="grid grid-cols-2 gap-3">
            <ToolButton onClick={() => handleProcessImage('erosion', { morphology_kernel: morphologyKernel, threshold_value: thresholdValue })}>
              Erosion
            </ToolButton>
            <ToolButton onClick={() => handleProcessImage('dilation', { morphology_kernel: morphologyKernel, threshold_value: thresholdValue })}>
              Dilation
            </ToolButton>
          </div>
        </Panel>
      )
    }

    if (activeGroup === 'color') {
      return (
        <Panel
          title="Color Processing"
          description="Kelola grayscale, RGB channel, hue, dan saturation."
        >
          <div className="grid grid-cols-2 gap-3">
            <ToolButton onClick={() => handleProcessImage('grayscale')}>Grayscale</ToolButton>
            <ToolButton onClick={() => handleProcessImage('invert')}>Invert</ToolButton>
          </div>

          <SelectInput label="Channel" value={channel} onChange={setChannel}>
            <option value="red">Red Channel</option>
            <option value="green">Green Channel</option>
            <option value="blue">Blue Channel</option>
          </SelectInput>

          <ToolButton onClick={() => handleProcessImage('channel_split', { channel })}>
            Show Selected Channel
          </ToolButton>

          <Slider label="Hue Shift" value={hueShift} min="-90" max="90" onChange={setHueShift} />
          <Slider label="Saturation" value={saturationValue} min="-100" max="100" onChange={setSaturationValue} />

          <ToolButton onClick={() => handleProcessImage('hue_saturation', { hue_shift: hueShift, saturation_value: saturationValue })}>
            Apply Hue & Saturation
          </ToolButton>
        </Panel>
      )
    }

    if (activeGroup === 'segmentation') {
      return (
        <Panel
          title="Image Segmentation"
          description="Pisahkan region gambar menggunakan threshold, edge, atau clustering."
        >
          <Slider label="Threshold" value={thresholdValue} min="0" max="255" onChange={setThresholdValue} />
          <ToolButton onClick={() => handleProcessImage('segmentation_threshold', { threshold_value: thresholdValue })}>
            Threshold Segmentation
          </ToolButton>

          <ToolButton onClick={() => handleProcessImage('segmentation_edge')}>
            Edge Segmentation
          </ToolButton>

          <Slider label="K-Means Cluster" value={clusterCount} min="2" max="8" onChange={setClusterCount} />
          <ToolButton onClick={() => handleProcessImage('segmentation_region', { cluster_count: clusterCount })}>
            Region Segmentation
          </ToolButton>
        </Panel>
      )
    }

    if (activeGroup === 'compression') {
      return (
        <Panel
          title="Image Compression"
          description="Simulasi kompresi JPEG, kuantisasi, dan RLE preview."
        >
          <Slider label="JPEG Quality" value={jpegQuality} min="1" max="100" onChange={setJpegQuality} />
          <ToolButton onClick={() => handleProcessImage('jpeg_compress', { jpeg_quality: jpegQuality })}>
            JPEG Compression
          </ToolButton>

          <Slider label="Quantization Levels" value={quantizationLevels} min="2" max="32" onChange={setQuantizationLevels} />
          <ToolButton onClick={() => handleProcessImage('quantization', { quantization_levels: quantizationLevels })}>
            Quantization
          </ToolButton>

          <ToolButton onClick={() => handleProcessImage('rle_preview')}>
            RLE Visual Preview
          </ToolButton>
        </Panel>
      )
    }

    return (
      <Panel
        title="Histogram & CNN"
        description="Analisis distribusi intensitas piksel dan pengenalan objek pretrained CNN."
      >
        <ToolButton onClick={() => handleVisualHistogram('histogram_rgb')}>
          Show RGB Histogram
        </ToolButton>

        <ToolButton onClick={() => handleVisualHistogram('histogram_gray')}>
          Show Grayscale Histogram
        </ToolButton>

        <ToolButton onClick={() => handleCompareHistogram('rgb')}>
          Compare RGB Histogram
        </ToolButton>

        <ToolButton onClick={handleCnnRecognize}>
          Run CNN Recognition
        </ToolButton>

        {histogramData && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold text-slate-900">Histogram Summary</h3>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {histogramData.original && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-800">Before</p>
                  <p className="text-slate-500">Size: {histogramData.original.width} × {histogramData.original.height}</p>
                  <p className="text-slate-500">Mean: {histogramData.original.gray_mean}</p>
                  <p className="text-slate-500">Std: {histogramData.original.gray_std}</p>
                </div>
              )}
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="font-semibold text-slate-800">Current</p>
                <p className="text-slate-500">Size: {histogramData.current.width} × {histogramData.current.height}</p>
                <p className="text-slate-500">Mean: {histogramData.current.gray_mean}</p>
                <p className="text-slate-500">Std: {histogramData.current.gray_std}</p>
              </div>
            </div>
          </div>
        )}

        {cnnResult && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold text-slate-900">CNN Result</h3>
            <p className="mt-2 text-sm text-slate-500">
              Prediksi utama:
              <span className="ml-1 font-bold text-blue-700">
                {cnnResult.label} ({cnnResult.confidence}%)
              </span>
            </p>
            <div className="mt-3 space-y-2">
              {cnnResult.top_predictions?.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>{index + 1}. {item.label}</span>
                  <span className="font-bold text-blue-700">{item.confidence}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Panel>
    )
  }

  const cropContainerRef = useRef(null)

  const PreviewBox = ({ title, badge, image, empty, isCropTarget }) => (
    <div className="flex min-h-[390px] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <div className="flex items-center gap-2">
          {isCropTarget && cropMode && (
            <span className="animate-pulse rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
              ✂️ Drag to crop
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
            {badge}
          </span>
        </div>
      </div>
      <div
        ref={isCropTarget ? cropContainerRef : undefined}
        className={`relative flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(45deg,#f1f5f9_25%,transparent_25%),linear-gradient(-45deg,#f1f5f9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f1f5f9_75%),linear-gradient(-45deg,transparent_75%,#f1f5f9_75%)] bg-[length:22px_22px] bg-[position:0_0,0_11px,11px_-11px,-11px_0px] ${isCropTarget && cropMode ? 'cursor-crosshair' : ''}`}
        onMouseDown={isCropTarget ? handleCropMouseDown : undefined}
        onMouseMove={isCropTarget ? handleCropMouseMove : undefined}
        onMouseUp={isCropTarget ? handleCropMouseUp : undefined}
        onMouseLeave={isCropTarget ? handleCropMouseUp : undefined}
      >
        {image ? (
          <>
            <img
              ref={isCropTarget ? cropImageRef : undefined}
              src={image}
              alt={title}
              className="max-h-[560px] max-w-full object-contain select-none"
              draggable={false}
            />
            {isCropTarget && cropMode && cropSelection && cropSelection.w > 2 && cropSelection.h > 2 && (
              <div
                className="pointer-events-none absolute border-2 border-blue-500"
                style={{
                  left: cropSelection.x,
                  top: cropSelection.y,
                  width: cropSelection.w,
                  height: cropSelection.h,
                  background: 'rgba(59,130,246,0.10)',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                }}
              >
                {[['top-0 left-0','-translate-x-1/2 -translate-y-1/2'],['top-0 right-0','translate-x-1/2 -translate-y-1/2'],['bottom-0 left-0','-translate-x-1/2 translate-y-1/2'],['bottom-0 right-0','translate-x-1/2 translate-y-1/2']].map(([pos, tr], i) => (
                  <div key={i} className={`absolute ${pos} h-3 w-3 rounded-full bg-blue-500 border-2 border-white transform ${tr}`} />
                ))}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow">
                  {Math.round(cropSelection.w)} × {Math.round(cropSelection.h)}
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="px-6 text-center text-sm text-slate-400">{empty}</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Editor Berkelas
            </h1>
            <p className="text-sm text-slate-500">
              Editor Berkelas untuk semua kebutuhan pengolahan citra digital.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={primaryButton}
            >
              Upload
            </button>

            <button
              type="button"
              onClick={handleSaveImage}
              disabled={!originalImage}
              className={outlineButton}
            >
              Save
            </button>

            <button
              type="button"
              onClick={handleResetImage}
              disabled={!originalImage}
              className={outlineButton}
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-5 p-5 lg:grid-cols-[270px_minmax(0,1fr)_390px]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Tools</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Feature Menu</h2>
          </div>

          <div className="space-y-2">
            {groups.map((group) => (
              <button
                type="button"
                key={group.id}
                onClick={() => setActiveGroup(group.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  activeGroup === group.id
                    ? 'border-blue-600 bg-blue-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg">
                    {group.icon}
                  </span>
                  <div>
                    <p className={`font-bold ${activeGroup === group.id ? 'text-blue-700' : 'text-slate-800'}`}>
                      {group.title}
                    </p>
                    <p className="text-xs text-slate-500">{group.subtitle}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Preview</p>
                <p className="text-sm text-slate-500">Pilih mode tampilan gambar.</p>
              </div>

              <div className="flex rounded-2xl bg-slate-100 p-1">
                {['split', 'before', 'after'].map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold capitalize transition ${
                      previewMode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {previewMode === 'split' && (
            <div className="grid gap-5 xl:grid-cols-2">
              <PreviewBox
                title="Before"
                badge="Original"
                image={originalImage}
                empty="Upload gambar untuk melihat preview awal."
                isCropTarget={true}
              />
              <PreviewBox
                title="After"
                badge="Processed"
                image={processedImage}
                empty={isProcessing ? 'Sedang memproses gambar...' : 'Hasil edit akan muncul di sini.'}
              />
            </div>
          )}

          {previewMode === 'before' && (
            <PreviewBox
              title="Before"
              badge="Original"
              image={originalImage}
              empty="Upload gambar untuk melihat preview awal."
              isCropTarget={true}
            />
          )}

          {previewMode === 'after' && (
            <PreviewBox
              title="After"
              badge="Processed"
              image={processedImage}
              empty={isProcessing ? 'Sedang memproses gambar...' : 'Hasil edit akan muncul di sini.'}
            />
          )}

          <div className={`rounded-3xl border p-4 shadow-sm ${
            status.startsWith('Error')
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-slate-200 bg-white text-slate-600'
          }`}>
            <p className="text-sm">
              <span className="font-bold">Status:</span> {status}
            </p>
          </div>
        </section>

        <aside>{renderPanel()}</aside>
      </main>
    </div>
  )
}

export default App