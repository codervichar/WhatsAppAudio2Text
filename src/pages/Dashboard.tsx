import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { FileText, CreditCard, Settings, ChevronDown, Search, MessageCircle, Upload, Zap, Star, Users, Clock, CheckCircle, TrendingUp, Shield, Globe, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'
import waQr from '../assets/wa_qr.png';


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
  const [countryOptions, setCountryOptions] = useState<{ id: number; code: string; label: string; phonecode?: string; iso?: string }[]>([]);
  const [languageOptions, setLanguageOptions] = useState<{ id: number; code: string; label: string }[]>([]);
  // Country dropdown state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ id: number; code: string; label: string; phonecode?: string; iso?: string } | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);

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
    }).catch(error => {
      console.error('Failed to fetch countries:', error);
    });
    
    // Fetch languages
    apiService.getLanguages().then(data => {
      if (data.success && data.data.length > 0) {
        setLanguageOptions(data.data);
      }
    }).catch(error => {
      console.error('Failed to fetch languages:', error);
    });
  }, []);

  // Prefill WhatsApp Transcript form when profile, countryOptions, and languageOptions are loaded
  useEffect(() => {
    if (profile && countryOptions.length > 0 && languageOptions.length > 0) {
      // Prefill country
      if (profile.country_code) {
        console.log('Profile country_code:', profile.country_code, typeof profile.country_code);
        console.log('Available countries:', countryOptions.map(c => ({ id: c.id, code: c.code, label: c.label })));
        const foundCountry = countryOptions.find(c => c.id === Number(profile.country_code));
        console.log('Found country:', foundCountry);
        if (foundCountry) setSelectedCountry(foundCountry);
      }
      // Prefill WhatsApp number - extract only the number part (remove country code)
      if (profile.wtp_number) {
        let phoneNum = profile.wtp_number;
        if (phoneNum.startsWith('+')) {
          // Remove the + and country code, keep only the number
          phoneNum = phoneNum.replace(/^\+[0-9]+/, '');
        }
        setWaNumber(phoneNum);
      }
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
        country_code: selectedCountry.id,
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

  const handleCancelSubscription = async () => {
    try {
      setCanceling(true);
      const response = await apiService.cancelSubscription();
      
      if (response.success) {
        setShowCancelConfirm(false);
        setNotification({ 
          message: 'Your subscription has been scheduled for cancellation at the end of the current billing period. You will continue to have access to Pro features until then.', 
          type: 'success' 
        });
        // Refresh profile data to update subscription status
        await fetchProfile();
      } else {
        setNotification({ message: response.message || 'Failed to cancel subscription', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to cancel subscription. Please try again.', type: 'error' });
    } finally {
      setCanceling(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await apiService.getProfile();
      console.log('Profile API response:', res);
      if (res.success) {
        console.log('Profile data:', res.data.user);
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

  useEffect(() => {
    fetchProfile();
  }, []);

  // Refresh profile data when component becomes visible (e.g., after payment verification)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchProfile();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
  const subscriptionStatus = profile?.subscription?.status;
  const isCanceling = subscriptionStatus === 'canceling' || subscriptionStatus === 'canceled';
  const currentPeriodEnd = profile?.subscription?.current_period_end;
  
  if (plan === 'pro' || plan === 'monthly') {
    if (isCanceling && currentPeriodEnd) {
      const endDate = new Date(currentPeriodEnd).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      planLabel = `Monthly Paid (3000 min) - Canceling on ${endDate}`;
    } else {
      planLabel = 'Monthly Paid (3000 min)';
    }
  } else if (plan === 'free') {
    planLabel = `Free Plan (${subscriptionMinutes} min)`;
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
  const handleCountrySelect = (country: { id: number; code: string; label: string; phonecode?: string; iso?: string }) => {
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
      <section className="relative bg-gradient-to-br from-white to-gray-50 py-8">
        <div className="compact-container mb-8">
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">
          {/* Left: Form */}
          <form className="flex-1 bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 border border-gray-100" onSubmit={handleWaSave}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">WhatsApp Transcript</h2>
                <p className="text-gray-500 text-xs">Configure your WhatsApp integration</p>
              </div>
              <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full">BETA</span>
            </div>
            
            {waAlert && (
              <div className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg flex items-center">
                <svg className="w-4 h-4 mr-2 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12A9 9 0 11 3 12a9 9 0 0118 0z" /></svg>
                <span className="text-yellow-800 font-medium text-sm">Please make sure you have entered valid WhatsApp number.</span>
              </div>
            )}
          
            <div>
              <label className="block font-semibold text-gray-700 mb-2 text-sm">WhatsApp Number</label>
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Searchable Country Dropdown */}
                                 <div className="relative lg:w-24">
                   <button
                     type="button"
                     onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                     className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-300 text-sm h-10"
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
                              setCountrySearchTerm(e.target.value);
                              setHighlightedIndex(-1);
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
                       <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                       </svg>
                     </div>
                     <input
                       id="waNumber"
                       type="text"
                       value={waNumber}
                       onChange={e => setWaNumber(e.target.value.replace(/\D/g, ''))}
                       className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-medium hover:border-gray-300 h-10"
                       placeholder="Enter mobile number (without country code)"
                       maxLength={15}
                     />
                   </div>
                 </div>
              </div>
            </div>
            
            <div>
              <label className="block font-semibold text-gray-700 mb-2 text-sm">Expected Transcript Language</label>
              <select 
                value={waLang} 
                onChange={e => setWaLang(Number(e.target.value))} 
                className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm font-medium hover:border-gray-300"
              >
                <option value="">Select Language</option>
                {languageOptions.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
            
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 rounded-lg font-semibold text-sm shadow-md hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-100 mt-2"
            >
              Save & Update Configuration
            </button>
          </form>
        
        {/* Right: QR Code */}
        <div className="flex-1 bg-white rounded-xl p-6 flex flex-col items-center border border-gray-100 shadow-lg">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-3 mx-auto shadow-md">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Scan QR Code</h3>
            <p className="text-gray-600 text-sm">Send audio messages through WhatsApp for transcription</p>
          </div>
          
          {/* WhatsApp Number Display */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600 mb-2">WhatsApp Number:</p>
            <div className="text-3xl font-bold text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200 mb-3">
              +1 (813) 896-3315
            </div>
            <div className="text-lg font-semibold text-gray-700">
              OR
            </div>
            <div className="text-lg font-semibold text-gray-700 mt-1">
              scan QR code
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border border-gray-200 mb-4 shadow-md">
            <img src={waQr} alt="WhatsApp QR Code" className="w-40 h-40 rounded-lg shadow-md" />
          </div>
          
          <a 
            href="https://wa.me/18138963315" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-md hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 font-semibold text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Open in WhatsApp
          </a>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700">
              <Shield className="w-4 h-4" />
              <span className="font-medium text-xs">File size limit: 16 MB (WhatsApp limitation)</span>
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
              {isCanceling && currentPeriodEnd && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-800">
                    <strong>Note:</strong> Your subscription will remain active until {new Date(currentPeriodEnd).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              )}
            </div>
            {plan === 'free' ? (
              <Link 
                to="/pricing" 
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-2xl text-center font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Upgrade to Pro
              </Link>
            ) : (
              <div className="w-full space-y-3">
                <div className={`w-full text-white py-3 px-6 rounded-2xl text-center font-semibold ${
                  isCanceling 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' 
                    : 'bg-gradient-to-r from-green-500 to-green-600'
                }`}>
                  {isCanceling ? 'Pro Plan - Canceling' : 'Pro Plan Active'}
                </div>
                <div className="flex gap-2">
                  <Link 
                    to="/subscription-management" 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-xl text-center font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-sm"
                  >
                    Manage
                  </Link>
                  {!isCanceling && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-2 px-4 rounded-xl text-center font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-sm flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  )}
                </div>
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

      {/* Cancel Subscription Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel your subscription? Your subscription will remain active until the end of the current billing period, and you'll continue to have access to all Pro features until then.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {canceling ? 'Processing...' : 'Yes, Cancel Subscription'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard