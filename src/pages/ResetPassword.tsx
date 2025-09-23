import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { apiService } from '../services/api'

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (!tokenParam) {
      setError('Invalid or missing reset token')
      return
    }
    setToken(tokenParam)
  }, [searchParams])

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!token) {
      setError('Invalid reset token')
      return
    }

    setIsLoading(true)

    try {
      await apiService.resetPassword(token, password)
      setIsSuccess(true)
      // Redirect to signin after 3 seconds
      setTimeout(() => {
        navigate('/signin')
      }, 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <Helmet>
          <title>Password Reset Successful - voicenotescribe</title>
          <meta name="description" content="Your password has been reset successfully." />
        </Helmet>
        <div className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md text-center">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={64} />
          <h2 className="text-xl font-semibold mb-4 text-green-600">Password Reset Successful!</h2>
          <p className="mb-4 text-gray-600">
            Your password has been reset successfully. You will be redirected to the sign-in page in a few seconds.
          </p>
          <Link to="/signin" className="text-blue-600 hover:text-blue-800">
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <Helmet>
        <title>Reset Password - voicenotescribe</title>
        <meta name="description" content="Reset your voicenotescribe account password." />
      </Helmet>
      
      <div className="mb-6">
        <Link to="/signin" className="text-blue-600 hover:text-blue-800 flex items-center">
          ← Back to Sign In
        </Link>
      </div>
      
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center">Reset Your Password</h1>
      
      <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
        <p className="mb-6 text-gray-600">Enter your new password below.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-700 font-bold mb-2">
            New Password
          </label>
          <div className="relative">
            <div className="flex items-center border rounded-md">
              <Lock size={20} className="ml-2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 pl-3 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="mr-2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">Password must be at least 6 characters long</p>
        </div>
        
        <div className="mb-6">
          <label htmlFor="confirmPassword" className="block text-gray-700 font-bold mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <div className="flex items-center border rounded-md">
              <Lock size={20} className="ml-2 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 pl-3 pr-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="mr-2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading || !token}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Resetting Password...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  )
}

export default ResetPassword
