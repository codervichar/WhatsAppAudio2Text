import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CreditCard, Calendar, Clock, AlertTriangle, CheckCircle, ArrowLeft, Download } from 'lucide-react';
import { apiService } from '../services/api';

const SubscriptionManagement: React.FC = () => {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downgrading, setDowngrading] = useState(false);
  const [showDowngradeConfirm, setShowDowngradeConfirm] = useState(false);

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

  const handleDowngrade = async () => {
    try {
      setDowngrading(true);
      const response = await apiService.cancelSubscription();
      
      if (response.success) {
        setShowDowngradeConfirm(false);
        // Refresh subscription data
        await fetchSubscriptionDetails();
        alert('Your subscription has been scheduled for cancellation at the end of the current billing period. You will continue to have access to Pro features until then.');
      } else {
        alert(response.message || 'Failed to downgrade subscription');
      }
    } catch (err) {
      console.error('Error downgrading subscription:', err);
      alert('Failed to downgrade subscription. Please try again.');
    } finally {
      setDowngrading(false);
    }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading subscription details...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Error Loading Subscription</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={fetchSubscriptionDetails}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!subscriptionData?.subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-4">No Active Subscription</h2>
          <p className="text-gray-600 mb-6">
            You don't have an active subscription. Upgrade to unlock premium features.
          </p>
          <div className="space-y-3">
            <Link
              to="/pricing"
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Plans
            </Link>
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { subscription, paymentHistory, usageStats } = subscriptionData;
  const isCanceling = subscription.status === 'canceled' || subscription.status === 'canceling';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Helmet>
        <title>Subscription Management - WhatsApp2Text</title>
        <meta name="description" content="Manage your WhatsApp2Text subscription" />
      </Helmet>

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Current Subscription */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Current Subscription</h2>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                isCanceling 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : subscription.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
              }`}>
                {isCanceling ? 'Canceling' : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
              </span>
            </div>

            {isCanceling && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Your subscription will be canceled at the end of the current billing period
                    </p>
                    <p className="text-sm text-yellow-700">
                      You'll continue to have access to Pro features until {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-blue-50 rounded-xl p-6">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-blue-600 mr-3" />
                  <div>
                    <p className="text-sm text-blue-600">Minutes Used</p>
                    <p className="text-xl font-bold text-blue-900">
                      {subscription.usedMinutes} / {subscription.subscriptionMinutes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-6">
                <div className="flex items-center">
                  <CreditCard className="h-6 w-6 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm text-green-600">Amount</p>
                    <p className="text-xl font-bold text-green-900">
                      {subscription.currency} {subscription.amount}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-6">
                <div className="flex items-center">
                  <Calendar className="h-6 w-6 text-purple-600 mr-3" />
                  <div>
                    <p className="text-sm text-purple-600">Billing Cycle</p>
                    <p className="text-xl font-bold text-purple-900 capitalize">
                      {subscription.interval}ly
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-xl p-6">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-orange-600 mr-3" />
                  <div>
                    <p className="text-sm text-orange-600">Minutes Left</p>
                    <p className="text-xl font-bold text-orange-900">
                      {subscription.minutesLeft}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-sm text-gray-600 mb-2">Current Period</p>
                <p className="text-lg font-medium">
                  {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Plan Type</p>
                <p className="text-lg font-medium capitalize">{subscription.plan}</p>
              </div>
            </div>

            {/* Action Buttons */}
            {!isCanceling && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setShowDowngradeConfirm(true)}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors duration-200"
                  >
                    Downgrade to Free Plan
                  </button>
                  <Link
                    to="/pricing"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors duration-200 text-center"
                  >
                    Change Plan
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Usage Statistics */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Usage Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{usageStats.totalTranscriptions}</div>
                <p className="text-sm text-gray-600">Total Transcriptions</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{usageStats.completedTranscriptions}</div>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{usageStats.failedTranscriptions}</div>
                <p className="text-sm text-gray-600">Failed</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {Math.round(usageStats.totalFileSize / (1024 * 1024))} MB
                </div>
                <p className="text-sm text-gray-600">Total File Size</p>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          {paymentHistory && paymentHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Payments</h3>
              <div className="space-y-4">
                {paymentHistory.slice(0, 5).map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-gray-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {payment.currency} {payment.amount} - {payment.planType}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(payment.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
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
      </div>

      {/* Downgrade Confirmation Modal */}
      {showDowngradeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-4">Downgrade to Free Plan</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to downgrade to the free plan? Your subscription will be canceled at the end of the current billing period ({formatDate(subscription.currentPeriodEnd)}).
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleDowngrade}
                  disabled={downgrading}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {downgrading ? 'Processing...' : 'Yes, Downgrade'}
                </button>
                <button
                  onClick={() => setShowDowngradeConfirm(false)}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
