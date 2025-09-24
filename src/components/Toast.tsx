import React, { useEffect, useState } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export interface ToastProps {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  onClose: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

const Toast: React.FC<ToastProps> = ({ 
  id, 
  message, 
  type, 
  duration = 5000, 
  onClose, 
  position = 'top-right' 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    // Show toast with animation
    const showTimer = setTimeout(() => setIsVisible(true), 10)
    
    // Auto-hide toast
    const hideTimer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [duration])

  const handleClose = () => {
    setIsRemoving(true)
    setTimeout(() => {
      onClose(id)
    }, 300) // Match animation duration
  }

  const getPositionStyles = () => {
    const baseStyles = "fixed z-50 max-w-sm w-full transform transition-all duration-300 ease-in-out"
    
    switch (position) {
      case 'top-right':
        return `${baseStyles} top-4 right-4`
      case 'top-left':
        return `${baseStyles} top-4 left-4`
      case 'bottom-right':
        return `${baseStyles} bottom-4 right-4`
      case 'bottom-left':
        return `${baseStyles} bottom-4 left-4`
      case 'top-center':
        return `${baseStyles} top-4 left-1/2 -translate-x-1/2`
      case 'bottom-center':
        return `${baseStyles} bottom-4 left-1/2 -translate-x-1/2`
      default:
        return `${baseStyles} top-4 right-4`
    }
  }

  const getToastStyles = () => {
    const positionStyles = getPositionStyles()
    
    if (isRemoving) {
      return `${positionStyles} translate-x-full opacity-0`
    }
    
    if (isVisible) {
      return `${positionStyles} translate-x-0 opacity-100`
    }
    
    return `${positionStyles} translate-x-full opacity-0`
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const getIcon = () => {
    const iconClass = "w-5 h-5 flex-shrink-0"
    
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} />
      case 'error':
        return <AlertCircle className={`${iconClass} text-red-500`} />
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />
      case 'info':
        return <Info className={`${iconClass} text-blue-500`} />
      default:
        return <Info className={`${iconClass} text-gray-500`} />
    }
  }

  return (
    <div className={getToastStyles()}>
      <div className={`p-4 rounded-lg shadow-lg border-l-4 ${getTypeStyles()}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium">
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Toast