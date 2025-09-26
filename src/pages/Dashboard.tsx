import React, { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { FileText, CreditCard, Settings, MessageCircle, Zap, Star, CheckCircle, Shield, Globe, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiService } from '../services/api'
import waQr from '../assets/wa_qr.png';



const Dashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


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

  const handleReactivateSubscription = async () => {
    try {
      setCanceling(true);
      const response = await apiService.reactivateSubscription();

      if (response.success) {
        setNotification({
          message: 'Your subscription has been reactivated successfully!',
          type: 'success'
        });
        // Refresh profile data to update subscription status
        await fetchProfile();
      } else {
        setNotification({ message: response.message || 'Failed to reactivate subscription', type: 'error' });
      }
    } catch (err: any) {
      setNotification({ message: err.message || 'Failed to reactivate subscription. Please try again.', type: 'error' });
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
      planLabel = `Monthly Paid (${subscriptionMinutes} min) - Canceling on ${endDate}`;
    } else {
      planLabel = `Monthly Paid (${subscriptionMinutes} min)`;
    }
  } else if (plan === 'free') {
    planLabel = `Free Plan (${subscriptionMinutes} min)`;
  } else {
    planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  }


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
        <title>Dashboard - voicenotescribe</title>
        <meta name="description" content="Manage your voicenotescribe account, view your transcriptions, and update your subscription." />
      </Helmet>

      {/* WhatsApp Integration & Quick Actions Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-green-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Compact Welcome Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 px-3 py-1.5 rounded-full mb-3">
                <Star className="w-3 h-3 text-yellow-500" />
                <span className="text-xs font-medium text-gray-700">Welcome back!</span>
              </div>
              <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Hello, {userName} 👋
              </h1>
              <p className="text-sm text-gray-600 max-w-2xl mx-auto mb-6">
                Transform your WhatsApp audio messages into accurate text transcriptions with our advanced AI technology.
              </p>
            </div>

            {/* Main Content - Single Row Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: WhatsApp Integration */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">WhatsApp Integration</h3>
                    <p className="text-sm text-gray-600">Connect with our WhatsApp bot for instant transcription</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* QR Code */}
                    <div className="flex flex-col items-center space-y-3">
                  <div className="text-center">
                        <h4 className="text-base font-bold text-gray-900 mb-2">WhatsApp Number</h4>
                        <div className="text-xl font-bold text-green-600 bg-green-50 px-3 py-2 rounded-lg border-2 border-green-200 shadow-lg">
                      +1 (813) 896-3315
                    </div>
                        <p className="text-xs text-gray-500 mt-1">OR scan the QR code</p>
                  </div>

                  <div className="relative">
                        <div className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border-2 border-gray-200 shadow-lg">
                          <img src={waQr} alt="WhatsApp QR Code" className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg" />
                    </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>

                    {/* Instructions & Actions */}
                    <div className="flex flex-col justify-center space-y-3">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-gray-900">How it works</h4>
                        <div className="space-y-1.5">
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-green-600 font-bold text-xs">1</span>
                            </div>
                            <p className="text-xs text-gray-700">Save the number or scan QR code</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-green-600 font-bold text-xs">2</span>
                        </div>
                            <p className="text-xs text-gray-700">Send audio messages to our bot</p>
                      </div>
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-green-600 font-bold text-xs">3</span>
                        </div>
                            <p className="text-xs text-gray-700">Get instant transcriptions</p>
                      </div>
                    </div>
                  </div>

                      <div className="space-y-2">
                    <a
                      href="https://wa.me/18138963315"
                      target="_blank"
                      rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 text-xs"
                    >
                          <MessageCircle className="w-3 h-3" />
                      Open in WhatsApp
                    </a>

                        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-200">
                          <Shield className="w-2.5 h-2.5" />
                          <span className="text-xs font-medium">File size limit: 16 MB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Quick Actions */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Quick Actions</h3>
                    <p className="text-sm text-gray-600">Manage your account and view transcriptions</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Transcriptions Card */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="text-center mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <FileText className="w-5 h-5 text-white" />
                              </div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1">Transcriptions</h4>
                        <p className="text-xs text-gray-600">Minutes remaining: <span className="font-bold text-blue-600">{minutesLeft}</span></p>
              </div>
              <Link
                to="/transcription-history"
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-3 rounded-lg text-center font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-xs flex items-center justify-center"
              >
                View History
              </Link>
            </div>

            {/* Subscription Card */}
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="text-center mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <CreditCard className="w-5 h-5 text-white" />
              </div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1">Subscription</h4>
                        <p className="text-xs text-gray-600">{planLabel}</p>
                {isCanceling && currentPeriodEnd && (
                          <p className="text-xs text-yellow-800 mt-1">
                            Canceling on {new Date(currentPeriodEnd).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                      })}
                    </p>
                )}
              </div>
              {plan === 'free' ? (
                <Link
                  to="/pricing"
                          className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 px-3 rounded-lg text-center font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-xs flex items-center justify-center"
                >
                  Upgrade to Pro
                </Link>
              ) : (
                        <div className="space-y-1.5">
                          <div className={`w-full text-white py-1.5 px-3 rounded-lg text-center font-semibold text-xs flex items-center justify-center ${isCanceling
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                      : 'bg-gradient-to-r from-green-500 to-green-600'
                    }`}>
                    {isCanceling ? 'Pro Plan - Canceling' : 'Pro Plan Active'}
                  </div>
                    {!isCanceling ? (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                              className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-1.5 px-3 rounded-lg text-center font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-1.5 text-xs"
                      >
                              <X className="w-2.5 h-2.5" />
                        Cancel Subscription
                      </button>
                    ) : (
                      <button
                        onClick={handleReactivateSubscription}
                        disabled={canceling}
                              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-1.5 px-3 rounded-lg text-center font-semibold hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50 text-xs"
                      >
                        {canceling ? (
                          <>
                                  <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  Reactivate
                          </>
                        )}
                      </button>
                    )}
                </div>
              )}
            </div>

            {/* Account Settings Card */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                      <div className="text-center mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <Settings className="w-5 h-5 text-white" />
              </div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1">Account Settings</h4>
                        <p className="text-xs text-gray-600 break-all">{userEmail}</p>
              </div>
              <Link
                to="/update-profile"
                        className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-3 rounded-lg text-center font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-xs flex items-center justify-center"
              >
                Update Profile
              </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Features Section */}
      <section className="relative bg-gradient-to-br from-white to-gray-50 py-20">
        <div className="container mx-auto px-4 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose voicenotescribe?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Advanced transcription with high accuracy and fast processing</p>
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
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-medium">Your subscription will remain active until the end of the current billing period</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard