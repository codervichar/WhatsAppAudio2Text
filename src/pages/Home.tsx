import React from 'react'
import { Link } from 'react-router-dom'
import { MessageSquare, Headphones, FileText, FileAudio, FileVideo, Zap, Shield, Globe, Clock, CheckCircle, ArrowRight, Star, Sparkles, Play, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const Home: React.FC = () => {
  const { isAuthenticated, loading } = useAuth()

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative compact-container py-12 lg:py-16">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-100 to-purple-100 px-3 py-1.5 rounded-full mb-6">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-medium text-gray-700">AI-Powered Transcription</span>
            </div>
            <h1 className="text-3xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Convert WhatsApp Audio to Text
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
              Transform your voice messages into accurate text with our advanced AI technology. 
              Simple, fast, and secure transcription service.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link 
                to={isAuthenticated ? "/dashboard" : "/signup"} 
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl text-base font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <span>{isAuthenticated ? "Go to Dashboard" : "Get Started"}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <Link 
                to="/pricing" 
                className="group bg-white text-gray-700 px-6 py-3 rounded-xl text-base font-semibold hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 shadow-lg border border-gray-200 flex items-center gap-2"
              >
                <span>View Pricing</span>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="compact-container py-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get your WhatsApp voice messages transcribed in just three simple steps
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="group text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 transform hover:scale-105 transition-all duration-200">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto shadow-md group-hover:shadow-lg transition-all duration-200">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Send Audio</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Send your WhatsApp voice messages to our dedicated number for processing.
            </p>
          </div>
          
          <div className="group text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 transform hover:scale-105 transition-all duration-200">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto shadow-md group-hover:shadow-lg transition-all duration-200">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">We Process</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Our advanced AI technology transcribes your audio messages with high accuracy.
            </p>
          </div>
          
          <div className="group text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 transform hover:scale-105 transition-all duration-200">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4 mx-auto shadow-md group-hover:shadow-lg transition-all duration-200">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Receive Text</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Get your transcribed text back quickly and effortlessly through our platform.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="compact-container py-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">Why Choose WhatsApp2Text?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Experience the best in AI-powered transcription with our advanced features
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="text-center p-4 bg-white rounded-lg border border-gray-100 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-sm">Lightning Fast</h3>
            <p className="text-gray-600 text-xs">Get transcriptions in seconds with our optimized AI</p>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg border border-gray-100 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-sm">High Accuracy</h3>
            <p className="text-gray-600 text-xs">Advanced speech recognition with 95%+ accuracy</p>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg border border-gray-100 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-sm">Multi-Language</h3>
            <p className="text-gray-600 text-xs">Support for 50+ languages and dialects</p>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg border border-gray-100 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-sm">Secure & Private</h3>
            <p className="text-gray-600 text-xs">Your data is encrypted and never shared</p>
          </div>
        </div>
      </section>

      {/* Supported Formats Section */}
      <section className="compact-container py-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">Supported File Types</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We support a wide range of audio and video formats for transcription
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <FileAudio className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Audio Formats</h3>
                <p className="text-gray-600 text-sm">High-quality audio transcription support</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1 text-sm">MP3</div>
                <div className="text-xs text-gray-600">MPEG Audio Layer-3</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1 text-sm">WAV</div>
                <div className="text-xs text-gray-600">Waveform Audio File</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1 text-sm">FLAC</div>
                <div className="text-xs text-gray-600">Free Lossless Audio</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1 text-sm">M4A</div>
                <div className="text-xs text-gray-600">MPEG-4 Audio</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1 text-sm">AAC</div>
                <div className="text-xs text-gray-600">Advanced Audio Coding</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1 text-sm">OGG</div>
                <div className="text-xs text-gray-600">Ogg Vorbis/Opus</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FileVideo className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Video Formats</h3>
                <p className="text-gray-600 text-sm">Extract audio from video files</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-gray-900 mb-1 text-sm">MP4</div>
                <div className="text-xs text-gray-600">MPEG-4 Part 14</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">MPEG</div>
                <div className="text-sm text-gray-600">Moving Picture Experts Group</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">WEBM</div>
                <div className="text-sm text-gray-600">WebM Video File Format</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of users who trust WhatsApp2Text for their transcription needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to={isAuthenticated ? "/dashboard" : "/signup"} 
              className="group bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center justify-center gap-2"
            >
              <span>{isAuthenticated ? "Go to Dashboard" : "Start Free Trial"}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link 
              to="/pricing" 
              className="group bg-white/10 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border-2 border-white/30 flex items-center justify-center gap-2"
            >
              <span>View Pricing</span>
              <Sparkles className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home