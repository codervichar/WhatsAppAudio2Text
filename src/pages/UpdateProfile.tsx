import React, { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { User, Mail, Phone, ArrowLeft, ChevronDown, Search, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
// import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const UpdateProfile: React.FC = () => {
  // const { user, loading } = useAuth()
  // const navigate = useNavigate()
  const loading = false
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [expectedLanguage, setExpectedLanguage] = useState<string | number>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)

  // Country dropdown state
  const [countryOptions, setCountryOptions] = useState<{ id: number; code: string; label: string; phonecode?: string; iso?: string }[]>([])
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<{ id: number; code: string; label: string; phonecode?: string; iso?: string } | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  // Language options state
  const [languageOptions, setLanguageOptions] = useState<{ id: number; code: string; label: string }[]>([])

  // Load user data and countries on component mount
  useEffect(() => {
    // Fetch profile data from API
    const fetchProfile = async () => {
      try {
        setProfileLoading(true)
        const res = await apiService.getProfile()
                 if (res.success && res.data.user) {
           const profileData = res.data.user
           setFirstName(profileData.first_name || '')
           setLastName(profileData.last_name || '')
           setEmail(profileData.email || '')
           
           // Set expected language
           if (profileData.wa_language) {
             setExpectedLanguage(profileData.wa_language);
           }
           
                       // Use wtp_number for WhatsApp number field
            if (profileData.wtp_number) {
              let phoneNum = profileData.wtp_number;
              if (phoneNum.startsWith('+')) {
                // Remove the + and country code, keep only the number
                phoneNum = phoneNum.replace(/^\+[0-9]+/, '');
              }
              setPhoneNumber(phoneNum);
            }
         }
      } catch (error) {
        console.error('Failed to fetch profile:', error)
        setError('Failed to load profile data')
      } finally {
        setProfileLoading(false)
      }
    }

    // Fetch countries and languages first, then profile
    Promise.all([
      apiService.getCountries(),
      apiService.getLanguages()
    ]).then(([countriesData, languagesData]) => {
      if (countriesData.success && countriesData.data.length > 0) {
        setCountryOptions(countriesData.data)
      }
      if (languagesData.success && languagesData.data.length > 0) {
        setLanguageOptions(languagesData.data)
      }
      // After both are loaded, fetch profile
      fetchProfile()
    }).catch(error => {
      console.error('Failed to fetch countries or languages:', error)
      setError('Failed to load countries or languages')
      setProfileLoading(false)
    })
  }, [])

  // Prefill country when both profile and countries are loaded
  useEffect(() => {
    if (!profileLoading && countryOptions.length > 0) {
      // Get profile data from API again to ensure we have the latest country_code
      apiService.getProfile().then(res => {
        if (res.success && res.data.user && res.data.user.country_code) {
          const foundCountry = countryOptions.find(c => c.id === Number(res.data.user.country_code))
          if (foundCountry) setSelectedCountry(foundCountry)
        }
      }).catch(error => {
        console.error('Failed to fetch profile for country prefill:', error)
      })
    }
  }, [profileLoading, countryOptions])

  // Filtered countries for search
  const filteredCountries = countryOptions.filter((country) =>
    country.label.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
    (country.phonecode && country.phonecode.toString().includes(countrySearchTerm)) ||
    country.code.toLowerCase().includes(countrySearchTerm.toLowerCase())
  )

  // Handle country select
  const handleCountrySelect = (country: { id: number; code: string; label: string; phonecode?: string; iso?: string }) => {
    setSelectedCountry(country)
    setCountrySearchTerm('')
    setIsCountryDropdownOpen(false)
    setHighlightedIndex(-1)
  }

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isCountryDropdownOpen) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredCountries.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCountries.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
          handleCountrySelect(filteredCountries[highlightedIndex])
        }
        break
      case 'Escape':
        setIsCountryDropdownOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)

    const updateData: any = {}
    
    // Only include fields that have values
    if (firstName.trim()) updateData.first_name = firstName.trim()
    if (lastName.trim()) updateData.last_name = lastName.trim()
    if (email.trim()) updateData.email = email.trim()
    
    // Store only the numeric part of WhatsApp number
    if (phoneNumber.trim()) {
      updateData.wtp_number = phoneNumber.trim()
    }
    
    if (selectedCountry?.id) updateData.country_code = selectedCountry.id
    if (expectedLanguage) updateData.wa_language = expectedLanguage

    if (Object.keys(updateData).length === 0) {
      setError('Please make at least one change to update your profile')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await apiService.updateWhatsAppTranscript(updateData)
      
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

  // Show loading state
  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mb-6 text-center">
            <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center justify-center">
              <ArrowLeft className="mr-2" /> Back to Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8">Update Your Profile</h1>
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex justify-center items-center py-8">
              <div className="text-gray-600">Loading profile data...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>Update Profile - voicenotescribe</title>
        <meta name="description" content="Update your voicenotescribe profile information." />
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
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Country Code Dropdown */}
                <div className="relative lg:w-24">
                  <button
                    type="button"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="w-full flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 text-sm h-10"
                  >
                    <span className="text-left text-gray-700 font-medium">
                      {selectedCountry ? `+${selectedCountry.phonecode} ${selectedCountry.iso}` : 'Select Country'}
                    </span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  
                  {isCountryDropdownOpen && (
                    <div className="absolute z-[9999] w-64 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-hidden transform -translate-x-1/2 left-1/2">
                      {/* Search Input */}
                      <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                          <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search countries..."
                            value={countrySearchTerm}
                            onChange={(e) => {
                              setCountrySearchTerm(e.target.value)
                              setHighlightedIndex(-1)
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-7 pr-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      {/* Country List */}
                      <div className="max-h-36 overflow-y-auto custom-scrollbar">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((country, index) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => handleCountrySelect(country)}
                              className={`w-full text-left px-2 py-1.5 focus:outline-none text-xs transition-colors border-b border-gray-50 last:border-b-0 ${
                                index === highlightedIndex
                                  ? 'bg-blue-50 text-blue-900'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="font-semibold text-gray-900">+{country.phonecode} {country.iso}</span>
                                  <span className="text-xs text-gray-600 truncate">{country.label}</span>
                                </div>
                                {selectedCountry?.code === country.code && (
                                  <CheckCircle size={12} className="text-blue-600 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-2 py-3 text-center text-gray-500 text-xs">
                            <Search size={16} className="mx-auto mb-1 text-gray-300" />
                            No countries found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={20} className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-10"
                      placeholder="Enter mobile number (without country code)"
                      maxLength={15}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="expectedLanguage" className="block text-sm font-medium text-gray-700">Expected Transcript Language</label>
              <div className="mt-1">
                <select
                  id="expectedLanguage"
                  value={expectedLanguage}
                  onChange={(e) => setExpectedLanguage(e.target.value ? Number(e.target.value) : '')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Language</option>
                  {languageOptions.map(language => (
                    <option key={language.id} value={language.id}>
                      {language.label}
                    </option>
                  ))}
                </select>
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