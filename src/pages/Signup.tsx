import React, { useState } from 'react'
import { User, Mail, Phone, Lock, Globe, AlertCircle } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Signup: React.FC = () => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [language, setLanguage] = useState('en')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const languages = {
    'ar': 'Arabic',
    'az': 'Azerbaijan',
    'zh': 'Chinese Simplified',
    'zh-TW': 'Chinese Traditional',
    'da': 'Danish',
    'de': 'German',
    'el': 'Greek',
    'en': 'English',
    'es': 'Spanish',
    'fa': 'Persian',
    'fr': 'French',
    'he': 'Hebrew',
    'id': 'Indonesian',
    'it': 'Italian',
    'ja': 'Japanese',
    'nl': 'Dutch',
    'no': 'Norwegian',
    'pt_BR': 'Brazilian Portuguese',
    'ru': 'Russian',
    'sv': 'Swedish',
    'th': 'Thai',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signup({
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber || undefined,
        password,
        language
      })
      
      // Redirect to welcome page after successful signup
      navigate('/welcome')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during signup')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8 text-center">Sign Up for WhatsApp2Text</h1>
      <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertCircle size={20} className="mr-2" />
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="firstName" className="block text-gray-700 font-bold mb-2">First Name</label>
          <div className="flex items-center border rounded-md">
            <User size={20} className="ml-2 text-gray-400" />
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 pl-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="lastName" className="block text-gray-700 font-bold mb-2">Last Name</label>
          <div className="flex items-center border rounded-md">
            <User size={20} className="ml-2 text-gray-400" />
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 pl-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>
        </div>
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
        <div className="mb-4">
          <label htmlFor="phoneNumber" className="block text-gray-700 font-bold mb-2">Phone Number (Optional)</label>
          <div className="flex items-center border rounded-md">
            <Phone size={20} className="ml-2 text-gray-400" />
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-2 pl-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="mb-6">
          <label htmlFor="language" className="block text-gray-700 font-bold mb-2">Transcription Language</label>
          <div className="flex items-center border rounded-md">
            <Globe size={20} className="ml-2 text-gray-400" />
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2 pl-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            >
              {Object.entries(languages).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block text-gray-700 font-bold mb-2">Password</label>
          <div className="flex items-center border rounded-md">
            <Lock size={20} className="ml-2 text-gray-400" />
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 pl-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-300 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating Account...' : 'Continue to Free Trial'}
        </button>
        <p className="mt-4 text-center text-sm">
          Already have an account? <Link to="/signin" className="text-blue-600 hover:text-blue-800">Sign In</Link>
        </p>
      </form>
    </div>
  )
}

export default Signup;