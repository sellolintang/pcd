import { useState } from 'react'

function App() {
  const [originalImage, setOriginalImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [status, setStatus] = useState('No image loaded')

  const handleImageUpload = (event) => {
    const file = event.target.files[0]

    if (!file) return

    const imageUrl = URL.createObjectURL(file)
    setOriginalImage(imageUrl)
    setProcessedImage(null)
    setStatus(`Image loaded: ${file.name}`)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-6">
        <div className="font-bold text-lg">
          Mini Photoshop Web
        </div>

        <nav className="flex gap-6 text-sm text-slate-300">
          <button className="hover:text-white">File</button>
          <button className="hover:text-white">Edit</button>
          <button className="hover:text-white">Filter</button>
          <button className="hover:text-white">Transform</button>
          <button className="hover:text-white">Tools</button>
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
              <input type="range" min="-100" max="100" defaultValue="0" className="w-full" />
            </label>

            <label className="block mb-4">
              <span className="text-sm text-slate-300">Contrast</span>
              <input type="range" min="-100" max="100" defaultValue="0" className="w-full" />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Blur
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Sharpen
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Grayscale
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Reset
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-3">Transform</h2>

            <label className="block mb-4">
              <span className="text-sm text-slate-300">Rotate</span>
              <input type="range" min="0" max="360" defaultValue="0" className="w-full" />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Flip H
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Flip V
              </button>
            </div>
          </div>
        </aside>

        {/* Workspace */}
        <section className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col">
              <h2 className="font-semibold mb-4">Before</h2>

              <div className="flex-1 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                {originalImage ? (
                  <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
                ) : (
                  <p className="text-slate-400">Upload image first</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col">
              <h2 className="font-semibold mb-4">After</h2>

              <div className="flex-1 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                {processedImage ? (
                  <img src={processedImage} alt="Processed" className="max-w-full max-h-full object-contain" />
                ) : (
                  <p className="text-slate-400">Processed image will appear here</p>
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
              <input type="range" min="0" max="255" defaultValue="127" className="w-full" />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Canny
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Sobel
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Prewitt
              </button>
              <button className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Laplacian
              </button>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-3">Advanced Tools</h2>

            <div className="space-y-2">
              <button className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Show Histogram
              </button>
              <button className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Segmentation
              </button>
              <button className="w-full bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-md text-sm">
                Compression
              </button>
              <button className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-md text-sm">
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