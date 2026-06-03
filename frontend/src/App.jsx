import { useState } from 'react'

function App() {
  const [originalImage, setOriginalImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState('No image loaded')
  const [activeMenu, setActiveMenu] = useState(null)

  // A. Enhancement
  const [brightnessValue, setBrightnessValue] = useState(0)
  const [contrastValue, setContrastValue] = useState(0)
  const [blurKernel, setBlurKernel] = useState(15)
  const [sharpenStrength, setSharpenStrength] = useState(1)

  // C. Restoration
  const [medianKernel, setMedianKernel] = useState(5)
  const [noiseKernel, setNoiseKernel] = useState(5)

  // B. Geometric Transformation
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

  // D. Binary & Edge
  const [thresholdValue, setThresholdValue] = useState(127)
  const [cannyLow, setCannyLow] = useState(100)
  const [cannyHigh, setCannyHigh] = useState(200)
  const [morphKernel, setMorphKernel] = useState(3)
  const [morphIterations, setMorphIterations] = useState(1)

  // E. Color
  const [channel, setChannel] = useState('r')
  const [hueValue, setHueValue] = useState(0)
  const [saturationValue, setSaturationValue] = useState(0)

  // F. Segmentation
  const [segmentK, setSegmentK] = useState(3)

  // G. Compression
  const [jpegQuality, setJpegQuality] = useState(70)
  const [quantizationLevel, setQuantizationLevel] = useState(32)

  // H. Histogram
  const [histogramMode, setHistogramMode] = useState('rgb')

  const menuItems = {
    File: ['Open Image', 'Save Image', 'Reset Image'],
    Edit: ['Crop', 'Resize'],
    Filter: ['Brightness & Contrast', 'Gaussian Blur', 'Median Filter', 'Sharpen'],
    Transform: ['Rotate', 'Flip Horizontal', 'Flip Vertical', 'Translate'],
    Tools: ['Histogram', 'Segmentation', 'Compression', 'Color Adjustment', 'CNN Object Recognition']
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const imageUrl = URL.createObjectURL(file)
    setOriginalFile(file)
    setSelectedFile(file)
    setOriginalImage(imageUrl)
    setProcessedImage(null)
    setStatus(`Image loaded: ${file.name}`)
    event.target.value = ''
  }

  const handleProcessImage = async (operation, params = {}, useAsCurrentImage = true) => {
    if (!selectedFile) {
      setStatus('Please upload an image first')
      return
    }

    try {
      setIsProcessing(true)
      setStatus(`Processing image with ${operation}...`)

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
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to process image')
      }

      const blob = await response.blob()
      const processedImageUrl = URL.createObjectURL(blob)
      setProcessedImage(processedImageUrl)

      if (useAsCurrentImage) {
        const newFile = new File([blob], 'processed-image.jpg', {
          type: blob.type || 'image/jpeg'
        })
        setSelectedFile(newFile)
      }

      setStatus(`Image processed successfully: ${operation}`)
    } catch (error) {
      console.error(error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCompareHistogram = async () => {
    if (!originalFile || !selectedFile) {
      setStatus('Please upload and process an image first')
      return
    }

    try {
      setIsProcessing(true)
      setStatus('Generating before-after histogram...')

      const formData = new FormData()
      formData.append('original_file', originalFile)
      formData.append('processed_file', selectedFile)
      formData.append('histogram_mode', histogramMode)

      const response = await fetch('/api/histogram/compare', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Failed to generate histogram')
      }

      const blob = await response.blob()
      setProcessedImage(URL.createObjectURL(blob))
      setStatus('Before-after histogram generated successfully')
    } catch (error) {
      console.error(error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCnnRecognize = async () => {
    if (!selectedFile) {
      setStatus('Please upload an image first')
      return
    }

    try {
      setIsProcessing(true)
      setStatus('Running CNN object recognition...')

      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/cnn/recognize', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!data.success) {
        setStatus(data.message)
        return
      }

      const predictions = data.top_predictions
        .map((item) => `${item.label} (${item.confidence}%)`)
        .join(', ')

      setStatus(`CNN prediction: ${predictions}`)
    } catch (error) {
      console.error(error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResetImage = () => {
    setProcessedImage(null)
    if (originalFile) {
      setSelectedFile(originalFile)
    }
    setStatus('Processed image has been reset')
  }

  const handleSaveImage = () => {
    if (!processedImage) {
      setStatus('No processed image to save')
      return
    }

    const link = document.createElement('a')
    link.href = processedImage
    link.download = 'processed-image.jpg'
    link.click()
    setStatus('Processed image saved')
  }

  const handleMenuClick = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName)
  }

  const handleMenuItemClick = (menuName, itemName) => {
    if (itemName === 'Reset Image') {
      handleResetImage()
    } else if (itemName === 'Save Image') {
      handleSaveImage()
    } else {
      setStatus(`${menuName} > ${itemName} selected`)
    }
    setActiveMenu(null)
  }

  const buttonClass = 'w-full mb-3 bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed'
  const inputClass = 'bg-slate-800 border border-slate-700 rounded-md px-2 py-2 text-sm w-full'

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Editor Berkelas</h1>
            <p className="text-sm text-slate-400">Digital Image Processing Editor</p>
          </div>

          <nav className="flex gap-2 relative">
            {Object.keys(menuItems).map((menuName) => (
              <div key={menuName} className="relative">
                <button
                  onClick={() => handleMenuClick(menuName)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    activeMenu === menuName ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {menuName}
                </button>

                {activeMenu === menuName && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50">
                    {menuItems[menuName].map((itemName) => (
                      <button
                        key={itemName}
                        onClick={() => handleMenuItemClick(menuName, itemName)}
                        className="block w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-blue-600 hover:text-white transition-colors"
                      >
                        {itemName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-4 p-4">
        <aside className="col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 max-h-[78vh] overflow-y-auto">
          <section>
            <h2 className="font-semibold mb-3">Image Management</h2>
            <label className="block w-full mb-3 bg-blue-600 hover:bg-blue-500 text-center px-3 py-2 rounded-md text-sm cursor-pointer">
              Upload Image
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            <button onClick={handleSaveImage} disabled={!processedImage} className={buttonClass}>Save Image</button>
            <button onClick={handleResetImage} className={buttonClass}>Reset</button>
          </section>

          <section className="mt-6">
            <h2 className="font-semibold mb-3">A. Enhancement</h2>
            <label className="block mb-4 text-sm text-slate-300">
              Brightness: {brightnessValue}
              <input type="range" min="-100" max="100" value={brightnessValue} onChange={(e) => setBrightnessValue(e.target.value)} className="w-full" />
            </label>
            <label className="block mb-4 text-sm text-slate-300">
              Contrast: {contrastValue}
              <input type="range" min="-100" max="100" value={contrastValue} onChange={(e) => setContrastValue(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('brightness_contrast', { brightness_value: brightnessValue, contrast_value: contrastValue })} disabled={isProcessing} className={buttonClass}>Apply Brightness & Contrast</button>

            <label className="block mb-4 text-sm text-slate-300">
              Blur Kernel: {blurKernel}
              <input type="range" min="1" max="31" step="2" value={blurKernel} onChange={(e) => setBlurKernel(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('blur', { blur_kernel: blurKernel })} disabled={isProcessing} className={buttonClass}>Gaussian Blur</button>

            <label className="block mb-4 text-sm text-slate-300">
              Sharpen Strength: {sharpenStrength}
              <input type="range" min="0" max="3" step="0.1" value={sharpenStrength} onChange={(e) => setSharpenStrength(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('sharpen', { sharpen_strength: sharpenStrength })} disabled={isProcessing} className={buttonClass}>Sharpen</button>
            <button onClick={() => handleProcessImage('histogram_equalization')} disabled={isProcessing} className={buttonClass}>Histogram Equalization</button>
          </section>

          <section className="mt-6">
            <h2 className="font-semibold mb-3">C. Restoration</h2>
            <label className="block mb-4 text-sm text-slate-300">
              Median Kernel: {medianKernel}
              <input type="range" min="3" max="15" step="2" value={medianKernel} onChange={(e) => setMedianKernel(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('median_filter', { median_kernel: medianKernel })} disabled={isProcessing} className={buttonClass}>Median Filter</button>

            <label className="block mb-4 text-sm text-slate-300">
              Salt & Pepper Kernel: {noiseKernel}
              <input type="range" min="3" max="15" step="2" value={noiseKernel} onChange={(e) => setNoiseKernel(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('salt_pepper_removal', { noise_kernel: noiseKernel })} disabled={isProcessing} className={buttonClass}>Salt & Pepper Removal</button>
          </section>

          <section className="mt-6">
            <h2 className="font-semibold mb-3">B. Transform</h2>
            <label className="block mb-4 text-sm text-slate-300">
              Interpolation
              <select value={interpolation} onChange={(e) => setInterpolation(e.target.value)} className={`${inputClass} mt-2`}>
                <option value="bilinear">Bilinear</option>
                <option value="nearest">Nearest</option>
              </select>
            </label>

            <label className="block mb-4 text-sm text-slate-300">
              Rotate: {rotateAngle}°
              <input type="range" min="0" max="360" value={rotateAngle} onChange={(e) => setRotateAngle(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('rotate', { angle: rotateAngle, interpolation })} disabled={isProcessing} className={buttonClass}>Apply Rotate</button>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={() => handleProcessImage('flip_horizontal')} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Flip H</button>
              <button onClick={() => handleProcessImage('flip_vertical')} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Flip V</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="number" value={resizeWidth} onChange={(e) => setResizeWidth(e.target.value)} placeholder="Width" className={inputClass} />
              <input type="number" value={resizeHeight} onChange={(e) => setResizeHeight(e.target.value)} placeholder="Height" className={inputClass} />
            </div>
            <button onClick={() => handleProcessImage('resize', { width: resizeWidth, height: resizeHeight, interpolation })} disabled={isProcessing} className={buttonClass}>Apply Resize</button>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="number" value={translateX} onChange={(e) => setTranslateX(e.target.value)} placeholder="dx" className={inputClass} />
              <input type="number" value={translateY} onChange={(e) => setTranslateY(e.target.value)} placeholder="dy" className={inputClass} />
            </div>
            <button onClick={() => handleProcessImage('translate', { dx: translateX, dy: translateY, interpolation })} disabled={isProcessing} className={buttonClass}>Apply Translate</button>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="number" value={cropX} onChange={(e) => setCropX(e.target.value)} placeholder="X" className={inputClass} />
              <input type="number" value={cropY} onChange={(e) => setCropY(e.target.value)} placeholder="Y" className={inputClass} />
              <input type="number" value={cropW} onChange={(e) => setCropW(e.target.value)} placeholder="W" className={inputClass} />
              <input type="number" value={cropH} onChange={(e) => setCropH(e.target.value)} placeholder="H" className={inputClass} />
            </div>
            <button onClick={() => handleProcessImage('crop', { crop_x: cropX, crop_y: cropY, crop_w: cropW, crop_h: cropH })} disabled={isProcessing} className={buttonClass}>Apply Crop</button>
          </section>
        </aside>

        <section className="col-span-6 grid grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">Before</h2>
            <div className="bg-slate-950 rounded-lg min-h-[65vh] flex items-center justify-center overflow-hidden">
              {originalImage ? (
                <img src={originalImage} alt="Original" className="max-w-full max-h-[65vh] object-contain" />
              ) : (
                <p className="text-slate-500">Upload image first</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h2 className="font-semibold mb-3">After</h2>
            <div className="bg-slate-950 rounded-lg min-h-[65vh] flex items-center justify-center overflow-hidden">
              {processedImage ? (
                <img src={processedImage} alt="Processed" className="max-w-full max-h-[65vh] object-contain" />
              ) : (
                <p className="text-slate-500">{isProcessing ? 'Processing image...' : 'Processed image will appear here'}</p>
              )}
            </div>
          </div>
        </section>

        <aside className="col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 max-h-[78vh] overflow-y-auto">
          <section>
            <h2 className="font-semibold mb-3">D. Edge & Binary</h2>
            <label className="block mb-4 text-sm text-slate-300">
              Threshold: {thresholdValue}
              <input type="range" min="0" max="255" value={thresholdValue} onChange={(e) => setThresholdValue(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('threshold', { threshold_value: thresholdValue })} disabled={isProcessing} className={buttonClass}>Threshold</button>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input type="number" value={cannyLow} onChange={(e) => setCannyLow(e.target.value)} placeholder="Canny Low" className={inputClass} />
              <input type="number" value={cannyHigh} onChange={(e) => setCannyHigh(e.target.value)} placeholder="Canny High" className={inputClass} />
            </div>
            <button onClick={() => handleProcessImage('canny', { canny_low: cannyLow, canny_high: cannyHigh })} disabled={isProcessing} className={buttonClass}>Canny</button>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleProcessImage('sobel')} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Sobel</button>
              <button onClick={() => handleProcessImage('prewitt')} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Prewitt</button>
              <button onClick={() => handleProcessImage('robert')} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Robert</button>
              <button onClick={() => handleProcessImage('laplacian')} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Laplacian</button>
            </div>
            <button onClick={() => handleProcessImage('log', { blur_kernel: blurKernel })} disabled={isProcessing} className={`${buttonClass} mt-3`}>Laplacian of Gaussian</button>

            <label className="block mb-4 text-sm text-slate-300">
              Morph Kernel: {morphKernel}
              <input type="range" min="3" max="15" step="2" value={morphKernel} onChange={(e) => setMorphKernel(e.target.value)} className="w-full" />
            </label>
            <label className="block mb-4 text-sm text-slate-300">
              Iterations: {morphIterations}
              <input type="range" min="1" max="5" value={morphIterations} onChange={(e) => setMorphIterations(e.target.value)} className="w-full" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleProcessImage('erosion', { morph_kernel: morphKernel, morph_iterations: morphIterations })} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Erosion</button>
              <button onClick={() => handleProcessImage('dilation', { morph_kernel: morphKernel, morph_iterations: morphIterations })} disabled={isProcessing} className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50">Dilation</button>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="font-semibold mb-3">E. Color Processing</h2>
            <button onClick={() => handleProcessImage('grayscale')} disabled={isProcessing} className={buttonClass}>RGB to Grayscale</button>
            <button onClick={() => handleProcessImage('invert')} disabled={isProcessing} className={buttonClass}>Invert Color</button>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${inputClass} mb-3`}>
              <option value="r">Red Channel</option>
              <option value="g">Green Channel</option>
              <option value="b">Blue Channel</option>
            </select>
            <button onClick={() => handleProcessImage('channel_split', { channel })} disabled={isProcessing} className={buttonClass}>Split Channel</button>

            <label className="block mb-4 text-sm text-slate-300">
              Hue: {hueValue}
              <input type="range" min="-90" max="90" value={hueValue} onChange={(e) => setHueValue(e.target.value)} className="w-full" />
            </label>
            <label className="block mb-4 text-sm text-slate-300">
              Saturation: {saturationValue}
              <input type="range" min="-100" max="100" value={saturationValue} onChange={(e) => setSaturationValue(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('hue_saturation', { hue_value: hueValue, saturation_value: saturationValue })} disabled={isProcessing} className={buttonClass}>Apply Hue/Saturation</button>
          </section>

          <section className="mt-6">
            <h2 className="font-semibold mb-3">F. Segmentation</h2>
            <button onClick={() => handleProcessImage('threshold_segmentation', { threshold_value: thresholdValue })} disabled={isProcessing} className={buttonClass}>Threshold Segmentation</button>
            <button onClick={() => handleProcessImage('edge_segmentation', { canny_low: cannyLow, canny_high: cannyHigh })} disabled={isProcessing} className={buttonClass}>Edge Segmentation</button>
            <label className="block mb-4 text-sm text-slate-300">
              Region K: {segmentK}
              <input type="range" min="2" max="8" value={segmentK} onChange={(e) => setSegmentK(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('region_segmentation', { segment_k: segmentK })} disabled={isProcessing} className={buttonClass}>Region/K-Means Segmentation</button>
          </section>

          <section className="mt-6">
            <h2 className="font-semibold mb-3">G. Compression</h2>
            <label className="block mb-4 text-sm text-slate-300">
              JPEG Quality: {jpegQuality}
              <input type="range" min="1" max="100" value={jpegQuality} onChange={(e) => setJpegQuality(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('jpeg_compression', { jpeg_quality: jpegQuality })} disabled={isProcessing} className={buttonClass}>JPEG Compression</button>

            <label className="block mb-4 text-sm text-slate-300">
              Quantization Level: {quantizationLevel}
              <input type="range" min="2" max="128" value={quantizationLevel} onChange={(e) => setQuantizationLevel(e.target.value)} className="w-full" />
            </label>
            <button onClick={() => handleProcessImage('quantization', { quantization_level: quantizationLevel })} disabled={isProcessing} className={buttonClass}>Quantization</button>
            <button onClick={() => handleProcessImage('rle_preview')} disabled={isProcessing} className={buttonClass}>RLE Visual Preview</button>
          </section>

          <section className="mt-6">
            <h2 className="font-semibold mb-3">H. Histogram</h2>
            <select value={histogramMode} onChange={(e) => setHistogramMode(e.target.value)} className={`${inputClass} mb-3`}>
              <option value="rgb">RGB Histogram</option>
              <option value="gray">Grayscale Histogram</option>
            </select>
            <button onClick={() => handleProcessImage(histogramMode === 'rgb' ? 'histogram_rgb' : 'histogram_gray', {}, false)} disabled={isProcessing} className={buttonClass}>Show Histogram</button>
            <button onClick={handleCompareHistogram} disabled={isProcessing} className={buttonClass}>Compare Before-After Histogram</button>
          </section>

          <section className="mt-6">
            <h2 className="font-semibold mb-3">J. CNN Object Recognition</h2>
            <button onClick={handleCnnRecognize} disabled={isProcessing} className={buttonClass}>Run CNN Recognition</button>
          </section>
        </aside>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-3 text-sm text-slate-300">
        Status: {status}
      </footer>
    </div>
  )
}

export default App
