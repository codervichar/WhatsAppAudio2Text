import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { MessageSquare, Menu, X, User, Home, CreditCard, FileText, Settings, LogOut, UserPlus, LogIn, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200' 
        : 'bg-gradient-to-r from-blue-600 to-purple-600'
    }`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className={`p-2 rounded-xl transition-all duration-300 ${
              isScrolled 
                ? 'bg-gradient-to-br from-blue-500 to-purple-500 text-white' 
                : 'bg-white/20 text-white'
            }`}>
              <MessageSquare size={24} />
            </div>
            <div>
              <span className={`text-xl font-bold transition-colors duration-300 ${
                isScrolled ? 'text-gray-900' : 'text-white'
              }`}>
                WhatsApp2Text
              </span>
            </div>
          </Link>
          
          <nav className="hidden lg:block">
            <ul className="flex space-x-8 items-center">
              <li>
                <Link 
                  to="/" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActive('/') 
                      ? (isScrolled ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white')
                      : (isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10')
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  to="/pricing" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActive('/pricing') 
                      ? (isScrolled ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white')
                      : (isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10')
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  Pricing
                </Link>
              </li>
              <li>
                <Link 
                  to="/blog" 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                    isActive('/blog') 
                      ? (isScrolled ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white')
                      : (isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10')
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Blog
                </Link>
              </li>
              
              {isAuthenticated ? (
                <>
                  <li>
                    <Link 
                      to="/dashboard" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                        isActive('/dashboard') 
                          ? (isScrolled ? 'bg-blue-100 text-blue-600' : 'bg-white/20 text-white')
                          : (isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10')
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <button 
                      onClick={handleLogout} 
                      className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link 
                      to="/signin" 
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                        isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/signup" 
                      className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      <UserPlus className="w-4 h-4" />
                      Sign Up
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
          
          <button 
            className={`lg:hidden p-2 rounded-xl transition-all duration-300 ${
              isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
            }`} 
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <nav className="lg:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl">
          <div className="container mx-auto px-4 py-6">
            <ul className="space-y-2">
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