import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { User, Lock, AlertCircle } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../context/AuthContext'

const Signin: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the intended destination from route state, default to dashboard
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login({ email, password })
      // Redirect to intended destination or dashboard
      navigate(from, { replace: true })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="gradient-bg min-h-screen flex items-center justify-center compact-section">
      <Helmet>
        <title>Sign In - WhatsApp2Text</title>
        <meta name="description" content="Sign in to your WhatsApp2Text account to manage your subscription and access your transcriptions." />
      </Helmet>
      
      <div className="compact-container">
        <div className="form-container">
          <h1 className="compact-header">Welcome Back</h1>
          <p className="text-center text-gray-600 text-compact mb-6">Sign in to your account</p>
          
          {error && (
            <div className="alert-compact bg-red-50 border border-red-200 text-red-700 flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span className="text-compact">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group-compact">
              <label htmlFor="email" className="form-label">Email</label>
              <div className="relative">
                <User size={16} className="input-icon icon-compact" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input input-with-left-icon"
                  placeholder="Enter your email address"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="form-group-compact">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <Lock size={16} className="input-icon icon-compact" />
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input input-with-left-icon"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="form-button"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-800 text-compact font-medium">
              Forgot Password?
            </Link>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-compact text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signin