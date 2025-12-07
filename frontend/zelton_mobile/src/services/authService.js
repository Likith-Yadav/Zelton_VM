import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/constants";
import api from "./api";

class AuthService {
  constructor() {
    // Clear any invalid tokens on initialization
    this.clearInvalidTokens();
  }

  // Clear any invalid tokens
  async clearInvalidTokens() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      if (token && (token === "2" || token === "undefined" || !token)) {
        await this.clearUserData();
      }
    } catch (error) {
      console.error("Error clearing invalid tokens:", error);
    }
  }

  // Register user
  async register(
    email,
    password,
    firstName,
    lastName,
    phone,
    role,
    tenantKey = null,
    additionalData = {}
  ) {
    try {
      console.log(
        "Attempting registration with:",
        email,
        role,
        tenantKey ? "with tenant key" : "without tenant key"
      );

      const userData = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        phone,
        role,
        ...additionalData, // Include additional data like address, emergency contact, etc.
      };

      // Add tenant key if provided
      if (tenantKey) {
        userData.tenant_key = tenantKey;
      }

      const response = await api.post("/api/auth/register/", userData);

      if (response.data.success) {
        console.log(
          "Registration successful, storing user data:",
          response.data
        );
        await this.storeUserData(response.data);
        return { success: true, data: response.data };
      } else {
        console.log("Registration failed:", response.data);
        return {
          success: false,
          error: response.data.error || "Registration failed",
        };
      }
    } catch (error) {
      console.error("Registration error details:", error);
      const errorMessage =
        error.response?.data?.error || "Registration failed. Please try again.";
      return { success: false, error: errorMessage };
    }
  }

  // Login user
  async login(email, password) {
    try {
      console.log("Attempting login with:", email);

      const response = await api.post("/api/auth/login/", { email, password });
      
      console.log("Login response:", response);
      console.log("Response status:", response.status);
      console.log("Response data:", response.data);

      if (response.data.success) {
        await this.storeUserData(response.data);
        return { success: true, data: response.data };
      } else {
        // Check if property assignment is required for tenant
        if (response.data.property_required) {
          return {
            success: false,
            error: response.data.error || "Property assignment required",
            property_required: true,
            data: response.data,
          };
        }
        return { success: false, error: response.data.error || "Login failed" };
      }
    } catch (error) {
      console.error("Login error details:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      
      const errorMessage =
        error.response?.data?.error ||
        "Login failed. Please check your credentials.";
      return { success: false, error: errorMessage };
    }
  }

  // Logout user
  async logout() {
    try {
      await api.post("/api/auth/logout/");
    } catch (error) {
      console.error("Logout error:", error.response?.data || error.message);
    } finally {
      // Clear stored data regardless of response
      await this.clearUserData();
      return { success: true };
    }
  }

  // Complete user profile
  async completeProfile(userId, profileData) {
    try {
      console.log("Completing profile for user:", userId, profileData);

      const response = await api.post("/api/auth/complete_profile/", {
        user_id: userId,
        ...profileData,
      });

      if (response.data.success) {
        return { success: true, data: response.data };
      } else {
        return {
          success: false,
          error: response.data.error || "Profile update failed",
        };
      }
    } catch (error) {
      console.error("Profile completion error details:", error);
      const errorMessage =
        error.response?.data?.error ||
        "Profile update failed. Please try again.";
      return { success: false, error: errorMessage };
    }
  }

  // Complete subscription payment
  async completeSubscription(userId, subscriptionData) {
    try {
      console.log("=== AuthService.completeSubscription ===");
      console.log("User ID:", userId);
      console.log("Subscription data:", subscriptionData);

      // Validate input data
      if (!userId) {
        console.error("User ID is required");
        return { success: false, error: "User ID is required" };
      }

      if (!subscriptionData || !subscriptionData.subscription_plan) {
        console.error("Subscription plan is required");
        return { success: false, error: "Subscription plan is required" };
      }

      console.log("Making API call to complete subscription...");

      const response = await api.post("/api/auth/complete_subscription/", {
        user_id: userId,
        ...subscriptionData,
      });

      console.log("API response received:", response.data);

      if (response.data.success) {
        console.log("Subscription completed successfully");

        // Update stored user data with new subscription status
        const userData = await this.getStoredUserData();
        if (userData.success) {
          const updatedUserData = {
            ...userData.data,
            profile: response.data.profile,
          };
          await this.storeUserData(updatedUserData);
          console.log("User data updated with new subscription status");
        }
        return { success: true, data: response.data };
      } else {
        console.error("Subscription failed:", response.data.error);
        return {
          success: false,
          error: response.data.error || "Subscription activation failed",
        };
      }
    } catch (error) {
      console.error("Subscription completion error details:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);

      let errorMessage = "Subscription activation failed. Please try again.";

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid subscription data. Please try again.";
      } else if (error.response?.status === 404) {
        errorMessage = "User not found. Please try logging in again.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
      }

      return { success: false, error: errorMessage };
    }
  }

  // Get current user
  async getCurrentUser() {
    try {
      const response = await api.get("/api/auth/me/");
      return { success: true, data: response.data };
    } catch (error) {
      console.error(
        "Get current user error:",
        error.response?.data || error.message
      );
      await this.clearUserData();
      return {
        success: false,
        error: error.response?.data?.error || "Session expired",
      };
    }
  }

  // Check if user is logged in
  async isLoggedIn() {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return !!(token && userData && token !== "undefined" && token !== "null");
    } catch (error) {
      return false;
    }
  }

  // Verify token with backend
  async verifyToken() {
    try {
      const response = await api.get("/api/auth/me/");
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Token verification failed:", error);
      return {
        success: false,
        error: error.response?.data?.error || "Token verification failed",
      };
    }
  }

  // Ensure token is ready and valid before making payment requests
  async ensureTokenReady(maxRetries = 3) {
    try {
      console.log("Ensuring token is ready...");
      
      // Check if token exists
      const token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
      if (!token || token === "undefined" || token === "null" || token.trim() === "") {
        console.log("⚠️ No token found");
        return { success: false, error: "No authentication token found. Please login again." };
      }

      // Verify token is still valid with retry logic for network errors
      let tokenResult;
      let lastError;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          tokenResult = await this.verifyToken();
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          
          // Check if it's a network error (retryable)
          const isNetworkError = 
            !error.response ||
            error.isNetworkError ||
            error.code === "ECONNREFUSED" ||
            error.code === "ETIMEDOUT" ||
            error.code === "ENOTFOUND";
          
          if (!isNetworkError || attempt === maxRetries - 1) {
            // Not a network error or last attempt - treat as auth failure
            tokenResult = { success: false, error: error.message || "Token verification failed" };
            break;
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = 1000 * Math.pow(2, attempt);
          console.log(`Token verification failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      if (tokenResult.success) {
        console.log("✅ Token is valid and ready");
        return { success: true };
      } else {
        console.log("⚠️ Token is invalid, attempting to refresh...");
        // Token is invalid, user needs to login again
        await this.clearUserData();
        return { 
          success: false, 
          error: "Session expired. Please login again.",
          requiresLogin: true 
        };
      }
    } catch (error) {
      console.error("Error ensuring token ready:", error);
      
      // Check if it's a network error
      const isNetworkError = 
        !error.response ||
        error.isNetworkError ||
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT";
      
      if (isNetworkError) {
        return { 
          success: false, 
          error: "Network error. Please check your connection and try again.",
          isNetworkError: true
        };
      }
      
      return { 
        success: false, 
        error: "Authentication error. Please try again.",
        requiresLogin: true 
      };
    }
  }

  // Store user data
  async storeUserData(data) {
    try {
      console.log("Storing user data:", data);
      // Store the actual token from the backend
      if (data.token) {
        console.log("Storing token:", data.token);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, data.token);
      } else {
        console.log("No token found in data");
      }
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));

      // Only store role if it exists
      if (data.role) {
        console.log("Storing role:", data.role);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, data.role);
      }
      console.log("User data stored successfully");
    } catch (error) {
      console.error("Error storing user data:", error);
    }
  }

  // Clear user data
  async clearUserData() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    } catch (error) {
      console.error("Error clearing user data:", error);
    }
  }

  // Get stored user data
  async getStoredUserData() {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      const role = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);

      if (userData && role) {
        return {
          success: true,
          data: JSON.parse(userData),
          role: role,
        };
      } else {
        return { success: false, error: "No stored user data" };
      }
    } catch (error) {
      return { success: false, error: "Error retrieving stored data" };
    }
  }
}

export default new AuthService();
