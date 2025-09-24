import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { MessageSquare, Menu, X, User, Home, CreditCard, FileText, Settings, LogOut, UserPlus, LogIn, ChevronDown, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const { isAuthenticated, logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const userDropdownRef = useRef<HTMLLIElement>(null)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const isActive = (path: string) => {
    return location.pathname === path
  }

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen)
  }

  const getUserDisplayName = () => {
    if (!user) return 'User'
    return user.first_name || user.name || 'User'
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200' 
        : 'gradient-header'
    }`}>
      <div className="compact-container py-2">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className={`p-1.5 rounded-lg transition-all duration-300 ${
              isScrolled 
                ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white' 
                : 'bg-white/20 text-white'
            }`}>
              <MessageSquare size={18} />
            </div>
            <div>
              <span className={`text-lg font-bold transition-colors duration-300 ${
                isScrolled ? 'text-gray-900' : 'text-white'
              }`}>
                voicenotescribe
              </span>
            </div>
          </Link>
          
          <nav className="hidden lg:block">
            <ul className="flex space-x-4 items-center list-none m-0 p-0">
              <li>
                <Link 
                  to="/" 
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive('/') 
                      ? (isScrolled ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white')
                      : (isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10')
                  }`}
                >
                  <Home size={14} />
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/pricing" 
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive('/pricing') 
                      ? (isScrolled ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white')
                      : (isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10')
                  }`}
                >
                  <CreditCard size={14} />
                  Pricing
                </Link>
              </li>
              <li>
                <Link 
                  to="/blog" 
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive('/blog') 
                      ? (isScrolled ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white')
                      : (isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10')
                  }`}
                >
                  <FileText size={14} />
                  Blog
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isActive('/contact') 
                      ? (isScrolled ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white')
                      : (isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10')
                  }`}
                >
                  <Mail size={14} />
                  Contact
                </Link>
              </li>
              
              {isAuthenticated ? (
                <li className="relative" ref={userDropdownRef}>
                  <button
                    onClick={toggleUserDropdown}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      isScrolled 
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <User size={14} />
                    <span>{getUserDisplayName()}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isUserDropdownOpen && (
                    <div className={`absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border transition-all duration-200 ${
                      isScrolled 
                        ? 'bg-white border-gray-200' 
                        : 'bg-white/95 backdrop-blur-md border-white/20'
                    }`}>
                      <div className="py-1">
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <Settings size={14} />
                          Dashboard
                        </Link>
                        <Link
                          to="/update-profile"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                          onClick={() => setIsUserDropdownOpen(false)}
                        >
                          <User size={14} />
                          Profile
                        </Link>
                        <hr className="my-1 border-gray-200" />
                        <button
                          onClick={() => {
                            setIsUserDropdownOpen(false)
                            handleLogout()
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors duration-150"
                        >
                          <LogOut size={14} />
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ) : (
                <>
                  <li>
                    <Link 
                      to="/signin" 
                      className={`inline-flex h-9 items-center px-3 rounded-lg text-sm font-medium transition-colors duration-200 gap-1.5 ${
                        isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <LogIn size={14} />
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/signup" 
                      className="inline-flex h-9 items-center px-4 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-colors duration-200 shadow-sm"
                    >
                      <UserPlus size={14} />
                      Sign Up
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
          
          <button 
            className={`lg:hidden p-1.5 rounded-lg transition-all duration-200 ${
              isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
            }`} 
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <nav className="lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl">
          <div className="container mx-auto px-4 py-6">
            <ul className="space-y-2 list-none m-0 p-0">
              <li>
                <Link 
                  to="/" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive('/') ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`} 
                  onClick={toggleMenu}
                >
                  <Home className="w-5 h-5" />
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/pricing" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive('/pricing') ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`} 
                  onClick={toggleMenu}
                >
                  <CreditCard className="w-5 h-5" />
                  Pricing
                </Link>
              </li>
              <li>
                <Link 
                  to="/blog" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive('/blog') ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`} 
                  onClick={toggleMenu}
                >
                  <FileText className="w-5 h-5" />
                  Blog
                </Link>
              </li>
              <li>
                <Link 
                  to="/contact" 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isActive('/contact') ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                  }`} 
                  onClick={toggleMenu}
                >
                  <Mail className="w-5 h-5" />
                  Contact
                </Link>
              </li>
              
              {isAuthenticated ? (
                <>
                  <li>
                    <Link 
                      to="/dashboard" 
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        isActive('/dashboard') ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
                      }`} 
                      onClick={toggleMenu}
                    >
                      <Settings className="w-5 h-5" />
                      Dashboard
                    </Link>
                  </li>
                  <li className="px-4 py-2">
                    <button 
                      onClick={() => { handleLogout(); toggleMenu(); }} 
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <LogOut className="w-5 h-5" />
                      Log Out
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link 
                      to="/signin" 
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-100 transition-all duration-300" 
                      onClick={toggleMenu}
                    >
                      <LogIn className="w-5 h-5" />
                      Sign In
                    </Link>
                  </li>
                  <li className="px-4 py-2">
                    <Link 
                      to="/signup" 
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg" 
                      onClick={toggleMenu}
                    >
                      <UserPlus className="w-5 h-5" />
                      Sign Up
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </nav>
      )}
    </header>
  )
}

export default Header