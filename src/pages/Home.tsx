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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full mb-8">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">AI-Powered Transcription</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Convert WhatsApp Audio to Text
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              Transform your voice messages into accurate text with our advanced AI technology. 
              Simple, fast, and secure transcription service.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to={isAuthenticated ? "/dashboard" : "/signup"} 
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center gap-2"
              >
                <span>{isAuthenticated ? "Go to Dashboard" : "Get Started"}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link 
                to="/pricing" 
                className="group bg-white text-gray-700 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl border-2 border-gray-200 flex items-center gap-2"
              >
                <span>View Pricing</span>
                <Sparkles className="w-5 h-5 text-purple-500" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get your WhatsApp voice messages transcribed in just three simple steps
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="group text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Send Audio</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Send your WhatsApp voice messages to our dedicated number for processing.
            </p>
          </div>
          
          <div className="group text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
              <Headphones className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">We Process</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Our advanced AI technology transcribes your audio messages with high accuracy.
            </p>
          </div>
          
          <div className="group text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100 transform hover:scale-105 transition-all duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg group-hover:shadow-xl transition-all duration-300">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Receive Text</h3>
            <p className="text-gray-600 text-lg leading-relaxed">
              Get your transcribed text back quickly and effortlessly through our platform.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Why Choose WhatsApp2Text?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the best in AI-powered transcription with our advanced features
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          <div className="text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Lightning Fast</h3>
            <p className="text-gray-600 text-sm">Get transcriptions in seconds with our optimized AI</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">High Accuracy</h3>
            <p className="text-gray-600 text-sm">Advanced speech recognition with 95%+ accuracy</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Multi-Language</h3>
            <p className="text-gray-600 text-sm">Support for 50+ languages and dialects</p>
          </div>
          
          <div className="text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">Your data is encrypted and never shared</p>
          </div>
        </div>
      </section>

      {/* Supported Formats Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Supported File Types</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We support a wide range of audio and video formats for transcription
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <FileAudio className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Audio Formats</h3>
                <p className="text-gray-600">High-quality audio transcription support</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">MP3</div>
                <div className="text-sm text-gray-600">MPEG Audio Layer-3</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">WAV</div>
                <div className="text-sm text-gray-600">Waveform Audio File</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">FLAC</div>
                <div className="text-sm text-gray-600">Free Lossless Audio</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">M4A</div>
                <div className="text-sm text-gray-600">MPEG-4 Audio</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">AAC</div>
                <div className="text-sm text-gray-600">Advanced Audio Coding</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">OGG</div>
                <div className="text-sm text-gray-600">Ogg Vorbis/Opus</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <FileVideo className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Video Formats</h3>
                <p className="text-gray-600">Extract audio from video files</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="font-semibold text-gray-900 mb-2">MP4</div>
                <div className="text-sm text-gray-600">MPEG-4 Part 14</div>
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