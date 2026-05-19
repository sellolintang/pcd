import { useState } from 'react'

function App() {
  const [originalImage, setOriginalImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [status, setStatus] = useState('No image loaded')
  const [activeMenu, setActiveMenu] = useState(null)

  const menuItems = {
    File: [
      'New Project',
      'Open Image',
      'Save Image',
      'Export Image',
      'Reset Image'
    ],
    Edit: [
      'Undo',
      'Redo',
      'Crop',
      'Resize'
    ],
    Filter: [
      'Brightness & Contrast',
      'Gaussian Blur',
      'Median Filter',
      'Sharpen',
      'Noise Reduction'
    ],
    Transform: [
      'Rotate',
      'Flip Horizontal',
      'Flip Vertical',
      'Translate'
    ],
    Tools: [
      'Histogram',
      'Segmentation',
      'Compression',
      'Color Adjustment',
      'CNN Object Recognition'
    ]
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]

    if (!file) return

    const imageUrl = URL.createObjectURL(file)

    setSelectedFile(file)
    setOriginalImage(imageUrl)
    setProcessedImage(null)
    setStatus(`Image loaded: ${file.name}`)
  }

  const handleProcessImage = async (operation) => {
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
      setStatus(`Image processed successfully: ${operation}`)
    } catch (error) {
      console.error(error)
      setStatus(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResetImage = () => {
    setProcessedImage(null)
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

  const handleUnsupportedFeature = (featureName) => {
    setStatus(`${featureName} feature is not available in backend yet`)
  }

  const handleMenuClick = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName)
  }

  const handleMenuItemClick = (menuName, itemName) => {
    if (itemName === 'Reset Image') {
      handleResetImage()
    } else if (itemName === 'Save Image' || itemName === 'Export Image') {
      handleSaveImage()
    } else {
      setStatus(`${menuName} > ${itemName} selected`)
    }

    setActiveMenu(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header / Taskbar */}
      <header className="h-20 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-8 shadow-lg relative z-50">
        {/* Logo and App Title */}
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xl shadow-md">
            SS
          </div>

          <div>
            <h1 className="font-bold text-xl leading-tight">
              Editor Berkelas
            </h1>
            <p className="text-xs text-slate-400">
              Digital Image Processing Editor
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex items-center gap-2 text-sm text-slate-300">
          {Object.keys(menuItems).map((menuName) => (
            <div key={menuName} className="relative">
              <button
                onClick={() => handleMenuClick(menuName)}
                className={`px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeMenu === menuName
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                {menuName}
              </button>

              {activeMenu === menuName && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
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
      </header>

      {/* Main Layout */}
      <main className="flex flex-1">
        {/* Left Sidebar */}
        <aside className="w-72 bg-slate-900 border-r border-slate-700 p-4 space-y-5">
          <div>
            <h2 className="font-semibold mb-3">Image Management</h2>

            <label className="block">
              <span className="text-sm text-slate-300">Upload Image</span>
              <input
                type="file"
                accept="image/png, image/jpeg, image/bmp"
                onChange={handleImageUpload}
                className="mt-2 block w-full text-sm text-slate-300 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white hover:file:bg-blue-700"
              />
            </label>
          </div>

          <div>
            <h2 className="font-semibold mb-3">Enhancement</h2>

            <label className="block mb-4">
              <span className="text-sm text-slate-300">Brightness</span>
              <input
                type="range"
                min="-100"
                max="100"
                defaultValue="0"
                className="w-full"
              />
            </label>

            <label className="block mb-4">
              <span className="text-sm text-slate-300">Contrast</span>
              <input
                type="range"
                min="-100"
                max="100"
                defaultValue="0"
                className="w-full"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleProcessImage('blur')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Blur
              </button>

              <button
                onClick={() => handleUnsupportedFeature('Sharpen')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sharpen
              </button>

              <button
                onClick={() => handleProcessImage('grayscale')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Grayscale
              </button>

              <button
                onClick={handleResetImage}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>

              <button
                onClick={() => handleProcessImage('invert')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Invert
              </button>

              <button
                onClick={() => handleProcessImage('brightness')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Brightness
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-3">Transform</h2>

            <label className="block mb-4">
              <span className="text-sm text-slate-300">Rotate</span>
              <input
                type="range"
                min="0"
                max="360"
                defaultValue="0"
                className="w-full"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleUnsupportedFeature('Flip Horizontal')}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm"
              >
                Flip H
              </button>

              <button
                onClick={() => handleUnsupportedFeature('Flip Vertical')}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm"
              >
                Flip V
              </button>
            </div>
          </div>
        </aside>

        {/* Workspace */}
        <section className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Before Panel */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col">
              <h2 className="font-semibold mb-4">Before</h2>

              <div className="flex-1 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                {originalImage ? (
                  <img
                    src={originalImage}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-slate-400">Upload image first</p>
                )}
              </div>
            </div>

            {/* After Panel */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col">
              <h2 className="font-semibold mb-4">After</h2>

              <div className="flex-1 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                {processedImage ? (
                  <img
                    src={processedImage}
                    alt="Processed"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <p className="text-slate-400">
                    {isProcessing
                      ? 'Processing image...'
                      : 'Processed image will appear here'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="w-80 bg-slate-900 border-l border-slate-700 p-4 space-y-5">
          <div>
            <h2 className="font-semibold mb-3">Edge & Binary</h2>

            <label className="block mb-4">
              <span className="text-sm text-slate-300">Threshold</span>
              <input
                type="range"
                min="0"
                max="255"
                defaultValue="127"
                className="w-full"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleProcessImage('canny')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Canny
              </button>

              <button
                onClick={() => handleUnsupportedFeature('Sobel')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sobel
              </button>

              <button
                onClick={() => handleUnsupportedFeature('Prewitt')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prewitt
              </button>

              <button
                onClick={() => handleUnsupportedFeature('Laplacian')}
                disabled={isProcessing}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Laplacian
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-3">Advanced Tools</h2>

            <div className="space-y-2">
              <button
                onClick={() => handleUnsupportedFeature('Histogram')}
                className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm"
              >
                Show Histogram
              </button>

              <button
                onClick={() => handleUnsupportedFeature('Segmentation')}
                className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm"
              >
                Segmentation
              </button>

              <button
                onClick={() => handleUnsupportedFeature('Compression')}
                className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm"
              >
                Compression
              </button>

              <button
                onClick={handleSaveImage}
                className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md text-sm"
              >
                Save Image
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-slate-900 border-t border-slate-700 flex items-center px-6 text-sm text-slate-300">
        Status: {status}
      </footer>
    </div>
  )
}

export default App