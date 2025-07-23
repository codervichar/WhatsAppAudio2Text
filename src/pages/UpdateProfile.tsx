import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { User, Mail, Phone, ArrowLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const UpdateProfile: React.FC = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Load user data on component mount
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setEmail(user.email || '')
      setPhoneNumber(user.phone_number || '')
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    const updateData: any = {}
    
    if (firstName.trim()) updateData.first_name = firstName.trim()
    if (lastName.trim()) updateData.last_name = lastName.trim()
    if (email.trim()) updateData.email = email.trim()
    if (phoneNumber.trim()) updateData.phone_number = phoneNumber.trim()

    if (Object.keys(updateData).length === 0) {
      setError('Please make at least one change to update your profile')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await apiService.updateProfile(updateData)
      
      if (response.success) {
        setSuccess(response.message || 'Profile updated successfully!')
        // Update the user context with new data
        if (response.data && response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user))
        }
      } else {
        setError(response.message || 'Failed to update profile')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>Update Profile - WhatsApp2Text</title>
        <meta name="description" content="Update your WhatsApp2Text profile information." />
      </Helmet>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mb-6 text-center">
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center justify-center">
            <ArrowLeft className="mr-2" /> Back to Dashboard
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8">Update Your Profile</h1>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
            {success}
          </div>
        )}

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={20} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={20} className="text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={20} className="text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                disabled={isSubmitting || loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition duration-300"
              >
                {isSubmitting ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UpdateProfile