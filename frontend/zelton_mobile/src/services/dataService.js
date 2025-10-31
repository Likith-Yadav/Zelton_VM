import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, STORAGE_KEYS } from "../constants/constants";
import axios from "axios";

class DataService {
  constructor() {
    // Use the configured axios instance with authentication
  }

  // Generic API call method using axios
  apiCall = async (endpoint, method = "GET", data = null) => {
    try {
      let response;

      switch (method.toUpperCase()) {
        case "GET":
          response = await api.get(endpoint);
          break;
        case "POST":
          response = await api.post(endpoint, data);
          break;
        case "PATCH":
          response = await api.patch(endpoint, data);
          break;
        case "PUT":
          response = await api.put(endpoint, data);
          break;
        case "DELETE":
          response = await api.delete(endpoint);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      // Handle paginated responses from Django REST Framework
      let responseData = response.data;
      if (
        responseData &&
        typeof responseData === "object" &&
        responseData.results
      ) {
        // This is a paginated response, extract the results
        responseData = responseData.results;
        
      }

      return { success: true, data: responseData };
    } catch (error) {
      console.error("API Call Error:", error);

      // Handle axios error format
      if (error.response) {
        console.error("Full error response:", error.response);
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);

        let errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;

        if (error.response.data) {
          if (typeof error.response.data === "string") {
            errorMessage = error.response.data;
          } else if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response.data.non_field_errors) {
            errorMessage = error.response.data.non_field_errors.join(", ");
          } else {
            // Try to extract field errors
            const fieldErrors = [];
            for (const [field, errors] of Object.entries(error.response.data)) {
              if (Array.isArray(errors)) {
                fieldErrors.push(`${field}: ${errors.join(", ")}`);
              } else if (typeof errors === "string") {
                fieldErrors.push(`${field}: ${errors}`);
              }
            }
            if (fieldErrors.length > 0) {
              errorMessage = fieldErrors.join("; ");
            }
          }
        }

        console.error(
          `API Error Response: ${error.response.status} - ${errorMessage}`
        );
        return { success: false, error: errorMessage };
      } else if (error.request) {
        console.error("API Network Error:", error.request);
        return {
          success: false,
          error: "Network error. Please check your connection.",
        };
      } else {
        console.error("API Setup Error:", error.message);
        return {
          success: false,
          error: error.message || "An unexpected error occurred.",
        };
      }
    }
  };

  // Owner API calls
  async createOwnerProfile() {
    return await this.apiCall("/api/owners/", "POST", {
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      pan_number: "",
      aadhar_number: "",
    });
  }

  async updateOwnerProfile(data) {
    return await this.apiCall("/api/owners/", "PATCH", data);
  }

  async uploadOwnerProfileImage(formData) {
    try {
      console.log("=== Uploading owner profile image ===");
      const response = await api.post(
        "/api/owners/upload-profile-image/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("Upload API response:", response.data);
      console.log("Image URL from API:", response.data.profile_image);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Upload profile image error:", error);
      console.error("Error response:", error.response?.data);
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error || "Failed to upload image",
        };
      }
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  }

  async uploadTenantProfileImage(formData) {
    try {
      const response = await api.post(
        "/api/tenants/upload-profile-image/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Upload tenant profile image error:", error);
      if (error.response) {
        return {
          success: false,
          error: error.response.data?.error || "Failed to upload image",
        };
      }
      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  }

  async getOwnerDashboard() {
    return await this.apiCall("/api/owners/dashboard/");
  }

  // Property API calls
  getProperties = async () => {
    return await this.apiCall("/api/properties/");
  };

  getDetailedProperties = async () => {
    return await this.apiCall("/api/properties/detailed_properties/");
  };

  async getProperty(id) {
    return await this.apiCall(`/api/properties/${id}/`);
  }

  createProperty = async (data) => {
    if (!data) {
      console.error("No data provided to createProperty");
      return { success: false, error: "No data provided" };
    }

    return await this.apiCall("/api/properties/", "POST", data);
  };

  updateProperty = async (id, data) => {
    return await this.apiCall(`/api/properties/${id}/`, "PATCH", data);
  };

  async deleteProperty(id) {
    return await this.apiCall(`/api/properties/${id}/`, "DELETE");
  }

  generateTenantKey = async (propertyId, unitId) => {
    const requestData = { unit_id: unitId };

    return await this.apiCall(
      `/api/properties/${propertyId}/generate_tenant_key/`,
      "POST",
      requestData
    );
  };

  removeTenant = async (unitId) => {
    return await this.apiCall(`/api/units/${unitId}/remove_tenant/`, "POST", {});
  };

  changeTenant = async (unitId) => {
    return await this.apiCall(`/api/units/${unitId}/change_tenant/`, "POST", {});
  };

  // Unit API calls
  async getUnits(propertyId = null) {
    const endpoint = propertyId ? `/api/units/?property=${propertyId}` : "/api/units/";
    return await this.apiCall(endpoint);
  }

  async getUnit(id) {
    return await this.apiCall(`/api/units/${id}/`);
  }

  createUnit = async (data) => {
    console.log("createUnit called with data:", data);
    return await this.apiCall("/api/units/", "POST", data);
  };

  async updateUnit(id, data) {
    return await this.apiCall(`/api/units/${id}/`, "PATCH", data);
  }

  async deleteUnit(id) {
    return await this.apiCall(`/api/units/${id}/`, "DELETE");
  }

  // Tenant API calls

  async updateTenantProfile(data) {
    return await this.apiCall("/api/tenants/", "PATCH", data);
  }

  async getTenantDashboard() {
    return await this.apiCall("/api/tenants/dashboard/");
  }

  async testJoinProperty() {
    return await this.apiCall("/api/tenants/test_join/", "POST", { test: "data" });
  }

  async testJoinSimple(key) {
    return await this.apiCall("/tenants/test-join-simple/", "POST", {
      key: key,
    });
  }

  async joinProperty(key) {
    // Ensure key is valid
    if (!key || key.trim() === "") {
      console.error("ERROR: Key is empty or invalid");
      return { success: false, error: "Tenant key is required" };
    }

    const requestData = { key: key.trim().toUpperCase() };

    try {
      // Use direct API call for tenant key join (no authentication required)
      const response = await api.post("/api/tenants/join-property/", requestData);

      return {
        success: true,
        data: response.data.data,
        token: response.data.token,
        user_created: response.data.user_created,
      };
    } catch (error) {
      console.error("Join property API error:", error);

      if (error.response) {
        const errorMessage =
          error.response.data?.error || "Failed to join property";
        return { success: false, error: errorMessage };
      }

      return {
        success: false,
        error: "Network error. Please check your connection.",
      };
    }
  }

  // Payment API calls
  async getPayments() {
    return await this.apiCall("/api/payments/");
  }

  async getPayment(id) {
    return await this.apiCall(`/api/payments/${id}/`);
  }

  async initiatePayment(id) {
    return await this.apiCall(`/api/payments/${id}/initiate_payment/`, "POST");
  }

  async verifyPayment(id, transactionId) {
    return await this.apiCall(`/api/payments/${id}/verify_payment/`, "POST", {
      transaction_id: transactionId,
    });
  }

  async processTenantPayment(amount, paymentType = "rent") {
    return await this.apiCall("/api/payments/process_tenant_payment/", "POST", {
      amount: amount,
      payment_type: paymentType,
    });
  }

  async checkPaymentStatus() {
    return await this.apiCall("/api/payments/check_payment_status/", "GET");
  }

  // Invoice API calls
  async getInvoices() {
    return await this.apiCall("/api/invoices/");
  }

  async getInvoice(id) {
    return await this.apiCall(`/api/invoices/${id}/`);
  }

  // Pricing API calls
  async getPricingPlans() {
    return await this.apiCall("/api/pricing-plans/");
  }

  async getPlanForProperties(count) {
    return await this.apiCall(
      `/api/pricing-plans/get_plan_for_properties/?count=${count}`
    );
  }

  // Analytics API calls
  async getAnalytics(period = "6months") {
    return await this.apiCall(`/api/analytics/?period=${period}`);
  }

  async getMonthlyRevenue(period = "6months") {
    return await this.apiCall(`/api/analytics/monthly-revenue/?period=${period}`);
  }

  async getMonthlyTenants(period = "6months") {
    return await this.apiCall(`/api/analytics/monthly-tenants/?period=${period}`);
  }

  async getPaymentAnalytics(period = "6months") {
    return await this.apiCall(`/api/analytics/payments/?period=${period}`);
  }

  // Dashboard API calls
  async getOwnerDashboard() {
    return await this.apiCall("/api/owners/dashboard/");
  }

  async getTenantDashboard() {
    return await this.apiCall("/api/tenants/dashboard/");
  }

  // Profile API calls
  async getOwnerProfile() {
    return await this.apiCall("/api/owners/profile/");
  }

  async getTenantProfile() {
    return await this.apiCall("/api/tenants/profile/");
  }

  // Tenant Document API calls
  async uploadTenantDocument(formData) {
    // Use fetch API directly to avoid axios FormData issues
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);

      const response = await fetch(`${API_BASE_URL}/api/tenants/upload_document/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          // Don't set Content-Type - let fetch handle it for FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: error.message || "Upload failed",
      };
    }
  }

  async getTenantDocuments() {
    return await this.apiCall("/api/tenants/documents/");
  }

  async downloadTenantDocument(documentId) {
    return await this.apiCall(`/api/tenants/documents/${documentId}/download/`);
  }

  async deleteTenantDocument(documentId) {
    return await this.apiCall(`/api/tenants/documents/${documentId}/`, "DELETE");
  }

  // Owner Document API calls
  async getTenantDocumentsByUnit(unitId) {
    return await this.apiCall(`/api/tenant-documents/by_unit/${unitId}/`);
  }

  async downloadTenantDocumentAsOwner(documentId) {
    return await this.apiCall(`/api/tenant-documents/download/${documentId}`);
  }
}

export default new DataService();
