import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically send a request to your backend to initiate the password reset process
    console.log('Password reset requested for:', email)
    setIsSubmitted(true)
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <Helmet>
        <title>Forgot Password - WhatsApp2Text</title>
        <meta name="description" content="Reset your WhatsApp2Text account password." />
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
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300">
            Reset Password
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