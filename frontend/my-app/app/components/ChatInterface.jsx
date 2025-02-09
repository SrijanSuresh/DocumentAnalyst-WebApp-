"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { Send, Upload, X, Paperclip } from "lucide-react"
import toast from "react-hot-toast"

export default function ChatInterface({ onFileUpload }) {
  const [messages, setMessages] = useState([{ role: "assistant", content: "Hello! Upload documents to get started!" }])
  const [input, setInput] = useState("")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const robotControls = useAnimation()
  const ws = useRef(null)

  // WebSocket connection
  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8000/chat")
    
    ws.current.onmessage = (event) => {
      if (event.data === '{"type": "stream_end"}') {
        setIsLoading(false)
      } else {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage?.role === "assistant") {
            return [...prev.slice(0, -1), { 
              ...lastMessage, 
              content: lastMessage.content + event.data 
            }]
          }
          return [...prev, { role: "assistant", content: event.data }]
        })
      }
    }

    ws.current.onerror = (error) => {
      toast.error("Connection error")
      setIsLoading(false)
    }

    return () => ws.current?.close()
  }, [])

  // Robot animation
  useEffect(() => {
    robotControls.start({
      y: [0, -10, 0],
      rotate: [0, -5, 5, -5, 0],
      transition: { repeat: Number.POSITIVE_INFINITY, duration: 5 },
    })
  }, [robotControls])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setMessages(prev => [...prev, { role: "user", content: input }])
    
    try {
      ws.current.send(input)
      setInput("")
    } catch (error) {
      toast.error("Failed to send message")
      setIsLoading(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0]
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size exceeds 10MB limit")
        return
      }
      setFile(selectedFile)
    }
  }

  const handleFileUpload = async () => {
    if (!file) return
  
    const formData = new FormData()
    formData.append("file", file)
  
    try {
      setIsLoading(true)
      
      // Add timeout handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
  
      const response = await fetch("http://localhost:8000/upload/", {
        method: "POST",
        body: formData,
        signal: controller.signal
      })
      clearTimeout(timeoutId)
  
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format')
      }
  
      const result = await response.json()
  
      if (!response.ok) {
        throw new Error(result.detail || "Upload failed")
      }
  
      toast.success(result.message)
      onFileUpload(file)
      setMessages(prev => [
        ...prev,
        { role: "system", content: `Document "${file.name}" processed successfully!` }
      ])
      setFile(null)
      setIsUploadOpen(false)
      
    } catch (error) {
      // Handle specific abort error
      if (error.name === 'AbortError') {
        toast.error("Request timed out")
      } else {
        toast.error(error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="flex flex-col h-full p-4 chat-window rounded-lg neon-border relative overflow-hidden">
      {/* ... (keep existing robot animation elements) ... */}

      <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide relative z-10">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-sm p-4 rounded-lg ${
                  message.role === "user" ? "bg-blue-600 bg-opacity-50" : "bg-gray-800 bg-opacity-50"
                } backdrop-filter backdrop-blur-sm`}
              >
                {message.content}
                {isLoading && index === messages.length - 1 && (
                  <span className="ml-2 inline-block animate-pulse">...</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex space-x-2 relative z-10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-800 bg-opacity-50 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400"
          disabled={isLoading}
        />
        <motion.button
          type="button"
          onClick={() => setIsUploadOpen(!isUploadOpen)}
          className="bg-gray-700 text-white rounded-full p-2 hover:bg-gray-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          <Paperclip size={20} />
        </motion.button>
        <motion.button
          type="submit"
          className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          <Send size={20} />
        </motion.button>
      </form>

      <AnimatePresence>
        {isUploadOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 bg-gray-800 bg-opacity-50 rounded-lg backdrop-filter backdrop-blur-sm relative z-10"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-300">Upload Document</h3>
              <button 
                onClick={() => setIsUploadOpen(false)} 
                className="text-gray-400 hover:text-gray-200"
                disabled={isLoading}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : 'border-blue-400 hover:border-blue-300'
                } transition-all`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-blue-400" />
                  <p className="mb-2 text-sm text-blue-200">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-400">PDF, DOCX, or TXT (MAX. 10MB)</p>
                </div>
                <input 
                  id="dropzone-file" 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={isLoading}
                />
              </label>
            </div>
            {file && (
              <div className="mt-4 flex items-center justify-between bg-gray-700 bg-opacity-50 p-2 rounded-lg">
                <span className="text-blue-200 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                  disabled={isLoading}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <motion.button
              onClick={handleFileUpload}
              className="mt-4 w-full bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!file || isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? 'Uploading...' : 'Upload and Analyze'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}