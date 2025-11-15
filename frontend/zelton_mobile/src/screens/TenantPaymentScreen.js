import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientCard from "../components/GradientCard";
import GradientButton from "../components/GradientButton";
import InputField from "../components/InputField";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatCurrency, formatDate } from "../utils/helpers";
import DataService from "../services/dataService";
import { paymentAPI } from "../services/api";
import AuthService from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";

const TenantPaymentScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState("full");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle, processing, success, failed
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [alreadyPaidThisMonth, setAlreadyPaidThisMonth] = useState(0);
  const [latestPaymentBreakup, setLatestPaymentBreakup] = useState(null);

  useEffect(() => {
    loadPaymentData();
  }, []);

  // Remaining amount is fetched from backend only, no frontend calculations

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const result = await DataService.getTenantDashboard();
      if (result.success) {
        setPaymentData(result.data);
      } else {
        Alert.alert("Error", result.error);
      }

      // Debug: Check payment status
      console.log("=== CHECKING PAYMENT STATUS ===");
      const statusResult = await DataService.checkPaymentStatus();
      console.log("Payment status result:", statusResult);

      if (statusResult.success) {
        setAlreadyPaidThisMonth(statusResult.data.total_paid_this_month || 0);
        console.log(
          "Already paid this month:",
          statusResult.data.total_paid_this_month
        );
      }

      // Set remaining amount from unit table
      if (result.success && result.data.current_unit) {
        setRemainingAmount(result.data.current_unit.remaining_amount || 0);
        console.log(
          "Remaining amount from unit table:",
          result.data.current_unit.remaining_amount
        );
      }
    } catch (error) {
      console.error("Error loading payment data:", error);
      Alert.alert("Error", "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentAmount = () => {
    if (selectedAmount === "full") {
      return remainingAmount || 0;
    } else if (selectedAmount === "custom") {
      return parseFloat(customAmount) || 0;
    }
    return 0;
  };

  const calculatePaymentBreakup = (amountValue) => {
    const baseAmount = Number(amountValue || 0);
    if (!baseAmount || baseAmount <= 0) {
      return {
        baseAmount: 0,
        chargeRate: 0,
        chargeAmount: 0,
        totalAmount: 0,
      };
    }

    const rate = baseAmount <= 10000 ? 0.02 : 0.025;
    const chargeAmount = parseFloat((baseAmount * rate).toFixed(2));
    const totalAmount = parseFloat((baseAmount + chargeAmount).toFixed(2));

    return {
      baseAmount,
      chargeRate: parseFloat((rate * 100).toFixed(2)),
      chargeAmount,
      totalAmount,
    };
  };

  const paymentBreakup = useMemo(
    () => calculatePaymentBreakup(getPaymentAmount()),
    [selectedAmount, customAmount, remainingAmount]
  );

  const normalizeBreakup = (breakup) => {
    if (!breakup) {
      return calculatePaymentBreakup(0);
    }

    if (typeof breakup.baseAmount !== "undefined") {
      return {
        baseAmount: Number(breakup.baseAmount ?? 0),
        chargeAmount: Number(breakup.chargeAmount ?? 0),
        chargeRate: Number(breakup.chargeRate ?? 0),
        totalAmount: Number(breakup.totalAmount ?? 0),
      };
    }

    return {
      baseAmount: Number(breakup.base_amount ?? 0),
      chargeAmount: Number(breakup.payment_charge ?? 0),
      chargeRate: Number(breakup.charge_rate_percent ?? 0),
      totalAmount: Number(breakup.total_payable ?? 0),
    };
  };

  // Remaining amount is fetched from backend only, no frontend calculations
  const refreshRemainingAmount = async () => {
    try {
      const result = await DataService.getTenantDashboard();
      if (result.success && result.data.current_unit) {
        setRemainingAmount(result.data.current_unit.remaining_amount || 0);
        console.log(
          `Remaining amount refreshed from backend: ${result.data.current_unit.remaining_amount}`
        );
      }
    } catch (error) {
      console.error("Error refreshing remaining amount:", error);
    }
  };

  const handlePayment = async () => {
    const amount = getPaymentAmount();

    if (amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (selectedAmount === "custom" && !customAmount) {
      Alert.alert("Error", "Please enter custom amount");
      return;
    }

    // Validate amount doesn't exceed remaining amount
    if (amount > remainingAmount) {
      Alert.alert(
        "Invalid Amount",
        `Payment amount cannot exceed remaining amount of ₹${remainingAmount.toFixed(
          2
        )}`
      );
      return;
    }

    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    try {
      setProcessingPayment(true);
      setPaymentStatus("processing");

      // Ensure token is ready before making payment request
      console.log("🔐 Validating token before payment...");
      const tokenCheck = await AuthService.ensureTokenReady();
      if (!tokenCheck.success) {
        console.error("❌ Token validation failed:", tokenCheck.error);
        setProcessingPayment(false);
        setPaymentStatus("failed");
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
        return;
      }

      console.log("✅ Token validated successfully, proceeding with payment");

      const localBreakup = normalizeBreakup(paymentBreakup);
      const amount = localBreakup.baseAmount;

      // Initiate PhonePe payment
      console.log(`=== FRONTEND PAYMENT DEBUG ===`);
      console.log(`Payment amount: ${amount}`);
      console.log(`Payment type: rent`);

      const response = await paymentAPI.initiateTenantRentPayment(
        amount,
        "rent"
      );

      console.log(`Backend response:`, response);

      if (response.data.success) {
        const { redirect_url, merchant_order_id, order_id } = response.data;
        const backendBreakup = response.data.payment_breakup
          ? normalizeBreakup(response.data.payment_breakup)
          : localBreakup;

        setLatestPaymentBreakup(backendBreakup);

        // Store payment data for callback handling
        await AsyncStorage.setItem(
          "current_payment_data",
          JSON.stringify({
            merchant_order_id,
            order_id,
            amount: backendBreakup.totalAmount,
            base_amount: backendBreakup.baseAmount,
            payment_charge: backendBreakup.chargeAmount,
            payment_type: "rent",
          })
        );

        // Open PhonePe payment page
        const canOpen = await Linking.canOpenURL(redirect_url);
        if (canOpen) {
          await Linking.openURL(redirect_url);

          // Show processing status
          setPaymentStatus("processing");

          // Start polling for payment status
          pollPaymentStatus(merchant_order_id, backendBreakup);
        } else {
          throw new Error("Cannot open PhonePe payment page");
        }
      } else {
        throw new Error(response.data.error || "Payment initiation failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      console.error("Error message:", error.message);
      console.error("Error response:", error.response);
      setPaymentStatus("failed");

      // Handle duplicate payment error specifically
      if (error.message && error.message.includes("already been fully paid")) {
        Alert.alert("Monthly Rent Fully Paid", error.message, [
          {
            text: "OK",
            onPress: () => {
              setShowPaymentModal(false);
              setPaymentStatus("idle");
              navigation.goBack();
            },
          },
        ]);
      } else if (error.message && error.message.includes("already been paid")) {
        Alert.alert("Rent Already Paid", error.message, [
          {
            text: "OK",
            onPress: () => {
              setShowPaymentModal(false);
              setPaymentStatus("idle");
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert(
          "Payment Failed",
          error.message || "Failed to initiate payment"
        );
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  const pollPaymentStatus = async (merchantOrderId, breakupData = null) => {
    try {
      const maxAttempts = 20; // Poll for 10 minutes (20 * 30 seconds)
      let attempts = 0;
      const effectiveBreakup = breakupData
        ? normalizeBreakup(breakupData)
        : latestPaymentBreakup || normalizeBreakup(paymentBreakup);

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
              setPaymentStatus("success");

              // Store payment data locally
              await storePaymentData(effectiveBreakup, response.data);

              // Show success message
              setTimeout(() => {
                const totalPaid = formatCurrency(effectiveBreakup.totalAmount);
                const chargeNote =
                  effectiveBreakup.chargeAmount > 0
                    ? ` (includes ${formatCurrency(
                        effectiveBreakup.chargeAmount
                      )} PhonePe charges)`
                    : "";
                Alert.alert(
                  "Payment Successful!",
                  `Your payment of ${totalPaid}${chargeNote} has been processed successfully.`,
                  [
                    {
                      text: "OK",
                      onPress: async () => {
                        setShowPaymentModal(false);
                        setPaymentStatus("idle");
                        await loadPaymentData(); // Refresh data
                        await refreshRemainingAmount(); // Refresh remaining amount from backend
                        navigation.goBack();
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
                "Your payment was not successful. Please try again."
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
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPaymentStatus("failed");
            Alert.alert(
              "Payment Error",
              "Unable to verify payment status. Please contact support."
            );
          }
        }
      }, 30000); // Poll every 30 seconds instead of 10 seconds
    } catch (error) {
      console.error("Error setting up payment polling:", error);
      setPaymentStatus("failed");
      Alert.alert("Payment Error", "Failed to monitor payment status");
    }
  };

  const storePaymentData = async (breakup, backendData = null) => {
    try {
      const normalizedBreakup = normalizeBreakup(breakup);
      const baseAmount = normalizedBreakup.baseAmount;
      const totalAmount = normalizedBreakup.totalAmount;
      const chargeAmount = normalizedBreakup.chargeAmount;

      // Store payment data locally for history only
      // Remaining amount calculations are handled by backend
      const existingPayments = await AsyncStorage.getItem(
        "tenant_payment_history"
      );

      let paymentHistory = existingPayments ? JSON.parse(existingPayments) : [];

      // Create new payment record
      const newPayment = {
        id: backendData?.payment?.id || Date.now(),
        amount: baseAmount,
        total_amount: totalAmount,
        payment_charge: chargeAmount,
        payment_date:
          backendData?.payment?.payment_date || new Date().toISOString(),
        status: "completed",
        month: new Date().toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
        payment_type: "rent",
        property_name:
          paymentData?.current_property?.name || "Current Property",
        unit_number: paymentData?.current_unit?.unit_number || "A-101",
        transaction_id: backendData?.transaction_id || null,
        invoice_id: backendData?.invoice?.id || null,
      };

      // Add to payment history
      paymentHistory.unshift(newPayment);

      // Keep only last 10 payments
      if (paymentHistory.length > 10) {
        paymentHistory = paymentHistory.slice(0, 10);
      }

      // Store updated data
      await AsyncStorage.setItem(
        "tenant_payment_history",
        JSON.stringify(paymentHistory)
      );

      console.log("Payment data stored successfully:", newPayment);
      console.log("Remaining amount will be updated by backend");
    } catch (error) {
      console.error("Error storing payment data:", error);
    }
  };

  const renderPaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Confirm Payment</Text>
            <TouchableOpacity
              onPress={() => setShowPaymentModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.paymentSummary}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Property:</Text>
              <Text style={styles.summaryValue}>
                {paymentData?.current_property?.name}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Unit:</Text>
              <Text style={styles.summaryValue}>
                {paymentData?.current_unit?.unit_number}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Monthly Rent:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(paymentData?.monthly_rent || 0)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Rent Amount:</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: colors.primary, fontWeight: "bold" },
                ]}
              >
                {formatCurrency(paymentBreakup.baseAmount)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                PhonePe Charges ({paymentBreakup.chargeRate.toFixed(2)}%):
              </Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(paymentBreakup.chargeAmount)}
              </Text>
            </View>

            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={[styles.summaryLabel, styles.summaryTotalLabel]}>
                Total Payable:
              </Text>
              <Text style={[styles.summaryValue, styles.summaryTotalValue]}>
                {formatCurrency(paymentBreakup.totalAmount)}
              </Text>
            </View>

            <Text style={styles.summaryNote}>
              PhonePe processing fee is applied at{" "}
              {paymentBreakup.chargeRate.toFixed(2)}%. You will be charged the
              total amount shown above.
            </Text>

            {selectedAmount === "custom" && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Remaining Amount:</Text>
                <Text style={[styles.summaryValue, { color: colors.warning }]}>
                  {formatCurrency(remainingAmount)}
                </Text>
              </View>
            )}
          </View>

          {paymentStatus === "processing" && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.processingText}>Processing Payment...</Text>
              <Text style={styles.processingSubtext}>
                Please wait while we process your payment
              </Text>
            </View>
          )}

          {paymentStatus === "success" && (
            <View style={styles.successContainer}>
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={colors.success}
              />
              <Text style={styles.successText}>Payment Successful!</Text>
              <Text style={styles.successSubtext}>
                Your payment has been processed successfully
              </Text>
            </View>
          )}

          {paymentStatus === "failed" && (
            <View style={styles.failedContainer}>
              <Ionicons name="close-circle" size={64} color={colors.error} />
              <Text style={styles.failedText}>Payment Failed</Text>
              <Text style={styles.failedSubtext}>
                There was an issue processing your payment
              </Text>
            </View>
          )}

          <View style={styles.modalActions}>
            {paymentStatus === "idle" && (
              <>
                <GradientButton
                  title="Cancel"
                  onPress={() => setShowPaymentModal(false)}
                  variant="secondary"
                  style={styles.cancelButton}
                />
                <GradientButton
                  title={`Pay ${formatCurrency(paymentBreakup.totalAmount)}`}
                  onPress={processPayment}
                  style={styles.payButton}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment information...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Pay Rent</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshRemainingAmount}
        >
          <Ionicons name="refresh" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Info */}
        <GradientCard variant="primary" style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <Ionicons name="home" size={24} color={colors.white} />
            <Text style={styles.propertyTitle}>Property Details</Text>
          </View>
          <Text style={styles.propertyName}>
            {paymentData?.current_property?.name}
          </Text>
          <Text style={styles.propertyAddress}>
            {paymentData?.current_property?.address}
          </Text>
          <Text style={styles.unitNumber}>
            Unit: {paymentData?.current_unit?.unit_number} (
            {paymentData?.current_unit?.unit_type})
          </Text>
        </GradientCard>

        {/* Payment Amount Selection */}
        <GradientCard variant="surface" style={styles.amountCard}>
          <Text style={styles.cardTitle}>Select Payment Amount</Text>

          <TouchableOpacity
            style={[
              styles.amountOption,
              selectedAmount === "full" && styles.selectedAmountOption,
            ]}
            onPress={() => setSelectedAmount("full")}
          >
            <View style={styles.amountOptionContent}>
              <Ionicons
                name={
                  selectedAmount === "full"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={colors.primary}
              />
              <View style={styles.amountOptionText}>
                <Text style={styles.amountOptionTitle}>
                  {remainingAmount === paymentData?.monthly_rent
                    ? "Full Remaining Amount"
                    : "Remaining Amount"}
                </Text>
                <Text style={styles.amountOptionSubtitle}>
                  {remainingAmount === paymentData?.monthly_rent
                    ? "Pay complete monthly rent"
                    : "Pay remaining balance"}
                </Text>
              </View>
              <Text style={styles.amountOptionValue}>
                {formatCurrency(remainingAmount || 0)}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.amountOption,
              selectedAmount === "custom" && styles.selectedAmountOption,
            ]}
            onPress={() => setSelectedAmount("custom")}
          >
            <View style={styles.amountOptionContent}>
              <Ionicons
                name={
                  selectedAmount === "custom"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={colors.primary}
              />
              <View style={styles.amountOptionText}>
                <Text style={styles.amountOptionTitle}>Custom Amount</Text>
                <Text style={styles.amountOptionSubtitle}>
                  Pay partial amount
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {selectedAmount === "custom" && (
            <View style={styles.customAmountContainer}>
              <InputField
                label="Enter Amount"
                value={customAmount}
                onChangeText={(text) => {
                  const amount = parseFloat(text) || 0;
                  if (amount <= remainingAmount) {
                    setCustomAmount(text);
                  } else {
                    Alert.alert(
                      "Invalid Amount",
                      `Amount cannot exceed remaining amount of ₹${remainingAmount.toFixed(
                        2
                      )}`
                    );
                  }
                }}
                placeholder="0.00"
                keyboardType="numeric"
                prefix="₹"
              />
            </View>
          )}
        </GradientCard>

        {/* Payment Summary */}
        <GradientCard variant="surface" style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Payment Summary</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Monthly Rent:</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(paymentData?.monthly_rent || 0)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Payment Amount:</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: colors.primary, fontWeight: "bold" },
              ]}
            >
              {formatCurrency(getPaymentAmount())}
            </Text>
          </View>

          {selectedAmount === "custom" && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Remaining Amount:</Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                {formatCurrency(remainingAmount - getPaymentAmount())}
              </Text>
            </View>
          )}

          {selectedAmount === "custom" && remainingAmount > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Note:</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: colors.textSecondary, fontSize: 12 },
                ]}
              >
                You can make multiple payments until the full amount is paid
              </Text>
            </View>
          )}

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Due Date:</Text>
            <Text style={styles.summaryValue}>
              {formatDate(paymentData?.next_due_date)}
            </Text>
          </View>
        </GradientCard>

        {/* Payment Options */}
        <View style={styles.paymentOptionsContainer}>
          <GradientButton
            title={`Pay ${formatCurrency(getPaymentAmount())}`}
            onPress={handlePayment}
            style={styles.payButton}
            disabled={getPaymentAmount() <= 0}
          />
          
          <TouchableOpacity
            style={styles.manualPaymentButton}
            onPress={() => navigation.navigate("PaymentProofUpload")}
          >
            <View style={styles.manualPaymentContent}>
              <Ionicons name="camera" size={24} color={colors.primary} />
              <View style={styles.manualPaymentText}>
                <Text style={styles.manualPaymentTitle}>Upload Payment Proof</Text>
                <Text style={styles.manualPaymentSubtitle}>
                  Upload receipt or screenshot for manual verification
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
 
      {renderPaymentModal()}
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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
    ...shadows.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
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
  propertyCard: {
    marginBottom: spacing.lg,
  },
  propertyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  propertyTitle: {
    ...typography.h6,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  propertyName: {
    ...typography.h4,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  propertyAddress: {
    ...typography.body2,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.sm,
  },
  unitNumber: {
    ...typography.body1,
    color: colors.white,
    fontWeight: "500",
  },
  amountCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: "600",
  },
  amountOption: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  selectedAmountOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  amountOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountOptionText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  amountOptionTitle: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  amountOptionSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  amountOptionValue: {
    ...typography.h6,
    color: colors.primary,
    fontWeight: "bold",
  },
  customAmountContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  remainingAmount: {
    ...typography.body2,
    color: colors.warning,
    textAlign: "right",
    marginTop: spacing.sm,
  },
  summaryCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  paymentOptionsContainer: {
    marginBottom: spacing.xl,
  },
  payButton: {
    marginBottom: spacing.md,
  },
  manualPaymentButton: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  manualPaymentContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  manualPaymentText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  manualPaymentTitle: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  manualPaymentSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text,
    fontWeight: "bold",
  },
  closeButton: {
    padding: spacing.sm,
  },
  paymentSummary: {
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  summaryTotalLabel: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
  },
  summaryTotalValue: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: "700",
  },
  summaryNote: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  processingContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  processingText: {
    ...typography.h6,
    color: colors.text,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  processingSubtext: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  successText: {
    ...typography.h6,
    color: colors.success,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  successSubtext: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  failedContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  failedText: {
    ...typography.h6,
    color: colors.error,
    marginTop: spacing.md,
    fontWeight: "600",
  },
  failedSubtext: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.xl,
    backgroundColor: 'transparent',
  },
});

export default TenantPaymentScreen;
