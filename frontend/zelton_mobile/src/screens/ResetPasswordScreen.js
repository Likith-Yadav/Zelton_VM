import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientButton from "../components/GradientButton";
import GradientCard from "../components/GradientCard";
import InputField from "../components/InputField";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import api from "../services/api";

const ResetPasswordScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.newPassword.trim()) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long";
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Since we're using the registration OTP system, we need to use a different approach
      // For now, let's use a simple password update approach
      // In a real implementation, you might want to create a separate password reset endpoint
      // that works with the registration OTP verification
      
      Alert.alert(
        "Password Reset",
        "Password reset functionality will be implemented with proper backend integration. For now, you can login with your existing password.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("Auth");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error resetting password:", error);
      Alert.alert("Error", "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <GradientCard style={styles.card}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your new password below. Make sure it's secure and easy to remember.
              </Text>
            </View>

            <View style={styles.form}>
              <InputField
                label="New Password"
                placeholder="Enter your new password"
                value={formData.newPassword}
                onChangeText={(value) => handleInputChange("newPassword", value)}
                secureTextEntry
                error={errors.newPassword}
                leftIcon="lock-closed"
                required
              />

              <InputField
                label="Confirm New Password"
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange("confirmPassword", value)}
                secureTextEntry
                error={errors.confirmPassword}
                leftIcon="lock-closed"
                required
              />

              <GradientButton
                title="Reset Password"
                onPress={handleResetPassword}
                loading={loading}
                style={styles.submitButton}
              />

              <TouchableOpacity
                style={styles.backToLoginButton}
                onPress={() => navigation.navigate("Auth")}
              >
                <Text style={styles.backToLoginText}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </GradientCard>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  card: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
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
  backToLoginButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  backToLoginText: {
    ...typography.body2,
    color: colors.textLight,
    textDecorationLine: "underline",
  },
});

export default ResetPasswordScreen;
