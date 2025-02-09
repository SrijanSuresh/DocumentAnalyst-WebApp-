"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, FileText, MessageSquare, Settings, Moon, Sun } from "lucide-react"

export default function Sidebar({ 
  onViewChange, 
  theme, 
  toggleTheme, 
  uploadedDocuments 
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeView, setActiveView] = useState('chat')

  const handleViewChange = (view) => {
    setActiveView(view)
    onViewChange(view)
  }

  return (
    <motion.div
      className="bg-gray-900 bg-opacity-50 backdrop-filter backdrop-blur-lg text-white w-64 flex flex-col border-r border-gray-800"
      initial={{ width: 256 }}
      animate={{ width: isOpen ? 256 : 64 }}
    >
      <div className="p-4 flex justify-between items-center">
        <motion.h1
          className="text-xl font-bold neon-text"
          initial={{ opacity: 1 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
        >
          Dr. TRUTH
        </motion.h1>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-blue-400 hover:text-blue-300 transition-colors"
        >
          {isOpen ? <ChevronLeft /> : <ChevronRight />}
        </button>
      </div>
      <nav className="flex-1">
        <ul className="space-y-2 p-4">
          <li>
            <button
              onClick={() => handleViewChange('chat')}
              className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 ${
                activeView === 'chat' ? 'bg-blue-900 bg-opacity-50' : 'hover:bg-blue-900 hover:bg-opacity-50'
              }`}
            >
              <MessageSquare className="text-blue-400" />
              {isOpen && <span className="text-blue-200">Chat</span>}
            </button>
          </li>
          <li>
            <button
              onClick={() => handleViewChange('documents')}
              className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 ${
                activeView === 'documents' ? 'bg-blue-900 bg-opacity-50' : 'hover:bg-blue-900 hover:bg-opacity-50'
              }`}
            >
              <FileText className="text-blue-400" />
              {isOpen && <span className="text-blue-200">Documents</span>}
            </button>
          </li>
          <li>
            <button
              onClick={() => handleViewChange('settings')}
              className={`w-full flex items-center space-x-2 p-2 rounded-lg transition-all duration-300 ${
                activeView === 'settings' ? 'bg-blue-900 bg-opacity-50' : 'hover:bg-blue-900 hover:bg-opacity-50'
              }`}
            >
              <Settings className="text-blue-400" />
              {isOpen && <span className="text-blue-200">Settings</span>}
            </button>
          </li>
        </ul>
      </nav>

      {/* Documents Preview Section */}
      {isOpen && activeView === 'documents' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-t border-gray-800"
        >
          <h3 className="text-sm font-semibold text-blue-300 mb-2">Uploaded Documents</h3>
          <div className="space-y-2">
            {uploadedDocuments.map((doc, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-gray-800 bg-opacity-50 rounded-lg"
              >
                <span className="text-blue-200 text-sm truncate">{doc.name}</span>
                <span className="text-gray-400 text-xs">{doc.size}</span>
              </div>
            ))}
            {uploadedDocuments.length === 0 && (
              <p className="text-gray-400 text-sm">No documents uploaded yet</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Theme Settings */}
      {isOpen && activeView === 'settings' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 border-t border-gray-800"
        >
          <div className="flex items-center justify-between p-2 rounded-lg bg-gray-800 bg-opacity-50">
            <span className="text-blue-200">Dark Mode</span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}