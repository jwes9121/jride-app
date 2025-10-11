"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  phone: string;
  user_type: string;
  wallet_balance: number;
}

interface PayoutHistory {
  id: string;
  transaction_id: string;
  type: 'weekly_payout' | 'emergency_payout';
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  description: string;
}

export default function CashOutPage() {
  const [user, setUser] = useState<User | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('gcash');
  const [paymentDetails, setPaymentDetails] = useState({
    gcash_number: '',
    account_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('cashout');
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistory[]>([]);
  const [monthlyStats, setMonthlyStats] = useState({
    totalWeeklyPayouts: 0,
    totalEmergencyPayouts: 0,
    totalServiceFees: 0,
    totalNetReceived: 0
  });

  useEffect(() => {
    const userData = localStorage.getItem('j-ride-user');
    if (userData) {
      setUser(JSON.parse(userData));
      if (JSON.parse(userData).user_type === 'driver') {
        loadPayoutHistory();
      }
    }
  }, []);

  const loadPayoutHistory = async () => {
    try {
      const token = localStorage.getItem('j-ride-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'get_payout_history'
        })
      });

      const data = await response.json();
      if (data.success) {
        setPayoutHistory(data.payout_history);
        setMonthlyStats(data.monthly_stats);
      }
    } catch (error) {
      console.error('Error loading payout history:', error);
    }
  };

  const maxCashOut = user ? Math.max(0, user.wallet_balance - 200) : 0;
  const quickAmounts = [500, 1000, 2000, 5000].filter(amt => amt <= maxCashOut);

  const handleEmergencyCashOut = async () => {
    const cashOutAmount = parseFloat(amount);
    
    if (!cashOutAmount || cashOutAmount < 500) {
      alert('Minimum emergency cash-out amount is â‚±500');
      return;
    }

    if (cashOutAmount > maxCashOut) {
      alert(`Maximum emergency cash-out amount is â‚±${maxCashOut.toFixed(2)} (â‚±200 must remain)`);
      return;
    }

    if (!paymentDetails.gcash_number) {
      alert('Please enter your GCash number');
      return;
    }

    setLoading(true);
    
    try {
      const token = localStorage.getItem('j-ride-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/wallet-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'emergency_cashout',
          amount: cashOutAmount,
          method: selectedMethod,
          payment_details: paymentDetails
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update user balance safely (user is User | null)
setUser((prev) => {
  if (!prev) return prev; // nothing to update
  const updated = { ...prev, wallet_balance: Number(data.new_balance ?? prev.wallet_balance) };
  try {
    localStorage.setItem('j-ride-user', JSON.stringify(updated));
  } catch {}
  return updated;
});

  } catch {}
  return updated;
});

        
        alert(`Emergency cash-out processed!\nGross: â‚±${data.gross_amount}\nService Fee: â‚±${data.service_fee}\nNet Amount: â‚±${data.net_amount}\nTransaction ID: ${data.transaction_id}`);
        
        // Reload payout history
        loadPayoutHistory();
        setAmount('');
      } else {
        alert(data.message || 'Emergency cash-out failed');
      }
    } catch (error) {
      console.error('Emergency cash-out error:', error);
      alert('Emergency cash-out failed. Please try again.');
    }
    
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user.user_type !== 'driver') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <i className="ri-error-warning-line text-6xl text-orange-500 mb-4"></i>
          <h2 className="text-xl font-bold mb-2">Driver Payout System</h2>
          <p className="text-gray-600 mb-4">This feature is only available for drivers.</p>
          <Link href="/wallet" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold">
            Back to Wallet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 text-white">
        <div className="flex items-center justify-between mb-6">
          <Link href="/wallet">
            <button className="w-10 h-10 flex items-center justify-center">
              <i className="ri-arrow-left-line text-xl text-white"></i>
            </button>
          </Link>
          <h1 className="text-xl font-bold">Driver Payouts</h1>
          <div className="w-10"></div>
        </div>

        <div className="text-center">
          <div className="text-sm opacity-90 mb-2">Available for Emergency Cash-Out</div>
          <div className="text-2xl font-bold">â‚±{maxCashOut.toFixed(2)}</div>
          <div className="text-xs opacity-80 mt-1">â‚±200 minimum balance required</div>
        </div>
      </div>

      <div className="bg-white border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('cashout')}
            className={`flex-1 p-4 text-center font-medium ${
              activeTab === 'cashout' 
                ? 'text-orange-500 border-b-2 border-orange-500' 
                : 'text-gray-600'
            }`}
          >
            Emergency Cash-Out
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 p-4 text-center font-medium ${
              activeTab === 'history' 
                ? 'text-orange-500 border-b-2 border-orange-500' 
                : 'text-gray-600'
            }`}
          >
            Payout History
          </button>
        </div>
      </div>

      {activeTab === 'cashout' && (
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">ðŸ“… Weekly Automatic Payouts</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>â€¢ Every Friday: Automatic transfer to your GCash</li>
              <li>â€¢ Free of charge (no service fees)</li>
              <li>â€¢ Transfers amount above â‚±200 minimum balance</li>
              <li>â€¢ SMS notification after every payout</li>
            </ul>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h3 className="font-semibold mb-4">ðŸš¨ Emergency Cash-Out</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payout Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600">â‚±</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Minimum â‚±500"
                  min="500"
                  max={maxCashOut}
                  className="w-full pl-8 pr-4 py-4 text-2xl font-bold border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {quickAmounts.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {quickAmounts.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount.toString())}
                    className="bg-orange-50 text-orange-600 py-3 rounded-xl font-semibold hover:bg-orange-100"
                  >
                    â‚±{quickAmount}
                  </button>
                ))}
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <div className="flex items-center space-x-2">
                <i className="ri-alert-line text-yellow-600"></i>
                <span className="text-sm text-yellow-700">
                  {amount && parseFloat(amount) === 500 
                    ? 'â‚±20 service fee applies for â‚±500 cashouts' 
                    : 'No fees for cashouts above â‚±500'}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GCash Number</label>
                <input
                  type="tel"
                  value={paymentDetails.gcash_number}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, gcash_number: e.target.value })}
                  placeholder="09XXXXXXXXX"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                <input
                  type="text"
                  value={paymentDetails.account_name}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, account_name: e.target.value })}
                  placeholder="Full name as registered in GCash"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {amount && parseFloat(amount) >= 500 && (
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Gross Amount:</span>
                    <span className="font-semibold">â‚±{parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Service Fee:</span>
                    <span className="font-semibold">
                      {parseFloat(amount) === 500 ? '-â‚±20.00' : 'â‚±0.00'}
                    </span>
                  </div>
                  <div className="border-t pt-1 flex justify-between font-bold">
                    <span>Net Amount:</span>
                    <span>
                      â‚±{(parseFloat(amount) - (parseFloat(amount) === 500 ? 20 : 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleEmergencyCashOut}
              disabled={loading || !amount || parseFloat(amount) < 500 || parseFloat(amount) > maxCashOut || !paymentDetails.gcash_number}
              className="w-full bg-red-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-red-600 disabled:bg-gray-300"
            >
              {loading ? 'Processing...' : `Emergency Cash-Out â‚±${amount || '0'}`}
            </button>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h4 className="font-semibold text-red-800 mb-2">âš ï¸ Emergency Cash-Out Rules</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>â€¢ Minimum: â‚±500 per transaction</li>
              <li>â€¢ Service fee: â‚±20 for â‚±500 cashouts only</li>
              <li>â€¢ No fees for amounts above â‚±500</li>
              <li>â€¢ â‚±200 must remain in wallet for bookings</li>
              <li>â€¢ Instant transfer to GCash after processing</li>
              <li>â€¢ Use only for urgent financial needs</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 p-4 rounded-xl">
              <div className="text-green-600 text-sm font-medium">Weekly Payouts</div>
              <div className="text-xl font-bold text-green-700">â‚±{monthlyStats.totalWeeklyPayouts.toFixed(2)}</div>
              <div className="text-xs text-green-600">Last 30 days</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl">
              <div className="text-orange-600 text-sm font-medium">Emergency Payouts</div>
              <div className="text-xl font-bold text-orange-700">â‚±{monthlyStats.totalEmergencyPayouts.toFixed(2)}</div>
              <div className="text-xs text-orange-600">Last 30 days</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 p-4 rounded-xl">
              <div className="text-red-600 text-sm font-medium">Service Fees Paid</div>
              <div className="text-xl font-bold text-red-700">â‚±{monthlyStats.totalServiceFees.toFixed(2)}</div>
              <div className="text-xs text-red-600">Emergency fees only</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="text-blue-600 text-sm font-medium">Net Received</div>
              <div className="text-xl font-bold text-blue-700">â‚±{monthlyStats.totalNetReceived.toFixed(2)}</div>
              <div className="text-xs text-blue-600">After all fees</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Payout History</h3>
            </div>
            
            <div className="divide-y">
              {payoutHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <i className="ri-history-line text-4xl mb-4"></i>
                  <p>No payout history yet</p>
                </div>
              ) : (
                payoutHistory.map((payout) => (
                  <div key={payout.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payout.type === 'weekly_payout' ? 'bg-green-100' : 'bg-orange-100'
                        }`}>
                          <i className={`${
                            payout.type === 'weekly_payout' ? 'ri-calendar-check-line text-green-600' : 'ri-alarm-warning-line text-orange-600'
                          }`}></i>
                        </div>
                        <div>
                          <div className="font-medium">
                            {payout.type === 'weekly_payout' ? 'Weekly Payout' : 'Emergency Cash-Out'}
                          </div>
                          <div className="text-xs text-gray-600">
                            {new Date(payout.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">+â‚±{payout.net_amount.toFixed(2)}</div>
                        {payout.fee_amount > 0 && (
                          <div className="text-xs text-red-600">Fee: â‚±{payout.fee_amount.toFixed(2)}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">ID: {payout.transaction_id}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





