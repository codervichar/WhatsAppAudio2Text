import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, User, CreditCard, Calendar, Clock, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

// Helper function to format date as "28th Aug, 2025"
const formatDateWithOrdinal = (date: Date): string => {
  const day = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  
  // Add ordinal suffix to day
  const getOrdinalSuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
};

const SubscriptionSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationCompleted, setVerificationCompleted] = useState(false);
  const sessionId = searchParams.get('session_id');

  // Memoize the profile refresh function to prevent infinite loops
  const refreshUserProfile = useCallback(async () => {
    try {
      // Get fresh user data
      const profileResponse = await apiService.getProfile();
      if (profileResponse.success && profileResponse.data?.user) {
        // Update local user data with fresh subscription info
        const updatedUser = profileResponse.data.user;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        // Refresh the user state in context
        refreshUser();
        console.log('✅ User profile refreshed after payment verification');
      }
    } catch (profileError) {
      console.warn('⚠️ Failed to refresh user profile:', profileError);
      // Don't fail the entire flow if profile refresh fails
    }
  }, [refreshUser]); // Only depend on refreshUser

  useEffect(() => {
    // Prevent multiple verification attempts
    if (verificationCompleted) {
      return;
    }

    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setIsLoading(false);
        setVerificationCompleted(true);
        return;
      }

      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setError('Payment verification timed out. Please check your subscription status or contact support.');
        setIsLoading(false);
        setVerificationCompleted(true);
      }, 30000); // 30 seconds timeout

      try {
        console.log('🔍 Verifying payment session:', sessionId);
        // Verify the payment session
        const response = await apiService.verifyPaymentSession(sessionId);
        
        clearTimeout(timeoutId); // Clear timeout on success
        
        if (response.success) {
          const sessionData = response.data?.session;
          
          // Check payment status
          if (sessionData?.paymentStatus === 'paid') {
            console.log('📊 Payment details received:', response.data);
            setPaymentDetails(response.data);
            // Refresh user profile data to get updated subscription info
            await refreshUserProfile();
          } else if (sessionData?.paymentStatus === 'unpaid') {
            setError('Payment was not completed. Please try again or contact support.');
          } else if (sessionData?.paymentStatus === 'canceled') {
            setError('Payment was canceled. No charges were made to your account.');
          } else {
            setError(`Payment status: ${sessionData?.paymentStatus || 'unknown'}. Please contact support.`);
          }
        } else {
          console.error('Payment verification failed:', response);
          setError(response.message || 'Failed to verify payment');
        }
      } catch (err) {
        clearTimeout(timeoutId); // Clear timeout on error
        console.error('Payment verification error:', err);
        // Provide more specific error message
        if (err instanceof Error) {
          setError(`Payment verification failed: ${err.message}`);
        } else {
          setError('Failed to verify payment. Please try again or contact support.');
        }
      } finally {
        setIsLoading(false);
        setVerificationCompleted(true);
      }
    };

    verifyPayment();
  }, [sessionId, refreshUserProfile, verificationCompleted]); // Include verificationCompleted in dependencies

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <Helmet>
          <title>Processing Payment - WhatsApp2Text</title>
          <meta name="description" content="Processing your subscription payment..." />
        </Helmet>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Verifying your payment...</h2>
          <p className="text-gray-500 mt-2">Please wait while we confirm your subscription.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center py-12 px-4">
        <Helmet>
          <title>Payment Error - WhatsApp2Text</title>
          <meta name="description" content="There was an issue with your payment" />
        </Helmet>
        
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Verification Failed
          </h1>
          
          <p className="text-gray-600 mb-6">
            {error}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Try Again
            </button>
            
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center px-4 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-200"
            >
              <Home className="h-5 w-5 mr-2" />
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4">
      <Helmet>
        <title>Subscription Successful - WhatsApp2Text</title>
        <meta name="description" content="Your subscription has been successfully activated!" />
      </Helmet>
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Thank you for subscribing to WhatsApp2Text! Your account has been upgraded and you now have access to {import.meta.env.VITE_PRO_MONTHLY_MINUTES || '3000'} minutes of transcription per month.
        </p>

        {/* Payment Details */}
        {paymentDetails && (
          <div className="space-y-4 mb-6">
            {/* Payment Amount */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">Payment Amount</span>
                </div>
                <span className="text-lg font-bold text-green-900">
                  {paymentDetails.session.currency.toUpperCase()} {paymentDetails.session.amountTotal}
                </span>
              </div>
            </div>

            {/* Subscription Period */}
            {(paymentDetails.subscription || paymentDetails.session) && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-blue-900">Subscription Period</span>
                </div>
                <div className="text-sm text-blue-700">
                  {paymentDetails.subscription && paymentDetails.subscription.currentPeriodStart && paymentDetails.subscription.currentPeriodEnd ? (
                    <>
                      <div>From: {(() => {
                        const startDate = new Date(paymentDetails.subscription.currentPeriodStart);
                        return startDate.getTime() > 0 ? formatDateWithOrdinal(startDate) : 'Processing...';
                      })()}</div>
                      <div>To: {(() => {
                        const endDate = new Date(paymentDetails.subscription.currentPeriodEnd);
                        return endDate.getTime() > 0 ? formatDateWithOrdinal(endDate) : 'Processing...';
                      })()}</div>
                    </>
                  ) : paymentDetails.session && paymentDetails.session.createdAt ? (
                    <>
                      <div>From: {formatDateWithOrdinal(new Date(paymentDetails.session.createdAt))}</div>
                      <div>To: {(() => {
                        const endDate = new Date(paymentDetails.session.createdAt);
                        endDate.setDate(endDate.getDate() + 30); // Add 30 days
                        return formatDateWithOrdinal(endDate);
                      })()}</div>
                    </>
                  ) : (
                    <>
                      <div>From: Processing...</div>
                      <div>To: Processing...</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* User Info */}
            {user && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <User className="h-5 w-5 text-purple-600 mr-2" />
                  <span className="font-medium text-purple-900">{user.name}</span>
                </div>
                <p className="text-sm text-purple-700 text-center">
                  Your subscription is now active
                </p>
              </div>
            )}
          </div>
        )}

        {/* Session ID (for debugging) */}
        {sessionId && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-gray-500">
              Session ID: {sessionId}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Dashboard
          </Link>
          
          <Link
            to="/transcription"
            className="w-full flex items-center justify-center px-4 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-200"
          >
            Start Transcribing
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            You'll receive a confirmation email shortly. If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess; 