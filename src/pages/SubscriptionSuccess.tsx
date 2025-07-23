import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Home, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SubscriptionSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simulate loading time for better UX
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <Helmet>
          <title>Processing Payment - WhatsApp2Text</title>
          <meta name="description" content="Processing your subscription payment..." />
        </Helmet>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Processing your payment...</h2>
          <p className="text-gray-500 mt-2">Please wait while we confirm your subscription.</p>
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

        {/* Session ID (for debugging) */}
        {sessionId && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6">
            <p className="text-xs text-gray-500">
              Session ID: {sessionId}
            </p>
          </div>
        )}

        {/* User Info */}
        {user && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <User className="h-5 w-5 text-blue-600 mr-2" />
              <span className="font-medium text-blue-900">{user.name}</span>
            </div>
            <p className="text-sm text-blue-700">
              Your subscription is now active
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