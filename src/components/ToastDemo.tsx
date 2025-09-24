import React from 'react'
import { useToast } from '../context/ToastContext'

const ToastDemo: React.FC = () => {
  const { showSuccess, showError, showInfo, showWarning } = useToast()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Toast Notification Demo</h2>
      <p className="text-gray-600 mb-6">
        This component demonstrates how to use toast notifications throughout the website.
      </p>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => showSuccess('Success! Operation completed successfully.')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Show Success Toast
        </button>
        
        <button
          onClick={() => showError('Error! Something went wrong.')}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Show Error Toast
        </button>
        
        <button
          onClick={() => showInfo('Info: Here is some useful information.')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Show Info Toast
        </button>
        
        <button
          onClick={() => showWarning('Warning! Please check your input.')}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Show Warning Toast
        </button>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Usage in Components:</h3>
        <pre className="text-sm bg-white p-3 rounded overflow-x-auto">
{`import { useToast } from '../context/ToastContext'

const MyComponent = () => {
  const { showSuccess, showError, showInfo, showWarning } = useToast()
  
  const handleAction = () => {
    showSuccess('Action completed!')
    // or
    showError('Something went wrong!')
    // or
    showInfo('Here is some info!')
    // or
    showWarning('Please be careful!')
  }
  
  return <button onClick={handleAction}>Do Something</button>
}`}
        </pre>
      </div>
    </div>
  )
}

export default ToastDemo
