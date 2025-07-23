import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { FileText, CreditCard, Settings, ChevronDown, Search, MessageCircle, Upload, Zap, Star, Users, Clock, CheckCircle, TrendingUp, Shield, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'
import waQr from '../assets/wa_qr.png';

const countryCodes = [
  { code: '+93', label: 'Afghanistan' },
  { code: '+91', label: 'India' },
  { code: '+1', label: 'USA' },
  // Add more as needed
];
const languages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  // Add more as needed
];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // WhatsApp Transcript state
  const [waCountry, setWaCountry] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [waLang, setWaLang] = useState<string | number>('');
  const [waAlert, setWaAlert] = useState(false);
  const [countryOptions, setCountryOptions] = useState<{ code: string; label: string; phonecode?: string }[]>([]);
  const [languageOptions, setLanguageOptions] = useState<{ id: number; code: string; label: string }[]>([]);
  // Country dropdown state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ code: string; label: string; phonecode?: string } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });

  // Show notification for 3 seconds
  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => setNotification({ message: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Update waNumber on change and validate
  // const handleWaNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const value = e.target.value.replace(/\D/g, '');
  //   setWaNumber(value);
  //   validateMobileNumber(value);
  // };

  useEffect(() => {
    // Fetch countries
    apiService.getCountries().then(data => {
      if (data.success && data.data.length > 0) {
        setCountryOptions(data.data);
        setWaCountry(data.data[0].code);
      }
    });
    // Fetch languages
    apiService.getLanguages().then(data => {
      if (data.success && data.data.length > 0) {
        setLanguageOptions(data.data);
      }
    });
  }, []);

  // Prefill WhatsApp Transcript form when profile, countryOptions, and languageOptions are loaded
  useEffect(() => {
    if (profile && countryOptions.length > 0 && languageOptions.length > 0) {
      // Prefill country
      if (profile.country_code) {
        const foundCountry = countryOptions.find(c => c.code === profile.country_code);
        if (foundCountry) setSelectedCountry(foundCountry);
      }
      // Prefill WhatsApp number
      if (profile.wtp_number) setWaNumber(profile.wtp_number);
      // Prefill language
      if (profile.wa_language) setWaLang(profile.wa_language);
    }
  }, [profile, countryOptions, languageOptions]);

  const handleWaSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaAlert(false);
    if (!selectedCountry || !waNumber || !waLang) {
      setWaAlert(true);
      setNotification({ message: 'Please fill all fields.', type: 'error' });
      return;
    }
    try {
      const res = await apiService.updateWhatsAppTranscript({
        country_code: selectedCountry.code,
        wtp_number: waNumber,
        wa_language: waLang as number
      });
      if (res.success) {
        setNotification({ message: 'WhatsApp transcript info updated successfully!', type: 'success' });
      } else {
        setWaAlert(true);
        setNotification({ message: res.message || 'Failed to update info.', type: 'error' });
      }
    } catch (err: any) {
      setWaAlert(true);
      setNotification({ message: err.message || 'Failed to update info.', type: 'error' });
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await apiService.getProfile();
        if (res.success) {
          setProfile(res.data.user);
        } else {
          setError(res.message || 'Failed to load profile');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center min-h-[40vh]">Loading...</div>;
  }
  if (error) {
    return <div className="flex justify-center items-center min-h-[40vh] text-red-600">{error}</div>;
  }

  const userName = profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'User';
  const userEmail = profile?.email || '';
  const subscription = profile?.subscription || {};
  const subscriptionMinutes = Number(subscription.subscription_minutes) || 0;
  const usedMinutes = Number(subscription.used_minutes) || 0;
  const minutesLeft = Math.max(subscriptionMinutes - usedMinutes, 0);
  const plan = subscription.plan || 'free';

  let planLabel = '';
  if (plan === 'pro') {
    planLabel = 'Monthly Paid (3000 min)';
  } else if (plan === 'free') {
    planLabel = 'Free Plan (60 min)';
  } else {
    planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  }

  // Filtered countries for search
  const filteredCountries = countryOptions.filter((country) =>
    country.label.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
    (country.phonecode && country.phonecode.toString().includes(countrySearchTerm)) ||
    country.code.toLowerCase().includes(countrySearchTerm.toLowerCase())
  );

  // Handle country select
  const handleCountrySelect = (country: { code: string; label: string; phonecode?: string }) => {
    setSelectedCountry(country);
    setWaCountry(country.phonecode || '');
    setCountrySearchTerm('');
    setIsCountryDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isCountryDropdownOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredCountries.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCountries.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredCountries[highlightedIndex]) {
          handleCountrySelect(filteredCountries[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsCountryDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Notification Toast */}
      {notification.message && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white transition-all duration-500 transform ${notification.type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'} flex items-center gap-3`}
          style={{ minWidth: 280 }}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-white" />
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          )}
          <span className="font-medium">{notification.message}</span>
        </div>
      )}
      
      <Helmet>
        <title>Dashboard - WhatsApp2Text</title>
        <meta name="description" content="Manage your WhatsApp2Text account, view your transcriptions, and update your subscription." />
      </Helmet>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full mb-6">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">Welcome back!</span>
            </div>
            <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Hello, {userName} 👋
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Transform your WhatsApp audio messages into accurate text transcriptions with our advanced AI technology.
            </p>
          </div>
        </div>
      </div>

      {/* WhatsApp Transcript Section */}
      <section className="relative bg-gradient-to-br from-white to-gray-50 py-20">
        <div className="container mx-auto px-4 mb-16">
        <div className="flex flex-col lg:flex-row gap-10 max-w-7xl mx-auto">
          {/* Left: Form */}
          <form className="flex-1 bg-white rounded-3xl shadow-2xl p-10 flex flex-col gap-8 border border-gray-100" onSubmit={handleWaSave}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">WhatsApp Transcript</h2>
                <p className="text-gray-500 text-sm">Configure your WhatsApp integration</p>
              </div>
              <span className="ml-auto px-3 py-1 text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full">BETA</span>
            </div>
            
            {waAlert && (
              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl flex items-center">
                <svg className="w-5 h-5 mr-3 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12A9 9 0 11 3 12a9 9 0 0118 0z" /></svg>
                <span className="text-yellow-800 font-medium">Please make sure you have entered valid WhatsApp number.</span>
              </div>
            )}
          <div className="space-y-6">
            <div>
              <label className="block font-semibold text-gray-700 mb-4 text-lg">WhatsApp Number</label>
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Searchable Country Dropdown */}
                <div className="relative lg:min-w-[220px]">
                  <label className="block text-sm text-gray-600 mb-2">Country Code</label>
                  <button
                    type="button"
                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                    className="w-full flex items-center justify-between border-2 border-gray-200 rounded-2xl px-4 py-4 bg-gray-50 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 hover:border-gray-300"
                  >
                    <span className="text-left text-gray-700 font-medium">
                      {selectedCountry ? `+${selectedCountry.phonecode} ${selectedCountry.label}` : 'Select Country'}
                    </span>
                    <ChevronDown size={20} className="text-gray-400" />
                  </button>
                  {isCountryDropdownOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-60 overflow-hidden">
                      {/* Search Input */}
                      <div className="p-3 border-b border-gray-200">
                        <div className="relative">
                          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search countries..."
                            value={countrySearchTerm}
                            onChange={(e) => {
                              setCountrySearchTerm(e.target.value);
                              setHighlightedIndex(-1);
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-gray-50"
                            autoFocus
                          />
                        </div>
                      </div>
                      {/* Country List */}
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((country, index) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => handleCountrySelect(country)}
                              className={`w-full text-left px-4 py-3 focus:outline-none text-base rounded-xl transition-colors ${
                                index === highlightedIndex
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">+{country.phonecode} {country.label}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-base">No countries found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Mobile Number Input */}
                <div className="flex-1">
                  <label htmlFor="waNumber" className="block text-sm text-gray-600 mb-2">Mobile Number</label>
                  <input
                    id="waNumber"
                    type="text"
                    value={waNumber}
                    onChange={e => setWaNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 bg-gray-50 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 text-base font-medium hover:border-gray-300"
                    placeholder="Enter mobile number (without country code)"
                    maxLength={15}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-4 text-lg">Expected Transcript Language</label>
              <select 
                value={waLang} 
                onChange={e => setWaLang(Number(e.target.value))} 
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 bg-gray-50 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300 text-base font-medium hover:border-gray-300"
              >
                <option value="">Select Language</option>
                {languageOptions.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-5 rounded-2xl font-bold text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-100 mt-4"
            >
              Save & Update Configuration
            </button>
          </div>
        </form>
        
        {/* Right: QR Code */}
        <div className="flex-1 bg-white rounded-3xl p-10 flex flex-col items-center border border-gray-100 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-lg">
              <Upload className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Scan QR Code</h3>
            <p className="text-gray-600 text-lg">Send audio messages through WhatsApp for transcription</p>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-white p-8 rounded-3xl border-2 border-gray-200 mb-8 shadow-lg">
            <img src={waQr} alt="WhatsApp QR Code" className="w-56 h-56 rounded-2xl shadow-lg" />
          </div>
          
          <a 
            href="https://wa.me/18587077403" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 font-semibold text-xl"
          >
            <MessageCircle className="w-6 h-6" />
            Open in WhatsApp
          </a>
          
          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
            <div className="flex items-center gap-3 text-blue-700">
              <Shield className="w-5 h-5" />
              <span className="font-medium text-base">File size limit: 16 MB (WhatsApp limitation)</span>
            </div>
          </div>
        </div>
              </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="relative bg-gradient-to-br from-gray-50 to-white py-20">
        <div className="container mx-auto px-4 mb-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <p className="text-gray-600 max-w-3xl mx-auto text-lg">Manage your account, view transcriptions, and upgrade your subscription</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto">
          {/* Transcriptions Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center border border-gray-100 transform hover:scale-105 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Transcriptions</h3>
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-2">Minutes remaining this month</p>
              <div className="text-3xl font-bold text-blue-600">{minutesLeft}</div>
            </div>
            <Link 
              to="/transcription-history" 
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-2xl text-center font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              View History
            </Link>
          </div>
          
          {/* Subscription Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center border border-gray-100 transform hover:scale-105 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Subscription</h3>
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-2">Current Plan</p>
              <div className="text-lg font-bold text-purple-600">{planLabel}</div>
            </div>
            {plan !== 'pro' ? (
              <Link 
                to="/pricing" 
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-2xl text-center font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Upgrade to Pro
              </Link>
            ) : (
              <div className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-2xl text-center font-semibold">
                Pro Plan Active
              </div>
            )}
          </div>
          
          {/* Account Settings Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center border border-gray-100 transform hover:scale-105 transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mb-6">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Account Settings</h3>
            <div className="text-center mb-6">
              <p className="text-gray-600 mb-2">Email Address</p>
              <div className="text-sm font-medium text-gray-900 break-all">{userEmail}</div>
            </div>
            <Link 
              to="/update-profile" 
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-2xl text-center font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Update Profile
            </Link>
          </div>
        </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-gradient-to-br from-white to-gray-50 py-20">
        <div className="container mx-auto px-4 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose WhatsApp2Text?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">Advanced AI-powered transcription with high accuracy and fast processing</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Fast Processing</h3>
            <p className="text-gray-600 text-sm">Get transcriptions in seconds with our optimized AI</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">High Accuracy</h3>
            <p className="text-gray-600 text-sm">Advanced speech recognition with 95%+ accuracy</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Multi-Language</h3>
            <p className="text-gray-600 text-sm">Support for 50+ languages and dialects</p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600 text-sm">Your data is encrypted and never shared</p>
          </div>
        </div>
        </div>
      </section>
    </div>
  )
}

export default Dashboard