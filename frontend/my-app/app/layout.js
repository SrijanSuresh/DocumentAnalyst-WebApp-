import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'AI Document Analyzer',
  description: 'Analyze your documents with advanced AI',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white`}>
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}