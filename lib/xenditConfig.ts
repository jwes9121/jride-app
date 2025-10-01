
// Xendit configuration constants
export const XENDIT_CONFIG = {
  // These will be set in Supabase Edge Function secrets
  API_BASE_URL: 'https://api.xendit.co',
  
  // Payment channels
  CHANNELS: {
    GCASH: 'PH_GCASH',
    PAYMAYA: 'PH_PAYMAYA',
    GRAB_PAY: 'PH_GRABPAY'
  },
  
  // Minimum amounts
  MIN_TOPUP: 1,
  MIN_PAYOUT: 100,
  
  // Payment status
  STATUS: {
    PENDING: 'PENDING',
    SUCCEEDED: 'SUCCEEDED',
    FAILED: 'FAILED',
    EXPIRED: 'EXPIRED'
  }
};

// Helper functions for Xendit integration
export const formatPaymentReference = (type: string, userId: string) => {
  return `${type}_${userId}_${Date.now()}`;
};

export const formatPaymentAmount = (amount: number) => {
  return Math.round(amount * 100) / 100; // Round to 2 decimal places
};

export const isValidPhone = (phone: string) => {
  // Philippine mobile number format
  const phoneRegex = /^(09|\+639)\d{9}$/;
  return phoneRegex.test(phone);
};

export const formatPhoneForXendit = (phone: string) => {
  // Ensure phone is in +63 format for Xendit
  if (phone.startsWith('09')) {
    return `+63${phone.substring(1)}`;
  }
  return phone;
};
