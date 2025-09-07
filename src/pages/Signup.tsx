import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, Lock, AlertCircle, Eye, EyeOff, CheckCircle, ChevronDown, Search } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const Signup: React.FC = () => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Country dropdown state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [countrySearchTerm, setCountrySearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<{ id: number; code: string; label: string; phonecode?: string; iso?: string } | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [countryOptions, setCountryOptions] = useState<{ id: number; code: string; label: string; phonecode?: string; iso?: string }[]>([])
  const { signup } = useAuth()
  const navigate = useNavigate()



  // Password validation function
  const validatePassword = (password: string) => {
    const minLength = 8
    
    return {
      isValid: password.length >= minLength,
      minLength: password.length >= minLength
    }
  }

  const passwordValidation = validatePassword(password)
  const passwordsMatch = password === confirmPassword && password.length > 0



  // Fetch countries on component mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await apiService.getCountries()
        if (response.success && response.data.length > 0) {
          setCountryOptions(response.data)
          // Set US (+1) as default country
          const usCountry = response.data.find((country: { code?: string }) => country.code === 'US')
          setSelectedCountry(usCountry || response.data[0])
        }
      } catch (error) {
        console.error('Failed to fetch countries:', error)
      }
    }
    fetchCountries()
  }, [])

  // Filtered countries for search
  const filteredCountries = countryOptions.filter((country) =>
    country.label.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
    (country.phonecode && country.phonecode.toString().includes(countrySearchTerm)) ||
    country.code.toLowerCase().includes(countrySearchTerm.toLowerCase())
  )

  // Handle country select
  const handleCountrySelect = (country: { id: number; code: string; label: string; phonecode?: string }) => {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isCountryDropdownOpen && !target.closest('.country-dropdown-container')) {
        setIsCountryDropdownOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCountryDropdownOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate password
    if (!passwordValidation.isValid) {
      setError('Password must be at least 8 characters long')
      return
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate phone number
    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('WhatsApp number is required')
      return
    }

    setIsLoading(true)

    try {
      // Format phone number with country code if provided
      // const formattedPhoneNumber = selectedCountry && phoneNumber 
      //   ? `+${selectedCountry.phonecode}${phoneNumber}` 
      //   : phoneNumber || undefined

      await signup({
        first_name: firstName,
        last_name: lastName,
        email,
        wtp_number: phoneNumber || undefined, // Store WhatsApp number separately, send undefined if empty
        password,
        country_id: selectedCountry?.id // Updated to match backend expectation
      })
      
      // Redirect to signup page after successful signup
      navigate('/signup')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred during signup')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="gradient-bg min-h-screen compact-section">
      <div className="compact-container">
        <div className="form-container max-w-lg">
          <h1 className="compact-header">Create Your Account</h1>
          <p className="text-center text-gray-600 text-compact mb-6">Join WhatsApp2Text to start transcribing audio messages</p>
          
          {error && (
            <div className="alert-compact bg-red-50 border border-red-200 text-red-700 flex items-center">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span className="text-compact">{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="form-group-compact">
              <label htmlFor="firstName" className="form-label">First Name</label>
              <div className="relative">
                <User size={16} className="input-icon icon-compact" />
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="form-input input-with-left-icon"
                  placeholder="Enter your first name"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group-compact">
              <label htmlFor="lastName" className="form-label">Last Name</label>
              <div className="relative">
                <User size={16} className="input-icon icon-compact" />
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="form-input input-with-left-icon"
                  placeholder="Enter your last name"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="form-group-compact">
              <label htmlFor="email" className="form-label">Email</label>
              <div className="relative">
                <Mail size={16} className="input-icon icon-compact" />
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
              <label htmlFor="phoneNumber" className="form-label">WhatsApp Number</label>
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Country Code Dropdown */}
                <div className="relative lg:w-24 country-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm h-10"
                    disabled={isLoading}
                  >
                    <span className="text-left text-gray-700 font-medium">
                      {selectedCountry ? `+${selectedCountry.phonecode} ${selectedCountry.iso}` : '+62 ID'}
                    </span>
                    <ChevronDown size={16} className="text-gray-400" />
                  </button>
                  {isCountryDropdownOpen && (
                    <div className="absolute z-[9999] w-72 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden transform -translate-x-1/2 left-1/2">
                      {/* Search Input */}
                      <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                          <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search countries..."
                            value={countrySearchTerm}
                            onChange={(e) => {
                              setCountrySearchTerm(e.target.value);
                              setHighlightedIndex(-1);
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            autoFocus
                          />
                        </div>
                      </div>
                      {/* Country List */}
                      <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((country, index) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => handleCountrySelect(country)}
                              className={`w-full text-left px-3 py-2 focus:outline-none text-sm transition-colors border-b border-gray-50 last:border-b-0 ${
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
                                {selectedCountry?.id === country.id && (
                                  <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-gray-500 text-sm">
                            <Search size={20} className="mx-auto mb-1 text-gray-300" />
                            No countries found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Hidden input for country ID */}
                <input
                  type="hidden"
                  name="country_code"
                  value={selectedCountry?.id || ''}
                />
                {/* Mobile Number Input */}
                <div className="flex-1">
                  <div className="relative">
                    <Phone size={16} className="input-icon icon-compact" />
                    <input
                      type="tel"
                      id="phoneNumber"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      className="form-input input-with-left-icon h-10"
                      placeholder="Enter your phone number"
                      maxLength={15}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-group-compact">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="relative">
                <Lock size={16} className="input-icon icon-compact" />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input input-with-left-icon input-with-right-icon"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password validation indicators */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className={`flex items-center text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-red-600'}`}>
                    <CheckCircle size={12} className="mr-1" />
                    At least 8 characters
                  </div>
                </div>
              )}
            </div>

            <div className="form-group-compact">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="input-icon icon-compact" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="form-input input-with-left-icon input-with-right-icon"
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password match indicator */}
              {confirmPassword.length > 0 && (
                <div className="mt-2">
                  <div className={`flex items-center text-xs ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    <CheckCircle size={12} className="mr-1" />
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                </div>
              )}
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading || !passwordValidation.isValid || !passwordsMatch}
              className="form-button"
            >
              {isLoading ? 'Creating Account...' : 'Continue to Free Trial'}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-compact text-gray-600">
              Already have an account?{' '}
              <Link to="/signin" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Signup