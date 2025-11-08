import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import PhoneInputField from "../components/PhoneInputField";
import GradientButton from "../components/GradientButton";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import {
  validateEmail,
  validatePassword,
  validatePhone,
} from "../utils/helpers";
import { ERROR_MESSAGES } from "../constants/constants";
import AuthService from "../services/authService";
import DataService from "../services/dataService";

const AuthScreen = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    mobile: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const isLoggedIn = await AuthService.isLoggedIn();
    if (isLoggedIn) {
      const userData = await AuthService.getStoredUserData();
      if (userData.success) {
        // Check if owner has active subscription
        if (userData.role === "owner" && userData.data.profile) {
          if (userData.data.profile.subscription_status !== "active") {
            // Redirect to pricing if subscription is not active
            navigation.navigate("Pricing");
            return;
          }
        }

        // For tenants, verify they have a property assigned
        if (userData.role === "tenant") {
          try {
            const result = await AuthService.verifyToken();
            if (result.success) {
              // Token is valid, check if property is assigned
              const dashboardResult = await DataService.getTenantDashboard();
              if (
                !dashboardResult.success &&
                dashboardResult.error === "No property assigned"
              ) {
                // Redirect to tenant key join screen
                navigation.navigate("TenantKeyJoin");
                return;
              }
            }
          } catch (error) {
            console.error("Error verifying tenant session:", error);
            // If verification fails, redirect to tenant key join as fallback
            navigation.navigate("TenantKeyJoin");
            return;
          }
        }

        // Navigate to appropriate dashboard
        if (userData.role === "owner") {
          navigation.navigate("OwnerDashboard");
        } else {
          navigation.navigate("TenantDashboard");
        }
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = ERROR_MESSAGES.INVALID_EMAIL;
    }

    if (!formData.password) {
      newErrors.password = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (!validatePassword(formData.password)) {
      newErrors.password = ERROR_MESSAGES.PASSWORD_TOO_SHORT;
    }

    if (!isLogin) {
      if (!formData.firstName) {
        newErrors.firstName = ERROR_MESSAGES.REQUIRED_FIELD;
      }
      if (!formData.lastName) {
        newErrors.lastName = ERROR_MESSAGES.REQUIRED_FIELD;
      }
      if (!formData.mobile) {
        newErrors.mobile = ERROR_MESSAGES.REQUIRED_FIELD;
      } else if (!validatePhone(formData.mobile)) {
        newErrors.mobile = ERROR_MESSAGES.INVALID_PHONE;
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = ERROR_MESSAGES.REQUIRED_FIELD;
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = ERROR_MESSAGES.PASSWORDS_DONT_MATCH;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isLogin) {
        // Handle login
        const result = await AuthService.login(
          formData.email,
          formData.password
        );
        if (result.success) {
          // Verify token is ready immediately after login
          console.log("✅ Login successful, verifying token...");
          const tokenCheck = await AuthService.ensureTokenReady();
          if (tokenCheck.success) {
            console.log("✅ Token verified and ready");
            Alert.alert("Success", "Login successful!");
            // Navigate to appropriate dashboard based on role
            if (result.data.role === "owner") {
              navigation.navigate("OwnerDashboard");
            } else {
              navigation.navigate("TenantDashboard");
            }
          } else {
            console.error("⚠️ Token verification failed after login");
            Alert.alert("Error", "Login successful but token verification failed. Please try again.");
          }
        } else {
          // Check if property assignment is required for tenant
          if (result.property_required) {
            Alert.alert("Property Assignment Required", result.error, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Enter Tenant Key",
                onPress: () => {
                  // Store user data temporarily and navigate to tenant key join
                  AuthService.storeUserData(result.data);
                  navigation.navigate("TenantKeyJoin");
                },
              },
            ]);
            return;
          }

          // Check if subscription payment is required
          if (result.subscription_required) {
            Alert.alert("Subscription Required", result.error, [
              { text: "Cancel", style: "cancel" },
              {
                text: "Complete Payment",
                onPress: () => {
                  // Store user data temporarily and navigate to pricing
                  AuthService.storeUserData(result.data);
                  navigation.navigate("Pricing");
                },
              },
            ]);
          }
          // Check if it's a "user not found" error
          else if (
            result.error.includes("No account found") ||
            result.error.includes("Invalid credentials") ||
            result.error.includes("User not found")
          ) {
            Alert.alert(
              "Account Not Found",
              "No account found with this email. Would you like to create a new account?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Sign Up",
                  onPress: () => {
                    setIsLogin(false);
                    // Pre-fill email for signup
                    setFormData((prev) => ({ ...prev, email: formData.email }));
                  },
                },
              ]
            );
          } else if (result.error.includes("Invalid password")) {
            Alert.alert(
              "Invalid Password",
              "The password you entered is incorrect. Please try again."
            );
          } else {
            Alert.alert("Error", result.error);
          }
        }
      } else {
        // Handle registration - navigate to OTP verification
        navigation.navigate("OTPVerification", {
          email: formData.email,
          name: `${formData.firstName} ${formData.lastName}`,
          registrationData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            mobile: formData.mobile,
          },
        });
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      mobile: "",
    });
    setErrors({});
  };

  return (
    <LinearGradient
      colors={gradients.background}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {isLogin ? "Welcome Back" : "Create Account"}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin
                ? "Sign in to continue to ZeltonLivings"
                : "Join ZeltonLivings and start managing properties"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {!isLogin && (
              <>
                <InputField
                  label="First Name"
                  placeholder="Enter your first name"
                  value={formData.firstName}
                  onChangeText={(value) =>
                    handleInputChange("firstName", value)
                  }
                  error={errors.firstName}
                  leftIcon="person"
                  required
                />
                <InputField
                  label="Last Name"
                  placeholder="Enter your last name"
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange("lastName", value)}
                  error={errors.lastName}
                  leftIcon="person"
                  required
                />
              </>
            )}

            <InputField
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon="mail"
              required
            />

            {!isLogin && (
              <PhoneInputField
                label="Mobile Number"
                placeholder="Enter your mobile number"
                value={formData.mobile}
                onChangeText={(value) => handleInputChange("mobile", value)}
                error={errors.mobile}
                leftIcon="call"
                required
              />
            )}

            <InputField
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(value) => handleInputChange("password", value)}
              secureTextEntry
              error={errors.password}
              leftIcon="lock-closed"
              required
            />

            {!isLogin && (
              <InputField
                label="Confirm Password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(value) =>
                  handleInputChange("confirmPassword", value)
                }
                secureTextEntry
                error={errors.confirmPassword}
                leftIcon="lock-closed"
                required
              />
            )}

            <GradientButton
              title={isLogin ? "Sign In" : "Create Account"}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />

            <TouchableOpacity onPress={toggleMode} style={styles.toggleButton}>
              <Text style={styles.toggleText}>
                {isLogin
                  ? "Don't have an account? Sign Up"
                  : "Already have an account? Sign In"}
              </Text>
            </TouchableOpacity>

            {isLogin && (
              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  toggleButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  toggleText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "500",
  },
  forgotPasswordButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  forgotPasswordText: {
    ...typography.caption,
    color: colors.textLight,
    textDecorationLine: "underline",
  },
});

export default AuthScreen;
