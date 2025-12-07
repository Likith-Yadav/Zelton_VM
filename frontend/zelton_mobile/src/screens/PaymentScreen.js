import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientButton from "../components/GradientButton";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import AuthService from "../services/authService";
import { ownerSubscriptionAPI } from "../services/api";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PaymentScreen = ({ navigation, route }) => {
  const [paymentStatus, setPaymentStatus] = useState("processing");
  const [paymentData, setPaymentData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Get subscription data from route params
    if (route.params?.subscriptionData) {
      setSubscriptionData(route.params.subscriptionData);
    }
  }, []);

  // Separate useEffect to process payment after subscriptionData is set
  useEffect(() => {
    if (subscriptionData) {
      processPayment();
    }
  }, [subscriptionData]);

  const processPayment = async () => {
    // Prevent multiple simultaneous payment attempts
    if (isProcessing) {
      console.log("Payment already in progress, skipping...");
      return;
    }

    try {
      console.log("=== Payment Processing Started ===");
      console.log("Subscription data:", subscriptionData);

      if (!subscriptionData) {
        console.error("No subscription data available");
        setPaymentStatus("failed");
        return;
      }

      if (!subscriptionData.userId) {
        console.error("No user ID in subscription data");
        setPaymentStatus("failed");
        return;
      }

      if (!subscriptionData.plan) {
        console.error("No plan in subscription data");
        setPaymentStatus("failed");
        return;
      }

      setIsProcessing(true);
      console.log("Starting PhonePe payment processing...");

      // Ensure token is ready before making payment request (with retry for network errors)
      console.log("🔐 Validating token before subscription payment...");
      const tokenCheck = await AuthService.ensureTokenReady(3); // 3 retries for network errors
      if (!tokenCheck.success) {
        console.error("❌ Token validation failed:", tokenCheck.error);
        setIsProcessing(false);
        setPaymentStatus("failed");
        
        // Check if it's a network error
        if (tokenCheck.isNetworkError) {
          Alert.alert(
            "Connection Error",
            "Unable to connect to the server. Please check your internet connection and try again.",
            [
              {
                text: "Retry",
                onPress: () => {
                  setPaymentStatus("idle");
                  setTimeout(() => processPayment(), 500); // Retry after 500ms
                },
              },
              {
                text: "Cancel",
                onPress: () => {
                  setPaymentStatus("idle");
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "Authentication Required",
            tokenCheck.error || "Please login again to make a payment.",
            [
              {
                text: "OK",
                onPress: () => {
                  setPaymentStatus("idle");
                },
              },
            ]
          );
        }
        return;
      }

      console.log("✅ Token validated successfully, proceeding with subscription payment");

      // Initiate PhonePe subscription payment (with built-in retry logic)
      const isUpgrade = route.params?.isUpgrade || false;
      const response = await ownerSubscriptionAPI.initiateSubscriptionPayment(
        subscriptionData.plan.id,
        subscriptionData.billingCycle,
        isUpgrade
      );

      if (response.data.success) {
        const { redirect_url, merchant_order_id, order_id } = response.data;

        // Store payment data for callback handling
        await AsyncStorage.setItem(
          "current_subscription_payment",
          JSON.stringify({
            merchant_order_id,
            order_id,
            plan: subscriptionData.plan,
            billing_cycle: subscriptionData.billingCycle,
            amount: subscriptionData.amount,
            user_id: subscriptionData.userId,
          })
        );

        // Open PhonePe payment page
        const canOpen = await Linking.canOpenURL(redirect_url);
        if (canOpen) {
          await Linking.openURL(redirect_url);

          // Show processing status
          setPaymentStatus("processing");

          // Start polling for payment status
          pollSubscriptionPaymentStatus(merchant_order_id);
        } else {
          throw new Error("Cannot open PhonePe payment page");
        }
      } else {
        throw new Error(response.data.error || "Payment initiation failed");
      }
    } catch (error) {
      console.error("Payment processing error:", error);
      console.error("Error message:", error.message);
      console.error("Error response:", error.response);

      // Handle network/connection errors - retry silently without alarming user
      if (error.isNetworkError || error.isConnectionError || !error.response) {
        const retryCount = error.retryCount || 0;
        const maxRetries = 10;
        
        if (retryCount < maxRetries) {
          console.log(`⚠️ Network error detected, retrying silently (${retryCount + 1}/${maxRetries})...`);
          // Keep showing "processing" status and retry in background
          const waitTime = Math.min(2000 * Math.pow(1.5, retryCount), 10000); // Exponential backoff, max 10s
          setTimeout(() => {
            error.retryCount = retryCount + 1;
            processPayment();
          }, waitTime);
          return; // Don't set failed status, keep processing
        } else {
          // After max retries, show a friendly message
          setPaymentStatus("failed");
          Alert.alert(
            "Connection Issue",
            "We're having trouble connecting right now. Please check your internet connection and try again in a moment.",
            [
              {
                text: "OK",
                onPress: () => {
                  setPaymentStatus("idle");
                },
              },
            ]
          );
          setIsProcessing(false);
          return;
        }
      }
      
      // Only set failed status for non-network errors
      setPaymentStatus("failed");
      
      if (error.response && error.response.status === 401) {
        // Handle 401 errors (but retry logic should have caught connection issues)
        Alert.alert(
          "Authentication Error",
          "Your session has expired. Please login again to make a payment.",
          [
            {
              text: "OK",
              onPress: () => {
                setPaymentStatus("idle");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Payment Failed",
          error.message || error.response?.data?.error || "Failed to initiate payment. Please try again."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const pollSubscriptionPaymentStatus = async (merchantOrderId) => {
    try {
      const maxAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
      let attempts = 0;

      const pollInterval = setInterval(async () => {
        attempts++;

        try {
          const response = await ownerSubscriptionAPI.verifySubscriptionPayment(
            merchantOrderId
          );

          if (response.data.success) {
            const { state } = response.data;

            if (state === "COMPLETED") {
              clearInterval(pollInterval);
              setPaymentStatus("success");

              // Clear stored payment data
              await AsyncStorage.removeItem("current_subscription_payment");

              // Show success message
              setTimeout(() => {
                Alert.alert(
                  "Payment Successful!",
                  `Your subscription has been activated successfully.`,
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        navigation.navigate("OwnerDashboard");
                      },
                    },
                  ]
                );
              }, 1000);
            } else if (state === "FAILED") {
              clearInterval(pollInterval);
              setPaymentStatus("failed");
              Alert.alert(
                "Payment Failed",
                "Your subscription payment was not successful. Please try again."
              );
            } else if (state === "PENDING" && attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setPaymentStatus("failed");
              Alert.alert(
                "Payment Timeout",
                "Payment is taking longer than expected. Please check your payment status later."
              );
            }
          }
        } catch (error) {
          console.error("Error polling payment status:", error);
          
          // Handle network errors silently - don't alarm user
          const isNetworkError = 
            error.isNetworkError || 
            error.isConnectionError || 
            !error.response ||
            error.code === "ECONNREFUSED" ||
            error.code === "ETIMEDOUT";
          
          if (isNetworkError && attempts < maxAttempts) {
            // Network error - continue polling, don't show error
            console.log(`Network error while polling, continuing... (attempt ${attempts}/${maxAttempts})`);
            return; // Continue polling
          }
          
          // Only show error if it's not a network error or max attempts reached
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            if (!isNetworkError) {
              // Only show error for non-network issues
              setPaymentStatus("failed");
              Alert.alert(
                "Payment Status",
                "Unable to verify payment status. Please check your payment history or contact support."
              );
            } else {
              // For network errors, just keep showing processing
              console.log("Max polling attempts reached due to network issues, but keeping status as processing");
            }
          }
        }
      }, 10000); // Poll every 10 seconds
    } catch (error) {
      console.error("Error setting up payment polling:", error);
      setPaymentStatus("failed");
      Alert.alert("Payment Error", "Failed to monitor payment status");
    }
  };

  const handlePaymentSuccess = () => {
    // Automatically navigate to dashboard after successful payment
    navigation.navigate("OwnerDashboard");
  };

  const handlePaymentRetry = () => {
    console.log("Retrying payment...");
    setPaymentStatus("processing");
    setIsProcessing(false); // Reset processing state
    // Add a small delay to ensure state is updated before processing
    setTimeout(() => {
      processPayment();
    }, 100);
  };

  const renderPaymentContent = () => {
    switch (paymentStatus) {
      case "processing":
        return (
          <View style={styles.paymentContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="hourglass" size={64} color={colors.primary} />
            </View>
            <Text style={styles.statusTitle}>Processing Payment</Text>
            <Text style={styles.statusDescription}>
              Please wait while we connect and process your payment...
            </Text>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
        );

      case "success":
        // Automatically navigate to dashboard after showing success for 1 second
        setTimeout(() => {
          handlePaymentSuccess();
        }, 1000);

        return (
          <View style={styles.paymentContent}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={colors.success}
              />
            </View>
            <Text style={styles.statusTitle}>Payment Successful!</Text>
            <Text style={styles.statusDescription}>
              Your subscription has been activated. Redirecting to dashboard...
            </Text>
          </View>
        );

      case "failed":
        return (
          <View style={styles.paymentContent}>
            <View style={styles.iconContainer}>
              <Ionicons name="close-circle" size={64} color={colors.error} />
            </View>
            <Text style={styles.statusTitle}>Payment Failed</Text>
            <Text style={styles.statusDescription}>
              There was an issue processing your payment. Please try again.
            </Text>
            <View style={styles.buttonRow}>
              <GradientButton
                title="Retry Payment"
                onPress={handlePaymentRetry}
                style={styles.retryButton}
              />
              <GradientButton
                title="Go Back"
                onPress={() => navigation.goBack()}
                variant="secondary"
                style={styles.backButton}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <LinearGradient
      colors={gradients.background}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment</Text>
      </View>

      {renderPaymentContent()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    ...shadows.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontWeight: "bold",
  },
  paymentContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    ...shadows.lg,
  },
  statusTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
    fontWeight: "bold",
  },
  statusDescription: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  loadingDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginHorizontal: 4,
  },
  dot1: {
    animationDelay: "0s",
  },
  dot2: {
    animationDelay: "0.2s",
  },
  dot3: {
    animationDelay: "0.4s",
  },
  successButton: {
    marginTop: spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: spacing.lg,
  },
  retryButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  backButton: {
    flex: 1,
    marginLeft: spacing.sm,
  },
});

export default PaymentScreen;
