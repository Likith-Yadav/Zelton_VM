import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, STORAGE_KEYS } from "../constants/constants";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  // Allow all status codes to be handled properly
  validateStatus: function (status) {
    return status >= 200 && status < 600; // Allow all status codes
  },
  // Enable credentials for session-based OTP verification
  withCredentials: true,
  // Add headers to help with CSRF
  headers: {
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
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
    // Handle 401 errors by clearing stored token
    if (error.response && error.response.status === 401) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);
        console.log("Cleared stored authentication data due to 401 error");
      } catch (clearError) {
        console.error("Error clearing stored data:", clearError);
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
  initiateSubscriptionPayment: (pricingPlanId, period = "monthly", isUpgrade = false) => {
    const endpoint = isUpgrade 
      ? "/api/owner-subscriptions/initiate_upgrade/"
      : "/api/owner-subscriptions/initiate_payment/";
    return api.post(endpoint, {
      pricing_plan_id: pricingPlanId,
      period: period,
    });
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

// Payment API
export const paymentAPI = {
  getPayments: () => api.get("/api/payments/"),
  getPayment: (id) => api.get(`/api/payments/${id}/`),

  // PhonePe Integration Methods
  initiateTenantRentPayment: (amount, paymentType = "rent") =>
    api.post("/api/payments/initiate_rent_payment/", {
      amount,
      payment_type: paymentType,
    }),

  verifyPaymentStatus: (merchantOrderId) =>
    api.get(`/api/payments/verify-payment/${merchantOrderId}/`),

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

export default api;
