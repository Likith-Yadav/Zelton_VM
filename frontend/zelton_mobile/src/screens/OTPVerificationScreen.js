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
import EmailService from "../services/emailService";
import api from "../services/api";

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email, name, registrationData } = route.params;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  // generatedOTP is no longer needed since backend generates OTP

  const inputRefs = useRef([]);

  useEffect(() => {
    // Send OTP when screen loads
    sendOTP();

    // Start countdown timer
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
  }, []);

  const sendOTP = async () => {
    try {
      setLoading(true);
      const result = await EmailService.sendOTPEmail(email, name);

      if (result.success) {
        Alert.alert(
          "OTP Sent",
          "Please check your email for the verification code."
        );
      } else {
        Alert.alert("Error", result.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      setResendLoading(true);
      const result = await EmailService.sendOTPEmail(email, name);

      if (result.success) {
        setTimer(60);
        setCanResend(false);
        Alert.alert(
          "OTP Resent",
          "Please check your email for the new verification code."
        );
      } else {
        Alert.alert("Error", result.error || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      Alert.alert("Error", "Failed to resend OTP. Please try again.");
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
      
      console.log("Verifying OTP:", { email, otp: enteredOTP });
      
      // Verify OTP with backend
      const response = await api.post("/api/auth/verify_otp/", {
        email: email,
        otp: enteredOTP,
      });

      console.log("OTP verification response:", response.data);

      if (response.data.success) {
        Alert.alert("Success", "Email verified successfully!", [
          {
            text: "Continue",
            onPress: () => {
              // Navigate to role selection with verified email
              navigation.navigate("RoleSelection", {
                registrationData: {
                  ...registrationData,
                  email: email,
                  name: name,
                  emailVerified: true,
                },
              });
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Verify Email</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Instructions */}
          <GradientCard variant="primary" style={styles.instructionsCard}>
            <View style={styles.instructionsHeader}>
              <Ionicons name="mail" size={24} color={colors.white} />
              <Text style={styles.instructionsTitle}>Check Your Email</Text>
            </View>
            <Text style={styles.instructionsText}>
              We've sent a 6-digit verification code to{"\n"}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </GradientCard>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Enter Verification Code</Text>
            <View style={styles.otpInputContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
                  ]}
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

          {/* Verify Button */}
          <GradientButton
            title="Verify Email"
            onPress={handleVerifyOTP}
            loading={loading}
            style={styles.verifyButton}
          />

          {/* Resend OTP */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>
              Didn't receive the code?{" "}
              {canResend ? (
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={resendLoading}
                >
                  <Text style={styles.resendLink}>
                    {resendLoading ? "Sending..." : "Resend OTP"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>
                  Resend in {formatTime(timer)}
                </Text>
              )}
            </Text>
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Make sure to check your spam folder if you don't see the email.
            </Text>
          </View>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  instructionsCard: {
    marginBottom: spacing.xl,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  instructionsTitle: {
    ...typography.h6,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  instructionsText: {
    ...typography.body2,
    color: colors.white,
    opacity: 0.9,
    textAlign: "center",
    lineHeight: 20,
  },
  emailText: {
    fontWeight: "600",
  },
  otpContainer: {
    marginBottom: spacing.xl,
  },
  otpLabel: {
    ...typography.h6,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.lg,
    fontWeight: "600",
  },
  otpInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  otpInput: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderRadius: 12,
    backgroundColor: colors.surface,
    ...typography.h5,
    color: colors.text,
    fontWeight: "bold",
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  verifyButton: {
    marginBottom: spacing.lg,
  },
  resendContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  resendText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
  },
  resendLink: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "600",
  },
  timerText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  helpContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  helpText: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 16,
  },
});

export default OTPVerificationScreen;
