import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, Loader2 } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { apiService } from '../services/api'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await apiService.forgotPassword(email)
      setIsSubmitted(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <Helmet>
        <title>Forgot Password - voicenotescribe</title>
        <meta name="description" content="Reset your voicenotescribe account password." />
      </Helmet>
      <div className="mb-6">
        <Link to="/signin" className="text-blue-600 hover:text-blue-800 flex items-center">
          <ArrowLeft className="mr-2" /> Back to Sign In
        </Link>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center">Forgot Your Password?</h1>
      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
          <p className="mb-4 text-gray-600">Enter your email address and we'll send you instructions to reset your password.</p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-bold mb-2">Email</label>
            <div className="flex items-center border rounded-md">
              <Mail size={20} className="ml-2 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 pl-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Sending...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      ) : (
        <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md text-center">
          <h2 className="text-xl font-semibold mb-4">Password Reset Email Sent</h2>
          <p className="mb-4 text-gray-600">
            If an account exists for {email}, you will receive an email with instructions on how to reset your password.
          </p>
          <Link to="/signin" className="text-blue-600 hover:text-blue-800">
            Return to Sign In
          </Link>
        </div>
      )}
    </div>
  )
}

export default ForgotPassword