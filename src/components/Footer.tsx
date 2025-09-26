import React from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Mail, Facebook, Twitter, Instagram, Linkedin, Github, Zap, Shield, Globe, ArrowRight, Heart } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <>
      <style>
        {`
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `}
      </style>
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000"></div>
      </div>
      
      {/* Main Footer Content */}
      <div className="relative container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  voicenotescribe
                </h3>
              </div>
            </div>
            <p className="text-gray-300 leading-relaxed text-lg">
              Transform your WhatsApp voice messages into accurate text transcripts with our advanced platform.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="p-3 bg-gray-800 hover:bg-blue-600 rounded-xl transition-all duration-300 transform hover:scale-110 hover:shadow-lg">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="p-3 bg-gray-800 hover:bg-blue-400 rounded-xl transition-all duration-300 transform hover:scale-110 hover:shadow-lg">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="p-3 bg-gray-800 hover:bg-pink-600 rounded-xl transition-all duration-300 transform hover:scale-110 hover:shadow-lg">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="p-3 bg-gray-800 hover:bg-blue-700 rounded-xl transition-all duration-300 transform hover:scale-110 hover:shadow-lg">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white border-b border-gray-600 pb-3">Quick Links</h4>
            <ul className="space-y-4">
              <li>
                <Link to="/" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center group">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 group-hover:scale-150 transition-transform duration-300"></span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">Home</span>
                  <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center group">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 group-hover:scale-150 transition-transform duration-300"></span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">Pricing</span>
                  <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center group">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 group-hover:scale-150 transition-transform duration-300"></span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">Blog</span>
                  <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-gray-300 hover:text-blue-400 transition-all duration-300 flex items-center group">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 group-hover:scale-150 transition-transform duration-300"></span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">Sign Up</span>
                  <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white border-b border-gray-600 pb-3">Services</h4>
            <ul className="space-y-4">
              <li className="text-gray-300 hover:text-green-400 transition-all duration-300 flex items-center group">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-500/30 transition-all duration-300">
                  <Zap className="w-4 h-4 text-green-400" />
                </div>
                <span className="group-hover:translate-x-1 transition-transform duration-300">Audio Transcription</span>
              </li>
              <li className="text-gray-300 hover:text-green-400 transition-all duration-300 flex items-center group">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-500/30 transition-all duration-300">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                </div>
                <span className="group-hover:translate-x-1 transition-transform duration-300">Voice to Text</span>
              </li>
              <li className="text-gray-300 hover:text-green-400 transition-all duration-300 flex items-center group">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-500/30 transition-all duration-300">
                  <Globe className="w-4 h-4 text-green-400" />
                </div>
                <span className="group-hover:translate-x-1 transition-transform duration-300">Multi-language Support</span>
              </li>
              <li className="text-gray-300 hover:text-green-400 transition-all duration-300 flex items-center group">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-500/30 transition-all duration-300">
                  <Shield className="w-4 h-4 text-green-400" />
                </div>
                <span className="group-hover:translate-x-1 transition-transform duration-300">High Accuracy</span>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-white border-b border-gray-600 pb-3">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-all duration-300 group">
                <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-all duration-300">
                  <Mail className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-gray-300 group-hover:text-white transition-colors duration-300">support@voicenotescribe.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-700 relative">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-gray-400 text-sm flex items-center gap-2">
              <p>&copy; 2024 voicenotescribe. All rights reserved.</p>
              <span className="text-pink-400">Made with</span>
              <Heart className="w-4 h-4 text-pink-400 animate-pulse" />
              <span className="text-pink-400">for you</span>
            </div>
            <div className="flex space-x-8 text-sm">
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-105">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-105">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-105">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
    </>
  )
}

export default Footer