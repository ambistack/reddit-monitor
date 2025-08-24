'use client'
import { useState, useEffect } from 'react'

export default function ConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true) // Default to true to avoid confusion
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<string>('')

  const checkConnection = async () => {
    setIsChecking(true)
    try {
      // Test our own API endpoint instead of direct Reddit API
      // This avoids CORS issues and tests our actual monitoring capability
      const response = await fetch('/api/connection-test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const isSuccess = response.ok
      setIsConnected(isSuccess)
      setLastChecked(new Date().toLocaleTimeString())
      
      if (!isSuccess) {
        console.warn('Reddit API connection test failed:', response.status)
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      setIsConnected(false)
      setLastChecked(new Date().toLocaleTimeString())
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Check connection on mount after a short delay
    const initialCheck = setTimeout(checkConnection, 1000)
    
    // Then check every 60 seconds (less frequent to avoid rate limits)
    const interval = setInterval(checkConnection, 60000)
    
    return () => {
      clearTimeout(initialCheck)
      clearInterval(interval)
    }
  }, [])

  if (isChecking && !lastChecked) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-2 shadow-lg border">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-600">Checking...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-2 shadow-lg border">
        <div 
          className={`w-3 h-3 rounded-full ${
            isConnected 
              ? 'bg-green-500' 
              : 'bg-red-500'
          }`}
          style={{
            animation: isConnected 
              ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
              : 'none'
          }}
        ></div>
        <span className={`text-sm font-medium ${
          isConnected ? 'text-green-600' : 'text-red-600'
        }`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {lastChecked && (
          <span className="text-xs text-gray-400 ml-1">
            {lastChecked}
          </span>
        )}
      </div>
    </div>
  )
}
