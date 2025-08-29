import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';

const PaymentTest: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testPayment = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('🧪 Testing payment flow...');
      console.log('🧪 User:', user);
      
      const response = await apiService.createCheckoutSession({
        priceId: import.meta.env.VITE_PRICE_ID || "price_1Q6hxPP13qL7MTOtxr64kvMs",
        planType: "monthly"
      });

      console.log('🧪 Payment response:', response);
      setResult(response);

      if (response.success && response.data?.url) {
        console.log('🧪 Redirecting to:', response.data.url);
        window.location.href = response.data.url;
      } else {
        setError(response.message || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error('🧪 Payment test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Test</h1>
        
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">User Info:</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Environment Variables:</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify({
              VITE_PRICE_ID: import.meta.env.VITE_PRICE_ID,
              VITE_PRO_MONTHLY_AMOUNT: import.meta.env.VITE_PRO_MONTHLY_AMOUNT,
              VITE_PRO_MONTHLY_MINUTES: import.meta.env.VITE_PRO_MONTHLY_MINUTES
            }, null, 2)}
          </pre>
        </div>

        <button
          onClick={testPayment}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testing...' : 'Test Payment'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Result:</h2>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentTest;
