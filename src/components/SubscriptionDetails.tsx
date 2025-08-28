import React, { useEffect, useState } from 'react';
import { CreditCard, Calendar, Clock, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { apiService } from '../services/api';

interface SubscriptionDetailsProps {
  onRefresh?: () => void;
}

const SubscriptionDetails: React.FC<SubscriptionDetailsProps> = ({ onRefresh }) => {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSubscriptionDetails();
      
      if (response.success) {
        setSubscriptionData(response.data);
      } else {
        setError(response.message || 'Failed to load subscription details');
      }
    } catch (err) {
      console.error('Error fetching subscription details:', err);
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle className="h-5 w-5 mr-2" />
          <h3 className="text-lg font-semibold">Error Loading Subscription</h3>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchSubscriptionDetails}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!subscriptionData?.subscription) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
          <p className="text-gray-600 mb-4">
            You don't have an active subscription. Upgrade to unlock premium features.
          </p>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            View Plans
          </button>
        </div>
      </div>
    );
  }

  const { subscription, paymentHistory, usageStats } = subscriptionData;

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Current Subscription</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            subscription.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Minutes Used</p>
                <p className="text-lg font-semibold text-blue-900">
                  {subscription.usedMinutes} / {subscription.subscriptionMinutes}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600">Amount</p>
                <p className="text-lg font-semibold text-green-900">
                  {subscription.currency} {subscription.amount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600">Billing Cycle</p>
                <p className="text-lg font-semibold text-purple-900 capitalize">
                  {subscription.interval}ly
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm text-orange-600">Minutes Left</p>
                <p className="text-lg font-semibold text-orange-900">
                  {subscription.minutesLeft}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Period</p>
            <p className="text-sm font-medium">
              {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Plan Type</p>
            <p className="text-sm font-medium capitalize">{subscription.plan}</p>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{usageStats.totalTranscriptions}</div>
            <p className="text-sm text-gray-600">Total Transcriptions</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{usageStats.completedTranscriptions}</div>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{usageStats.failedTranscriptions}</div>
            <p className="text-sm text-gray-600">Failed</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{formatFileSize(usageStats.totalFileSize)}</div>
            <p className="text-sm text-gray-600">Total File Size</p>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      {paymentHistory && paymentHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
          <div className="space-y-3">
            {paymentHistory.slice(0, 5).map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.currency} {payment.amount} - {payment.planType}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  payment.paymentStatus === 'paid' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {payment.paymentStatus}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionDetails;
