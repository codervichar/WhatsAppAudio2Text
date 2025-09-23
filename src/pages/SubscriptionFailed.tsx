import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, Home, RefreshCw, AlertTriangle } from 'lucide-react';

const SubscriptionFailed: React.FC = () => {
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('error') || 'Payment verification failed';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center py-12 px-4">
      <Helmet>
        <title>Payment Failed - voicenotescribe</title>
        <meta name="description" content="Your payment verification failed. Please try again." />
      </Helmet>
      
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Verification Failed
        </h1>
        
        <p className="text-gray-600 mb-6">
          {errorMessage}
        </p>

        {/* Warning */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-700">
              <strong>Important:</strong> If you were charged, please contact our support team for assistance.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/pricing"
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Again
          </Link>
          
          <Link
            to="/dashboard"
            className="w-full flex items-center justify-center px-4 py-3 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors duration-200"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Dashboard
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            Need help? Contact our support team for assistance.
          </p>
          <Link
            to="/"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionFailed;
