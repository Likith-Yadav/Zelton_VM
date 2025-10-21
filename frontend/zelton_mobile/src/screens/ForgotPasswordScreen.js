import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientButton from "../components/GradientButton";
import GradientCard from "../components/GradientCard";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import api from "../services/api";

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: Email input, 2: OTP verification, 3: Password reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [errors, setErrors] = useState({});
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (step === 2) {
      // Start countdown timer when OTP step begins
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [step]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!validateEmail(email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      // Use the same working OTP endpoint as registration
      const response = await api.post("/api/auth/send_reset_otp/", {
        email: email.trim(),
      });

      if (response.data.success) {
        Alert.alert(
          "OTP Sent",
          "Please check your email for the verification code."
        );
        setStep(2);
      } else {
        Alert.alert("Error", response.data.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending reset OTP:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      setResendLoading(true);
      setCanResend(false);
      setTimer(60);

      // Use the same working OTP endpoint as registration
      const response = await api.post("/api/auth/send_reset_otp/", {
        email: email.trim(),
      });

      if (response.data.success) {
        Alert.alert("OTP Sent", "A new verification code has been sent to your email.");
      } else {
        Alert.alert("Error", response.data.error || "Failed to resend OTP");
        setCanResend(true);
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
      setCanResend(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key, index) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const enteredOTP = otp.join("");

    if (enteredOTP.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the complete 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);

      // Verify OTP with backend for password reset
      const response = await api.post("/api/auth/verify_reset_otp/", {
        email: email.trim(),
        otp: enteredOTP,
      });

      if (response.data.success) {
        Alert.alert("Success", "OTP verified successfully!", [
          {
            text: "Continue",
            onPress: () => {
              setStep(3); // Go to password reset step
            },
          },
        ]);
      } else {
        const errorMessage = response.data.error || "The OTP you entered is incorrect. Please try again.";
        Alert.alert("Invalid OTP", errorMessage);
        // Clear OTP inputs
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      Alert.alert("Error", "Failed to verify OTP. Please try again.");
      // Clear OTP inputs
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      setErrors({ newPassword: "New password is required" });
      return;
    }

    if (newPassword.length < 8) {
      setErrors({ newPassword: "Password must be at least 8 characters long" });
      return;
    }

    if (!confirmPassword.trim()) {
      setErrors({ confirmPassword: "Please confirm your password" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      // Call the password reset API
      const response = await api.post("/api/auth/reset_password/", {
        email: email.trim(),
        new_password: newPassword,
      });

      if (response.data.success) {
        Alert.alert(
          "Success",
          "Password reset successfully! You can now login with your new password.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.navigate("Auth");
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", response.data.error || "Failed to reset password. Please try again.");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      Alert.alert("Error", "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderEmailStep = () => (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a verification code to reset your password.
            </Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>Step 1 of 2</Text>
            </View>
          </View>
        </View>

        {/* Email Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Email Address</Text>
          
          <View style={[
            styles.emailInputContainer,
            isEmailFocused && styles.emailInputContainerFocused
          ]}>
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={isEmailFocused ? colors.primary : colors.textSecondary} 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.emailInput}
              placeholder="Enter your email address"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (errors.email) {
                  setErrors({ ...errors, email: "" });
                }
              }}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>
          
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <GradientButton
            title="Send Verification Code"
            onPress={handleSendOTP}
            loading={loading}
            style={styles.sendButton}
          />

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToLoginText}>
              Remember your password? Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderOTPStep = () => (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(1)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to{"\n"}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>Step 2 of 2</Text>
            </View>
          </View>
        </View>

        {/* OTP Input Section */}
        <View style={styles.otpSection}>
          <Text style={styles.otpLabel}>Enter Verification Code</Text>
          
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="numeric"
                maxLength={1}
                textAlign="center"
                selectTextOnFocus
              />
            ))}
          </View>
        </View>

        {/* Button Section */}
        <View style={styles.buttonSection}>
          <GradientButton
            title="Verify Code"
            onPress={handleVerifyOTP}
            loading={loading}
            style={styles.verifyButton}
          />

          <View style={styles.resendContainer}>
            {timer > 0 ? (
              <Text style={styles.timerText}>
                Resend code in {formatTime(timer)}
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendOTP}
                disabled={resendLoading}
                style={styles.resendButton}
              >
                <Text style={styles.resendText}>
                  {resendLoading ? "Sending..." : "Resend Code"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.backToLoginButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToLoginText}>
              Back to Sign In
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderPasswordResetStep = () => (
    <ScrollView 
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(2)}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password for {email}
          </Text>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepText}>Step 3 of 3</Text>
          </View>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>New Password *</Text>
          <View style={[
            styles.inputWrapper,
            isNewPasswordFocused && styles.inputWrapperFocused
          ]}>
            <Ionicons
              name="lock-closed"
              size={24}
              color={isNewPasswordFocused ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter new password"
              placeholderTextColor={colors.textLight}
              value={newPassword}
              onChangeText={(value) => {
                setNewPassword(value);
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: "" });
                }
              }}
              onFocus={() => setIsNewPasswordFocused(true)}
              onBlur={() => setIsNewPasswordFocused(false)}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Confirm Password *</Text>
          <View style={[
            styles.inputWrapper,
            isConfirmPasswordFocused && styles.inputWrapperFocused
          ]}>
            <Ionicons
              name="lock-closed"
              size={24}
              color={isConfirmPasswordFocused ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textLight}
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: "" });
                }
              }}
              onFocus={() => setIsConfirmPasswordFocused(true)}
              onBlur={() => setIsConfirmPasswordFocused(false)}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
        </View>

        <View style={styles.buttonSection}>
          <GradientButton
            title="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </View>
    </ScrollView>
  );

  return (
    <LinearGradient colors={gradients.background} style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {step === 1 ? renderEmailStep() : step === 2 ? renderOTPStep() : renderPasswordResetStep()}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  
  // Header Styles
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  stepBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  stepText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: "600",
  },
  
  // Input Section Styles
  inputSection: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  inputLabel: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
    fontWeight: "600",
  },
  emailInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    ...shadows.sm,
  },
  emailInputContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 3,
    ...shadows.md,
  },
  inputIcon: {
    marginRight: spacing.md,
  },
  emailInput: {
    flex: 1,
    ...typography.body1,
    color: colors.text,
    fontSize: 16,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    ...shadows.sm,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 3,
    ...shadows.md,
  },
  passwordInput: {
    flex: 1,
    ...typography.body1,
    color: colors.text,
    fontSize: 16,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  
  // OTP Section Styles
  otpSection: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  otpLabel: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: "center",
    fontWeight: "600",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    ...shadows.sm,
  },
  
  // Button Section Styles
  buttonSection: {
    paddingTop: spacing.lg,
  },
  sendButton: {
    marginBottom: spacing.lg,
  },
  verifyButton: {
    marginBottom: spacing.lg,
  },
  resendContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  timerText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  resendButton: {
    paddingVertical: spacing.sm,
  },
  resendText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "600",
  },
  backToLoginButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  backToLoginText: {
    ...typography.body2,
    color: colors.textLight,
    textDecorationLine: "underline",
  },
  emailText: {
    fontWeight: "600",
    color: colors.primary,
  },
});

export default ForgotPasswordScreen;