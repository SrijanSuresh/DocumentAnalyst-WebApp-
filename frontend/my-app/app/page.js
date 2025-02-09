'use client'
import { useState, useEffect } from 'react'
// import dynamic from 'next/dynamic'
import Sidebar from './components/Sidebar'
import ChatInterface from './components/ChatInterface'
import { Toaster } from 'react-hot-toast'

export default function Home() {
  const [activeView, setActiveView] = useState('chat')
  const [theme, setTheme] = useState('dark')
  const [uploadedDocuments, setUploadedDocuments] = useState([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(savedTheme)
    document.documentElement.className = savedTheme
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.className = newTheme
  }

  const handleFileUpload = (file) => {
    setUploadedDocuments(prev => [...prev, {
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)}KB`,
      date: new Date().toLocaleDateString()
    }])
  }

  if (!mounted) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        onViewChange={setActiveView}
        theme={theme}
        toggleTheme={toggleTheme}
        uploadedDocuments={uploadedDocuments}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'chat' && (
          <div className="flex-1 overflow-y-auto">
            <ChatInterface onFileUpload={handleFileUpload} />
          </div>
        )}
        
        {activeView === 'documents' && (
          <div className="p-4">
            <h2 className="text-2xl font-bold text-blue-300 mb-4">Uploaded Documents</h2>
            {/* Add more document management features here */}
          </div>
        )}
      </main>
      
      <Toaster position="bottom-right" />
    </div>
  )
}