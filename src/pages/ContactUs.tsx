import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Mail, Phone, MapPin, Send, Users, Headphones } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { apiService } from '../services/api'

const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await apiService.sendContactForm(formData)
      
      if (response.success) {
        showToast(response.message || 'Message sent successfully! We\'ll get back to you soon.', 'success')
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        })
      } else {
        showToast(response.message || 'Failed to send message. Please try again.', 'error')
      }
    } catch (error) {
      console.error('Contact form error:', error)
      showToast(error instanceof Error ? error.message : 'Failed to send message. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Contact Us - voicenotescribe</title>
        <meta name="description" content="Get in touch with voicenotescribe support team. We're here to help with your transcription needs." />
      </Helmet>
      
      <div className="min-h-screen gradient-bg">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
          <div className="relative compact-container py-8 lg:py-12">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-2xl lg:text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Get in Touch
              </h1>
              <p className="text-base lg:text-lg text-gray-600 leading-relaxed">
                Have questions about our transcription service? We're here to help!
              </p>
            </div>
          </div>
        </section>

        <div className="compact-container py-8">
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">Email Support</h3>
                      <a href="mailto:support@voicenotescribe.com" className="text-blue-600 hover:text-blue-700 text-sm">
                        support@voicenotescribe.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">Response Time</h3>
                      <p className="text-gray-600 text-sm">Within 24 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Quick Links */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Help</h3>
                <div className="space-y-2">
                  <a href="#faq" className="block text-blue-600 hover:text-blue-700 text-sm">
                    • How do I upload audio files?
                  </a>
                  <a href="#faq" className="block text-blue-600 hover:text-blue-700 text-sm">
                    • What audio formats are supported?
                  </a>
                  <a href="#faq" className="block text-blue-600 hover:text-blue-700 text-sm">
                    • How accurate are the transcriptions?
                  </a>
                  <a href="#faq" className="block text-blue-600 hover:text-blue-700 text-sm">
                    • Can I get a refund?
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Send us a Message</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        placeholder="Your full name"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
                    >
                      <option value="">Select a subject</option>
                      <option value="general">General Inquiry</option>
                      <option value="technical">Technical Support</option>
                      <option value="billing">Billing Question</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="partnership">Partnership</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-sm"
                      placeholder="Please describe your inquiry in detail..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-sm ${
                      isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:from-blue-700 hover:to-purple-700'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section id="faq" className="compact-container py-8">
          <div className="text-center mb-8">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
            <p className="text-base text-gray-600 max-w-2xl mx-auto">
              Find quick answers to common questions about our transcription service
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">How do I upload audio files for transcription?</h3>
              <p className="text-gray-600 text-sm">
                Simply send your WhatsApp voice messages to our dedicated number, or upload audio files directly through our web dashboard. We support MP3, WAV, M4A, and many other formats.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">What audio formats are supported?</h3>
              <p className="text-gray-600 text-sm">
                We support a wide range of audio formats including MP3, WAV, FLAC, M4A, AAC, OGG, and video formats like MP4, MPEG, and WEBM. Audio files are automatically extracted from video files.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">How accurate are the transcriptions?</h3>
              <p className="text-gray-600 text-sm">
                Our AI-powered transcription service achieves 95%+ accuracy for clear audio recordings. Accuracy may vary based on audio quality, background noise, and speaker accents.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">Can I get a refund if I'm not satisfied?</h3>
              <p className="text-gray-600 text-sm">
                Yes, we offer a 30-day money-back guarantee. If you're not satisfied with our service, contact our support team and we'll process your refund promptly.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-base font-bold text-gray-900 mb-2">Is my data secure and private?</h3>
              <p className="text-gray-600 text-sm">
                Absolutely. All audio files and transcriptions are encrypted and stored securely. We never share your data with third parties and automatically delete files after 30 days unless you specify otherwise.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default ContactUs
