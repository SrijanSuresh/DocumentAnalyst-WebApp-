"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Upload, X } from "lucide-react"

export default function DocumentUpload() {
    const [isOpen, setIsOpen] = useState(false)
    const [file, setFile] = useState(null)
  
    const handleFileChange = (e) => {
      if (e.target.files) {
        setFile(e.target.files[0])
      }
    }
  
    const handleSubmit = async (e) => {
      e.preventDefault()
      if (!file) return
  
      const formData = new FormData()
      formData.append("file", file)
  
      try {
        const response = await fetch("http://localhost:8000/upload/", {
          method: "POST",
          body: formData,
        })
  
        if (!response.ok) throw new Error("Upload failed")
        
        const result = await response.json()
        toast.success(result.message)
        setIsOpen(false)
        setFile(null)
      } catch (error) {
        toast.error(error.message)
      }
    }
  

  return (
    <motion.div className="bg-gray-900 p-4" initial={{ height: 0 }} animate={{ height: isOpen ? "auto" : 0 }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Upload Document</h2>
        <button onClick={() => setIsOpen(!isOpen)}>{isOpen ? <X /> : <Upload />}</button>
      </div>
      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PDF, DOCX, or TXT (MAX. 10MB)</p>
              </div>
              <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          {file && (
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded">
              <span>{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="text-red-500 hover:text-red-700">
                <X size={20} />
              </button>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors"
            disabled={!file}
          >
            Upload and Analyze
          </button>
        </form>
      )}
    </motion.div>
  )
}

