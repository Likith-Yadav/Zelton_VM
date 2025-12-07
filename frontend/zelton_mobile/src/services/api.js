import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, STORAGE_KEYS } from "../constants/constants";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // Increased timeout for payment requests and network issues (45 seconds)
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "Accept": "application/json",
  },
  // Allow all status codes to be handled properly
  validateStatus: function (status) {
    return status >= 200 && status < 600; // Allow all status codes
  },
  // Disable credentials for better compatibility
  withCredentials: false,
  // Add retry configuration for connection issues
  retry: 0, // We handle retries manually for better control
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      console.log("Request interceptor - original config:", {
        url: config.url,
        method: config.method,
        data: config.data,
        headers: config.headers,
      });

      // Don't add token for authentication endpoints and public endpoints
      if (
        config.url &&
        (config.url.includes("/api/auth/") ||
          config.url.includes("/api/pricing-plans/"))
      ) {
        // For auth endpoints, ensure clean headers
        config.headers["Content-Type"] = "application/json";
        
        // Only disable credentials for login/register endpoints (not OTP endpoints)
        if (config.url.includes("/api/auth/login/") || 
            config.url.includes("/api/auth/register/")) {
          config.withCredentials = false; // Disable credentials for login/register
        } else {
          config.withCredentials = true; // Enable credentials for OTP endpoints
        }
        return config;
      }

      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);

      // Handle FormData uploads - don't modify headers
      if (config.data instanceof FormData) {
        console.log("FormData detected - preserving headers");
        // Don't set Content-Type for FormData - let the browser set it with boundary
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
        // Don't stringify FormData - completely disable transform
        config.transformRequest = [];
        config.transformResponse = [];
        // Ensure axios doesn't modify the data
        config.data = config.data;
        // Add token but skip the rest of the interceptor for FormData
        if (
          token &&
          token !== "undefined" &&
          token !== "null" &&
          token.trim() !== ""
        ) {
          config.headers.Authorization = `Token ${token}`;
        }
        return config;
      } else {
        // For non-FormData requests, set Content-Type to application/json
        config.headers["Content-Type"] = "application/json";
      }

      if (
        token &&
        token !== "undefined" &&
        token !== "null" &&
        token.trim() !== ""
      ) {
        config.headers.Authorization = `Token ${token}`;
      } else {
        console.warn("No valid token found for API request to:", config.url);
      }

      console.log("Request interceptor - modified config:", {
        url: config.url,
        method: config.method,
        data: config.data instanceof FormData ? "FormData" : config.data,
        dataType: typeof config.data,
        headers: config.headers,
      });
    } catch (error) {
      console.error("Error getting token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Handle network errors (connection issues, port 443 errors, etc.)
    if (!error.response) {
      // Network error - could be connection timeout, port 443 issue, etc.
      console.error("Network error detected:", error.message);
      // Don't clear token for network errors - might be temporary connection issue
      return Promise.reject({
        ...error,
        isNetworkError: true,
        message: error.message || "Network error. Please check your connection and try again.",
      });
    }

    // Handle 401 errors - but check if it's a real auth issue or network issue
    if (error.response && error.response.status === 401) {
      const originalRequest = error.config;
      
      // Check if it's a connection error masquerading as 401
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || "";
      const errorData = error.response?.data || {};
      
      // Check for network-related error codes or messages
      const isConnectionError = 
        errorMessage.toLowerCase().includes("connection") ||
        errorMessage.toLowerCase().includes("timeout") ||
        errorMessage.toLowerCase().includes("443") ||
        errorMessage.toLowerCase().includes("network") ||
        errorMessage.toLowerCase().includes("failed to fetch") ||
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        error.code === "ERR_NETWORK" ||
        error.message?.includes("Network Error");
      
      // Check if error message suggests authorization token issue
      const isAuthError = 
        errorMessage.toLowerCase().includes("authorization") ||
        errorMessage.toLowerCase().includes("token") ||
        errorMessage.toLowerCase().includes("authentication") ||
        errorMessage.toLowerCase().includes("unauthorized") ||
        errorData.code === "AUTHORIZATION_FAILED";
      
      // Don't clear token if it's clearly a network error
      if (isConnectionError && !isAuthError) {
        console.warn("401 error appears to be connection issue, not auth issue");
        return Promise.reject({
          ...error,
          isNetworkError: true,
          isConnectionError: true,
          message: "Connection error. Please check your internet connection and try again.",
        });
      }
      
      // Only clear token for actual auth errors, and only if not already cleared
      if (isAuthError || (!isConnectionError && !originalRequest._retry)) {
        // Mark request as retried to prevent infinite loops
        originalRequest._retry = true;
        
        // Check if we already have a token before clearing
        const existingToken = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
        if (existingToken && existingToken !== "undefined" && existingToken !== "null") {
          console.warn("401 authorization error detected - token may be invalid");
          // Only clear token if this is not an auth endpoint (to avoid clearing during login attempts)
          if (!originalRequest.url?.includes("/api/auth/login") && 
              !originalRequest.url?.includes("/api/auth/register")) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);
              console.log("Cleared stored authentication data due to 401 authorization error");
      } catch (clearError) {
        console.error("Error clearing stored data:", clearError);
            }
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post("/api/auth/login/", credentials),
  register: (userData) => api.post("/api/auth/register/", userData),
  logout: () => api.post("/api/auth/logout/"),
  refreshToken: (refreshToken) =>
    api.post("/api/auth/refresh/", { refresh: refreshToken }),
  sendOTP: (data) => api.post("/api/auth/send_otp/", data),
  verifyOTP: (data) => api.post("/api/auth/verify_otp/", data),
};

// Owner API
export const ownerAPI = {
  getProfile: () => api.get("/api/owners/profile/"),
  updateProfile: (data) => api.patch("/api/owners/", data),
  getDashboard: () => api.get("/api/owners/dashboard/"),
  getPricingPlans: () => api.get("/api/pricing-plans/"),
  getPlanForProperties: (count) =>
    api.get(`/api/pricing-plans/get_plan_for_properties/?count=${count}`),
};

// Owner Subscription API
export const ownerSubscriptionAPI = {
  initiateSubscriptionPayment: async (pricingPlanId, period = "monthly", isUpgrade = false) => {
    const endpoint = isUpgrade 
      ? "/api/owner-subscriptions/initiate_upgrade/"
      : "/api/owner-subscriptions/initiate_payment/";
    return retryRequest(
      () => api.post(endpoint, {
        pricing_plan_id: pricingPlanId,
        period: period,
      }),
      5, // max retries (increased for better reliability)
      1000
    );
  },

  verifySubscriptionPayment: (merchantOrderId) =>
    api.get(`/api/owner-subscriptions/verify-payment/${merchantOrderId}/`),

  handleSubscriptionCallback: (orderId, status) =>
    api.post("/api/owner-subscriptions/payment_callback/", {
      orderId,
      status,
    }),

  getActiveSubscription: () => api.get("/api/owner-subscriptions/active/"),

  getSubscriptionPayments: () => api.get("/api/owner-subscriptions/"),

  // Add new methods
  checkLimits: () => api.get("/api/owner-subscriptions/check_limits/"),
  getAvailablePlans: () => api.get("/api/owner-subscriptions/available_plans/"),
};

// Property API
export const propertyAPI = {
  getProperties: () => api.get("/api/properties/"),
  getProperty: (id) => api.get(`/api/properties/${id}/`),
  createProperty: (data) => api.post("/api/properties/", data),
  updateProperty: (id, data) => api.patch(`/api/properties/${id}/`, data),
  deleteProperty: (id) => api.delete(`/api/properties/${id}/`),
  generateTenantKey: (id, unitId) =>
    api.post(`/api/properties/${id}/generate_tenant_key/`, { unit_id: unitId }),
};

// Unit API
export const unitAPI = {
  getUnits: (propertyId) => api.get(`/api/units/?property=${propertyId}`),
  getUnit: (id) => api.get(`/api/units/${id}/`),
  createUnit: (data) => api.post("/api/units/", data),
  updateUnit: (id, data) => api.patch(`/api/units/${id}/`, data),
  deleteUnit: (id) => api.delete(`/api/units/${id}/`),
};

// Tenant API
export const tenantAPI = {
  getProfile: () => api.get("/api/tenants/profile/"),
  updateProfile: (data) => api.patch("/api/tenants/", data),
  getDashboard: () => api.get("/api/tenants/dashboard/"),
  joinProperty: (key) => api.post("/api/tenants/join-property/", { key }),
};

// Retry utility for network errors - more aggressive retries for payment requests
const retryRequest = async (requestFn, maxRetries = 5, delay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      // Check if it's a retryable error (network error or connection issue)
      const isRetryable = 
        error.isNetworkError ||
        error.isConnectionError ||
        !error.response || // Network error (no response)
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ENOTFOUND" ||
        (error.response && error.response.status === 401 && error.isConnectionError) ||
        (error.response && error.response.status >= 500); // Server errors
      
      if (!isRetryable || attempt === maxRetries - 1) {
        // Not retryable or last attempt
        throw error;
      }
      
      // Calculate exponential backoff delay (capped at 10 seconds)
      const waitTime = Math.min(delay * Math.pow(1.5, attempt), 10000);
      console.log(`Request failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${waitTime}ms...`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

// Payment API
export const paymentAPI = {
  getPayments: () => api.get("/api/payments/"),
  getPayment: (id) => api.get(`/api/payments/${id}/`),

  // PhonePe Integration Methods with retry logic
  initiateTenantRentPayment: async (amount, paymentType = "rent") => {
    return retryRequest(
      () => api.post("/api/payments/initiate_rent_payment/", {
        amount,
        payment_type: paymentType,
      }),
      5, // max retries (increased for better reliability)
      1000 // initial delay in ms
    );
  },

  verifyPaymentStatus: async (merchantOrderId) => {
    return retryRequest(
      () => api.get(`/api/payments/verify-payment/${merchantOrderId}/`),
      5, // max retries (increased for better reliability)
      1000
    );
  },

  handlePaymentCallback: (orderId, status) =>
    api.post("/api/payments/handle-payment-callback/", {
      orderId,
      status,
    }),

  initiateRefund: (paymentId, amount = null) =>
    api.post(`/api/payments/${paymentId}/refund/`, {
      amount,
    }),

  // Legacy methods (keeping for backward compatibility)
  initiatePayment: (id) => api.post(`/api/payments/${id}/initiate_payment/`),
  verifyPayment: (id, transactionId) =>
    api.post(`/api/payments/${id}/verify_payment/`, {
      transaction_id: transactionId,
    }),
  uploadPaymentProof: (id, formData) =>
    api.post(`/api/payments/${id}/upload_proof/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  createRentPayment: (data) => api.post("/api/payments/create_rent_payment/", data),
  completePayment: (id) => api.post(`/api/payments/${id}/complete_payment/`),
};

// Invoice API
export const invoiceAPI = {
  getInvoices: () => api.get("/api/invoices/"),
  getInvoice: (id) => api.get(`/api/invoices/${id}/`),
  downloadInvoice: (id) => api.get(`/api/invoices/${id}/download/`),
};

// Tenant Document API
export const tenantDocumentAPI = {
  uploadDocument: (formData) =>
    api.post("/api/tenants/upload_document/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),
  getDocuments: () => api.get("/api/tenants/documents/"),
  downloadDocument: (id) => api.get(`/api/tenants/documents/${id}/download/`),
  deleteDocument: (id) => api.delete(`/api/tenants/documents/${id}/`),
};

// Owner Document API
export const ownerDocumentAPI = {
  getDocumentsByUnit: (unitId) =>
    api.get(`/api/tenant-documents/by_unit/${unitId}/`),
  downloadDocument: (id) => api.get(`/api/tenant-documents/download/${id}/`),
};

// Utility functions
export const handleAPIError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    switch (status) {
      case 400:
        return data.message || "Bad request. Please check your input.";
      case 401:
        return "Unauthorized. Please login again.";
      case 403:
        return "Forbidden. You do not have permission to perform this action.";
      case 404:
        return "Resource not found.";
      case 422:
        return data.message || "Validation error. Please check your input.";
      case 500:
        return "Internal server error. Please try again later.";
      default:
        return data.message || "An error occurred. Please try again.";
    }
  } else if (error.request) {
    // Network error
    return "Network error. Please check your internet connection.";
  } else {
    // Other error
    return "An unexpected error occurred. Please try again.";
  }
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const isServerError = (error) => {
  return error.response && error.response.status >= 500;
};

export const isClientError = (error) => {
  return (
    error.response &&
    error.response.status >= 400 &&
    error.response.status < 500
  );
};

// Test API connection
export const testAPI = {
  testConnection: async () => {
    try {
      console.log('Testing API connection...');
      const response = await api.get('/api/pricing-plans/');
      console.log('API connection test successful:', response.status);
      return response;
    } catch (error) {
      console.error('API connection test failed:', error);
      throw error;
    }
  },
};

// Payment Proof API functions
export const paymentProofAPI = {
  // Upload payment proof (Tenant) - Using fetch API like document upload
  uploadPaymentProof: async (unitId, amount, paymentProofImage, description = "") => {
    try {
      console.log('Payment proof upload data:', {
        unitId,
        amount,
        paymentProofImage,
        description
      });

      // Create FormData for file upload with proper React Native format (same as tenant documents)
      const formData = new FormData();
      formData.append('unit', unitId);
      formData.append('amount', amount);
      
      // For React Native, append the file object directly (same as document upload)
      formData.append('payment_proof_image', {
        uri: paymentProofImage.uri,
        type: paymentProofImage.mimeType || paymentProofImage.type || 'image/jpeg',
        name: paymentProofImage.name || paymentProofImage.fileName || 'payment_proof.jpg',
      });
      
      formData.append('description', description || '');

      console.log('Uploading payment proof:', {
        unit: unitId,
        amount: amount,
        file_name: paymentProofImage.name || paymentProofImage.fileName,
        file_size: paymentProofImage.fileSize,
        file_type: paymentProofImage.mimeType || paymentProofImage.type,
        description: description,
      });

      console.log('Making API request with fetch to:', '/api/manual-payment-proofs/');
      
      // Use fetch API directly (same as document upload) to avoid axios FormData issues
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);

      const response = await fetch(`${API_BASE_URL}/api/manual-payment-proofs/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          // Don't set Content-Type - let fetch handle it for FormData
        },
        body: formData,
      });

      console.log('Fetch response status:', response.status);
      console.log('Fetch response ok:', response.ok);
      console.log('Fetch response headers:', response.headers);

      if (!response.ok) {
        const responseText = await response.text();
        console.log('Error response text:', responseText);
        
        let errorData = {};
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          console.log('Response is not JSON:', responseText.substring(0, 200));
        }
        
        throw new Error(errorData.error || errorData.detail || responseText.substring(0, 100) || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Payment proof upload response:', data);
      
      return { success: true, data };
    } catch (error) {
      console.error('Payment proof upload error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
      });
      throw error;
    }
  },

  // Get my payment proofs (Tenant)
  getMyPaymentProofs: async () => {
    try {
      const response = await api.get('/api/manual-payment-proofs/my_proofs/');
      return response;
    } catch (error) {
      console.error('Get payment proofs error:', error);
      throw error;
    }
  },

  // Get pending payment proofs (Owner)
  getPendingPaymentProofs: async () => {
    try {
      const response = await api.get('/api/manual-payment-proofs/pending/');
      return response;
    } catch (error) {
      console.error('Get pending payment proofs error:', error);
      throw error;
    }
  },

  // Verify payment proof (Owner)
  verifyPaymentProof: async (proofId, verificationStatus, verificationNotes = "") => {
    try {
      const response = await api.post(`/api/manual-payment-proofs/${proofId}/verify/`, {
        verification_status: verificationStatus,
        verification_notes: verificationNotes,
      });
      return response;
    } catch (error) {
      console.error('Verify payment proof error:', error);
      throw error;
    }
  },

  // Get all payment proofs (Owner)
  getAllPaymentProofs: async () => {
    try {
      const response = await api.get('/api/manual-payment-proofs/');
      return response;
    } catch (error) {
      console.error('Get all payment proofs error:', error);
      throw error;
    }
  },
};

export default api;
