import React, { createContext, useContext, useState, ReactNode } from 'react'
import Toast, { ToastProps } from '../components/Toast'

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning', duration?: number, position?: ToastProps['position']) => void
  showSuccess: (message: string, duration?: number, position?: ToastProps['position']) => void
  showError: (message: string, duration?: number, position?: ToastProps['position']) => void
  showInfo: (message: string, duration?: number, position?: ToastProps['position']) => void
  showWarning: (message: string, duration?: number, position?: ToastProps['position']) => void
  clearAllToasts: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const addToast = (
    message: string, 
    type: 'success' | 'error' | 'info' | 'warning', 
    duration = 5000,
    position: ToastProps['position'] = 'top-right'
  ) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: ToastProps = {
      id,
      message,
      type,
      duration,
      position,
      onClose: removeToast
    }
    
    setToasts(prev => [...prev, newToast])
  }

  const showToast = (
    message: string, 
    type: 'success' | 'error' | 'info' | 'warning', 
    duration?: number,
    position?: ToastProps['position']
  ) => {
    addToast(message, type, duration, position)
  }

  const showSuccess = (message: string, duration?: number, position?: ToastProps['position']) => {
    addToast(message, 'success', duration, position)
  }

  const showError = (message: string, duration?: number, position?: ToastProps['position']) => {
    addToast(message, 'error', duration, position)
  }

  const showInfo = (message: string, duration?: number, position?: ToastProps['position']) => {
    addToast(message, 'info', duration, position)
  }

  const showWarning = (message: string, duration?: number, position?: ToastProps['position']) => {
    addToast(message, 'warning', duration, position)
  }

  const clearAllToasts = () => {
    setToasts([])
  }

  return (
    <ToastContext.Provider value={{ 
      showToast, 
      showSuccess, 
      showError, 
      showInfo, 
      showWarning, 
      clearAllToasts 
    }}>
      {children}
      {/* Render toasts */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {toasts.map((toast, index) => (
          <div 
            key={toast.id} 
            className="pointer-events-auto"
            style={{ 
              zIndex: 1000 + index,
              marginBottom: index > 0 ? '8px' : '0'
            }}
          >
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}