import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
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
import { formatCurrency } from "../utils/helpers";
import { paymentAPI } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PaymentStatusScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("pending"); // pending, completed, failed
  const [paymentData, setPaymentData] = useState(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPaymentData();
  }, []);

  const loadPaymentData = async () => {
    try {
      setLoading(true);

      // Get payment data from route params or AsyncStorage
      let paymentInfo = route.params?.paymentData;

      if (!paymentInfo) {
        const storedData = await AsyncStorage.getItem("current_payment_data");
        if (storedData) {
          paymentInfo = JSON.parse(storedData);
        }
      }

      if (!paymentInfo) {
        setError("No payment data found");
        return;
      }

      setPaymentData(paymentInfo);

      // Start polling for payment status
      pollPaymentStatus(paymentInfo.merchant_order_id);
    } catch (error) {
      console.error("Error loading payment data:", error);
      setError("Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (merchantOrderId) => {
    try {
      setPolling(true);
      const maxAttempts = 30; // Poll for 5 minutes
      let attempts = 0;

      const pollInterval = setInterval(async () => {
        attempts++;

        try {
          const response = await paymentAPI.verifyPaymentStatus(
            merchantOrderId
          );

          if (response.data.success) {
            const { state } = response.data;

            if (state === "COMPLETED") {
              clearInterval(pollInterval);
              setPaymentStatus("completed");
              setPolling(false);

              // Clear stored payment data
              await AsyncStorage.removeItem("current_payment_data");
            } else if (state === "FAILED") {
              clearInterval(pollInterval);
              setPaymentStatus("failed");
              setPolling(false);
            } else if (state === "PENDING" && attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setPaymentStatus("failed");
              setPolling(false);
              setError(
                "Payment timeout - please check your payment status later"
              );
            }
          }
        } catch (error) {
          console.error("Error polling payment status:", error);
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPaymentStatus("failed");
            setPolling(false);
            setError("Unable to verify payment status");
          }
        }
      }, 10000); // Poll every 10 seconds
    } catch (error) {
      console.error("Error setting up payment polling:", error);
      setPolling(false);
      setError("Failed to monitor payment status");
    }
  };

  const handleRetry = () => {
    if (paymentData) {
      pollPaymentStatus(paymentData.merchant_order_id);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleGoHome = () => {
    navigation.navigate("TenantDashboard");
  };

  const renderStatusIcon = () => {
    switch (paymentStatus) {
      case "completed":
        return (
          <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        );
      case "failed":
        return <Ionicons name="close-circle" size={80} color={colors.error} />;
      default:
        return <ActivityIndicator size="large" color={colors.primary} />;
    }
  };

  const renderStatusContent = () => {
    switch (paymentStatus) {
      case "completed":
        return (
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Payment Successful!</Text>
            <Text style={styles.statusSubtitle}>
              Your payment has been processed successfully
            </Text>
            {paymentData && (
              <View style={styles.paymentDetails}>
                <Text style={styles.detailLabel}>Amount Paid:</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(paymentData.amount)}
                </Text>
                <Text style={styles.detailLabel}>Payment Type:</Text>
                <Text style={styles.detailValue}>
                  {paymentData.payment_type === "rent"
                    ? "Rent Payment"
                    : "Other"}
                </Text>
              </View>
            )}
            <View style={styles.buttonContainer}>
              <GradientButton
                title="Go to Dashboard"
                onPress={handleGoHome}
                style={styles.primaryButton}
              />
            </View>
          </View>
        );

      case "failed":
        return (
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Payment Failed</Text>
            <Text style={styles.statusSubtitle}>
              {error || "There was an issue processing your payment"}
            </Text>
            {paymentData && (
              <View style={styles.paymentDetails}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(paymentData.amount)}
                </Text>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>
                  {paymentData.merchant_order_id}
                </Text>
              </View>
            )}
            <View style={styles.buttonContainer}>
              <GradientButton
                title="Retry Payment"
                onPress={handleRetry}
                style={styles.primaryButton}
              />
              <GradientButton
                title="Go Back"
                onPress={handleGoBack}
                variant="secondary"
                style={styles.secondaryButton}
              />
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.statusContent}>
            <Text style={styles.statusTitle}>Processing Payment</Text>
            <Text style={styles.statusSubtitle}>
              Please wait while we verify your payment
            </Text>
            {paymentData && (
              <View style={styles.paymentDetails}>
                <Text style={styles.detailLabel}>Amount:</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(paymentData.amount)}
                </Text>
                <Text style={styles.detailLabel}>Order ID:</Text>
                <Text style={styles.detailValue}>
                  {paymentData.merchant_order_id}
                </Text>
              </View>
            )}
            {polling && (
              <View style={styles.pollingIndicator}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.pollingText}>
                  Checking payment status...
                </Text>
              </View>
            )}
            <View style={styles.buttonContainer}>
              <GradientButton
                title="Go Back"
                onPress={handleGoBack}
                variant="secondary"
                style={styles.secondaryButton}
              />
            </View>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment status...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (error && !paymentData) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={80} color={colors.error} />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <GradientButton
            title="Go Back"
            onPress={handleGoBack}
            variant="secondary"
            style={styles.errorButton}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Status</Text>
      </View>

      {/* Status Content */}
      <View style={styles.content}>
        <View style={styles.statusContainer}>
          {renderStatusIcon()}
          {renderStatusContent()}
        </View>
      </View>
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
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.body1,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    ...typography.h4,
    color: colors.error,
    marginTop: spacing.lg,
    fontWeight: "bold",
  },
  errorSubtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  errorButton: {
    width: "100%",
  },
  statusContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: "center",
    width: "100%",
    ...shadows.lg,
  },
  statusContent: {
    alignItems: "center",
    width: "100%",
  },
  statusTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.lg,
    fontWeight: "bold",
    textAlign: "center",
  },
  statusSubtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  paymentDetails: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  pollingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  pollingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  buttonContainer: {
    width: "100%",
  },
  primaryButton: {
    marginBottom: spacing.md,
  },
  secondaryButton: {
    marginBottom: spacing.md,
  },
});

export default PaymentStatusScreen;
