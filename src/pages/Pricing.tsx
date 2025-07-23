import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Star, Gift, Loader2, Zap, Shield, Globe, Clock, ArrowRight, Sparkles, Crown, Users, Award, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

interface PricingTierProps {
  name: string;
  price: string;
  period: string;
  transcriptionTime: string;
  features: string[];
  highlight?: boolean;
  icon: React.ReactNode;
  cta: string;
  priceId?: string;
  planType?: string;
  onSubscribe?: (priceId: string, planType: string) => void;
  isLoading?: boolean;
}

const PricingTier: React.FC<PricingTierProps> = ({ 
  name, 
  price, 
  period, 
  transcriptionTime, 
  features, 
  highlight, 
  icon, 
  cta, 
  priceId,
  planType,
  onSubscribe,
  isLoading
}) => (
  <div className={`relative bg-white p-10 rounded-3xl shadow-2xl border border-gray-100 flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-3xl ${
    highlight 
      ? 'ring-4 ring-purple-200 bg-gradient-to-br from-white to-purple-50' 
      : 'hover:ring-2 hover:ring-blue-200'
  }`}
    style={{ minHeight: 520 }}>
    {highlight && (
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4" />
          Most Popular
        </div>
      </div>
    )}
    
    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-8 ${
      highlight 
        ? 'bg-gradient-to-br from-purple-500 to-blue-500' 
        : 'bg-gradient-to-br from-blue-500 to-blue-600'
    } shadow-lg`}>
      <div className="text-white">{icon}</div>
    </div>
    
    <h3 className="text-3xl font-bold mb-4 text-center text-gray-900">{name}</h3>
    
    <div className="text-center mb-6">
      <div className="flex items-baseline justify-center">
        <span className="text-6xl font-extrabold text-gray-900">{price}</span>
        {price !== 'Free' && (
          <span className="text-xl font-medium text-gray-500 ml-2">/{period}</span>
        )}
      </div>
      <p className="text-gray-600 mt-2 text-lg font-medium">{transcriptionTime}</p>
    </div>
    
    <ul className="mb-10 w-full space-y-4">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start text-base text-gray-700">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">
            <Check size={14} className="text-green-600" />
          </div>
          <span className="leading-relaxed">{feature}</span>
        </li>
      ))}
    </ul>
    
    {price === 'Free' ? (
      <Link 
        to="/signup" 
        className="group w-full py-4 rounded-2xl text-lg font-semibold transition-all duration-300 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-4 focus:ring-blue-200 focus:outline-none text-center block shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
      >
        <span>Get Started</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
      </Link>
    ) : (
      <button
        onClick={() => onSubscribe && priceId && planType && onSubscribe(priceId, planType)}
        disabled={isLoading}
        className="group w-full py-4 rounded-2xl text-lg font-semibold transition-all duration-300 bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 focus:ring-4 focus:ring-purple-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <span>{cta}</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </>
        )}
      </button>
    )}
  </div>
)

const Pricing: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Log environment variables
  console.log('Environment variables:', {
    VITE_PRO_MONTHLY_MINUTES: import.meta.env.VITE_PRO_MONTHLY_MINUTES,
    VITE_PRO_MONTHLY_AMOUNT: import.meta.env.VITE_PRO_MONTHLY_AMOUNT,
    VITE_PRICE_ID: import.meta.env.VITE_PRICE_ID
  });

  const handleSubscribe = async (priceId: string, planType: string) => {
    console.log('handleSubscribe called with:', { priceId, planType });
    
    if (!isAuthenticated) {
      // Redirect to signup if not authenticated
      window.location.href = '/signup';
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.createCheckoutSession({
        priceId,
        planType
      });

      if (response.success && response.data?.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative container mx-auto px-4 py-20 lg:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full mb-8">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Flexible Pricing</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Choose Your Plan
            </h1>
            <p className="text-xl lg:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              Start for free and upgrade anytime. Enjoy high-accuracy WhatsApp audio transcription with flexible plans for every need.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative bg-gradient-to-br from-white to-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto mb-20">
        <PricingTier
          name="Free Plan"
          price="Free"
          period=""
          transcriptionTime="Up to 60 minutes of transcription per month"
          features={[
            "Basic transcription features",
            "Limited to 60 minutes per month",
            "No credit card required",
            "Email support"
          ]}
          icon={<Gift size={40} strokeWidth={1.5} />}
          cta="Get Started"
        />
        <PricingTier
          name="Monthly Plan"
          price={`$${import.meta.env.VITE_PRO_MONTHLY_AMOUNT || '19.99'}`}
          period="month"
          transcriptionTime={`Up to ${import.meta.env.VITE_PRO_MONTHLY_MINUTES || '3000'} minutes of transcription per month`}
          features={[
            "All Free Plan features",
            `${import.meta.env.VITE_PRO_MONTHLY_MINUTES || '3000'} minutes per month`,
            "Priority email support",
            "Cancel anytime"
          ]}
          icon={<Star size={40} strokeWidth={1.5} />}
          cta="Subscribe Now"
          highlight
          priceId={import.meta.env.VITE_PRICE_ID || "price_1Q6hxPP13qL7MTOtxr64kvMs"}
          planType="monthly"
          onSubscribe={handleSubscribe}
          isLoading={isLoading}
        />
        </div>
        </div>

        {/* Features Section */}
        <section className="relative bg-gradient-to-br from-gray-50 to-white py-20">
          <div className="container mx-auto px-4 mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">All Plans Include</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every plan comes with our core features to ensure the best transcription experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">High Accuracy</h3>
              <p className="text-gray-600">Advanced AI technology ensures 95%+ transcription accuracy</p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Email Support</h3>
              <p className="text-gray-600">Get help whenever you need it with our responsive support team</p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-3xl shadow-2xl border border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">No Commitment</h3>
              <p className="text-gray-600">Cancel anytime with no long-term contracts or hidden fees</p>
            </div>
          </div>
        </div>
        </section>

        {/* FAQ Section */}
        <section className="relative bg-gradient-to-br from-white to-gray-50 py-20">
          <div className="container mx-auto px-4 mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to know about our pricing and plans
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-blue-600" />
                </div>
                Can I upgrade or downgrade anytime?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Yes! You can upgrade to a paid plan anytime, and you can also downgrade back to the free plan. 
                Changes take effect immediately.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-4 h-4 text-green-600" />
                </div>
                What languages do you support?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                We support 50+ languages including English, Spanish, French, German, Hindi, and many more. 
                Our AI automatically detects the language in your audio.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
                Is my data secure?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Absolutely! We use enterprise-grade encryption and never store your audio files permanently. 
                Your privacy and security are our top priorities.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-orange-600" />
                </div>
                How fast is the transcription?
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Most transcriptions are completed within 30 seconds to 2 minutes, depending on the audio length. 
                We'll notify you as soon as it's ready.
              </p>
            </div>
          </div>
        </div>
        </section>

        {/* CTA Section */}
        <section className="relative bg-gradient-to-br from-gray-50 to-white py-20">
          <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of users who trust WhatsApp2Text for their transcription needs
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/signup" 
                className="group bg-white text-blue-600 px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 shadow-xl flex items-center justify-center gap-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link 
                to="/dashboard" 
                className="group bg-white/10 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border-2 border-white/30 flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <Sparkles className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
        </section>
      </section>
    </div>
  )
}

export default Pricing