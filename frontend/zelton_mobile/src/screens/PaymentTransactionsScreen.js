import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
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
import { formatCurrency, formatDate } from "../utils/helpers";
import DataService from "../services/dataService";

const { width } = Dimensions.get("window");

const PaymentTransactionsScreen = ({ navigation }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all"); // all, completed, pending, failed

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await DataService.getPayments();

      if (response.success) {
        // Ensure we always set an array, even if the API returns null/undefined
        const paymentsData = Array.isArray(response.data) ? response.data : [];
        setPayments(paymentsData);
        console.log("Loaded payments:", paymentsData.length);
      } else {
        setError(response.error || "Failed to load payments");
        setPayments([]); // Set empty array on error
      }
    } catch (err) {
      console.error("Payments load error:", err);
      setError("Failed to load payments");
      setPayments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    // Map transaction statuses to payment statuses for display
    const displayStatus = status === "success" ? "completed" : status;

    switch (displayStatus) {
      case "completed":
        return colors.success;
      case "pending":
        return colors.warning;
      case "failed":
        return colors.error;
      default:
        return colors.textLight;
    }
  };

  const getStatusIcon = (status) => {
    // Map transaction statuses to payment statuses for display
    const displayStatus = status === "success" ? "completed" : status;

    switch (displayStatus) {
      case "completed":
        return "checkmark-circle";
      case "pending":
        return "time";
      case "failed":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const filteredPayments = (payments || []).filter((payment) => {
    if (filter === "all") return true;

    // Map transaction statuses to payment statuses for filtering
    let paymentStatus = payment.status;
    if (paymentStatus === "success") {
      paymentStatus = "completed";
    }

    return paymentStatus === filter;
  });

  const renderPaymentCard = (payment) => (
    <GradientCard key={payment.id} variant="surface" style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <Text style={styles.tenantName}>{payment.tenant_name || "N/A"}</Text>
          <Text style={styles.unitInfo}>
            {payment.property_name} - Unit {payment.unit_number}
          </Text>
          <Text style={styles.paymentDate}>
            {formatDate(payment.payment_date || payment.created_at || payment.updated_at)}
          </Text>
        </View>
        <View style={styles.paymentStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(payment.status) },
            ]}
          >
            <Ionicons
              name={getStatusIcon(payment.status)}
              size={16}
              color={colors.white}
            />
            <Text style={styles.statusText}>
              {(payment.status === "success"
                ? "completed"
                : payment.status
              ).toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(payment.amount)}
          </Text>
        </View>

        {payment.payment_method && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Method</Text>
            <Text style={styles.detailValue}>{payment.payment_method}</Text>
          </View>
        )}

        {payment.transaction_id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Transaction ID</Text>
            <Text style={styles.detailValue}>{payment.transaction_id}</Text>
          </View>
        )}

        {payment.notes && (
          <View style={styles.notesRow}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesValue}>{payment.notes}</Text>
          </View>
        )}
      </View>
    </GradientCard>
  );

  const renderFilterButton = (filterType, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
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
          <Text style={styles.title}>Payment Transactions</Text>
        </View>

        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color={colors.primary} />
          <Text style={styles.loadingText}>Loading payments...</Text>
        </View>
      </LinearGradient>
    );
  }

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
        <Text style={styles.title}>Payment Transactions</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {renderFilterButton("all", "All")}
          {renderFilterButton("completed", "Completed")}
          {renderFilterButton("pending", "Pending")}
          {renderFilterButton("failed", "Failed")}
        </View>

        {/* Error State */}
        {error && (
          <GradientCard variant="surface" style={styles.errorCard}>
            <View style={styles.errorContent}>
              <Ionicons name="warning" size={24} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <GradientButton
                title="Retry"
                onPress={loadPayments}
                style={styles.retryButton}
              />
            </View>
          </GradientCard>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPayments.length === 0 && (
          <GradientCard variant="surface" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons name="card" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Payments Found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === "all"
                  ? "No payment transactions yet"
                  : `No ${filter} payments found`}
              </Text>
            </View>
          </GradientCard>
        )}

        {/* Payments List */}
        {!loading && !error && filteredPayments.map(renderPaymentCard)}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.sm,
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
  filterContainer: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  paymentCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  paymentInfo: {
    flex: 1,
  },
  tenantName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  unitInfo: {
    ...typography.body2,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  paymentDate: {
    ...typography.caption,
    color: colors.textLight,
  },
  paymentStatus: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    gap: spacing.xs,
  },
  statusText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
  },
  paymentDetails: {
    gap: spacing.sm,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  amountLabel: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  amountValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: "bold",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    ...typography.body2,
    color: colors.textLight,
  },
  detailValue: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
  },
  notesRow: {
    marginTop: spacing.sm,
  },
  notesLabel: {
    ...typography.body2,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  notesValue: {
    ...typography.body2,
    color: colors.text,
    fontStyle: "italic",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body1,
    color: colors.text,
    marginTop: spacing.md,
  },
  errorCard: {
    marginBottom: spacing.md,
  },
  errorContent: {
    alignItems: "center",
    padding: spacing.lg,
  },
  errorText: {
    ...typography.body1,
    color: colors.error,
    textAlign: "center",
    marginVertical: spacing.md,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  emptyCard: {
    marginBottom: spacing.md,
  },
  emptyContent: {
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: "600",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body1,
    color: colors.textLight,
    textAlign: "center",
  },
});

export default PaymentTransactionsScreen;
