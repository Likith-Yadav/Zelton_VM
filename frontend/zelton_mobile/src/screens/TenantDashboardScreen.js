import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientCard from "../components/GradientCard";
import GradientButton from "../components/GradientButton";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatCurrency, formatDate } from "../utils/helpers";
import DataService from "../services/dataService";
import AuthService from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/constants";
import { paymentProofAPI } from "../services/api";

const TenantDashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    current_property: {
      name: "",
      address: "",
    },
    current_unit: {
      unit_number: "",
      rent_amount: 0,
      rent_due_date: 1,
    },
    monthly_rent: 0,
    next_due_date: "",
    payment_status: "up_to_date",
    pending_amount: 0,
    recent_payments: [],
  });
  const [documents, setDocuments] = useState([]);
  const [paymentProofs, setPaymentProofs] = useState([]);

  // Mock data
  const mockDashboardData = {
    current_property: {
      name: "Sunrise Apartments",
      address: "123 Main Street, Mumbai, Maharashtra 400001",
    },
    current_unit: {
      unit_number: "A-101",
      rent_amount: 15000,
      rent_due_date: 1,
    },
    monthly_rent: 15000,
    next_due_date: "2024-02-01",
    payment_status: "up_to_date",
    pending_amount: 0,
    recent_payments: [
      {
        id: 1,
        amount: 15000,
        payment_date: "2024-01-01",
        status: "completed",
        month: "January 2024",
      },
      {
        id: 2,
        amount: 15000,
        payment_date: "2023-12-01",
        status: "completed",
        month: "December 2023",
      },
    ],
  };

  useEffect(() => {
    loadDashboardData();
    loadDocuments();
    loadPaymentProofs();
  }, []);

  // Refresh documents and payment proofs when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadDocuments();
      loadPaymentProofs();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      const result = await DataService.getTenantDashboard();
      if (result.success) {
        console.log("Dashboard data loaded:", result.data);
        setDashboardData(result.data);
      } else {
        console.error("Dashboard load error:", result.error);

        // Check if it's a "No property assigned" error
        if (result.error === "No property assigned") {
          // Redirect to tenant key join screen
          Alert.alert(
            "Property Assignment Required",
            "You need to enter a tenant key to join a property before accessing the dashboard.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Enter Tenant Key",
                onPress: () => navigation.navigate("TenantKeyJoin"),
              },
            ]
          );
          return;
        }

        // For other errors, try to load stored property data as fallback
        await loadStoredPropertyData();
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // Try to load stored property data as fallback
      await loadStoredPropertyData();
    }
  };

  const loadDocuments = async () => {
    try {
      console.log("Loading documents for dashboard...");
      const response = await DataService.getTenantDocuments();
      console.log("Documents response:", response);
      if (response.success) {
        // Handle nested response structure: response.data.data.data (double nested)
        let documentsData = [];
        if (response.data?.data?.data) {
          documentsData = response.data.data.data;
        } else if (response.data?.data) {
          documentsData = response.data.data;
        } else if (Array.isArray(response.data)) {
          documentsData = response.data;
        }

        setDocuments(Array.isArray(documentsData) ? documentsData : []);
        console.log(
          "Documents loaded successfully:",
          documentsData?.length || 0,
          "documents"
        );
      } else {
        console.error("Failed to load documents:", response.error);
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setDocuments([]);
    }
  };

  const loadPaymentProofs = async () => {
    try {
      console.log("Loading payment proofs for dashboard...");
      const response = await paymentProofAPI.getMyPaymentProofs();
      console.log("Payment proofs response:", response);
      if (response.data?.success) {
        const proofsData = response.data.my_payment_proofs || [];
        setPaymentProofs(proofsData);
        console.log(
          "Payment proofs loaded successfully:",
          proofsData.length,
          "proofs"
        );
      } else {
        console.error("Failed to load payment proofs:", response.data?.error);
        setPaymentProofs([]);
      }
    } catch (error) {
      console.error("Error loading payment proofs:", error);
      setPaymentProofs([]);
    }
  };

  // Helper function to get document icon based on type
  const getDocumentIcon = (documentType) => {
    switch (documentType) {
      case "aadhaar":
        return "card";
      case "rental_agreement":
        return "document-text";
      default:
        return "document";
    }
  };

  // Helper function to get document display name
  const getDocumentDisplayName = (documentType) => {
    switch (documentType) {
      case "aadhaar":
        return "Aadhaar Card";
      case "rental_agreement":
        return "Rental Agreement";
      default:
        return "Document";
    }
  };

  // Helper function to check if file is an image
  const isImageFile = (fileName) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp"];
    return imageExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const loadStoredPropertyData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(STORAGE_KEYS.PROPERTY_DATA);
      const paymentHistory = await AsyncStorage.getItem(
        "tenant_payment_history"
      );
      const dueTracking = await AsyncStorage.getItem("tenant_due_tracking");

      if (storedData) {
        const propertyData = JSON.parse(storedData);
        console.log("Loading stored property data:", propertyData);

        // Load payment history
        let recentPayments = [];
        if (paymentHistory) {
          recentPayments = JSON.parse(paymentHistory);
        }

        // Load due tracking data
        let dueData = {
          totalDue: 0,
          monthlyRent: propertyData.unit.rent_amount,
          lastDueUpdate: new Date().toISOString(),
          paymentsThisMonth: 0,
        };
        if (dueTracking) {
          dueData = JSON.parse(dueTracking);
        }

        // Calculate payment status based on due amount
        const paymentStatus = dueData.totalDue > 0 ? "overdue" : "up_to_date";

        setDashboardData({
          current_property: propertyData.property,
          current_unit: propertyData.unit,
          monthly_rent: propertyData.unit.rent_amount,
          next_due_date: new Date().toISOString().split("T")[0],
          payment_status: paymentStatus,
          pending_amount: dueData.totalDue,
          recent_payments: recentPayments,
        });
      }
    } catch (error) {
      console.error("Error loading stored property data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDashboardData(),
      loadDocuments(),
      loadPaymentProofs(),
    ]);
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
        return colors.success; // Green
      case "overdue":
        return colors.error; // Red
      case "partial":
        return colors.warning; // Orange
      case "up_to_date":
        return colors.success; // Legacy support
      case "pending":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "paid":
        return "Rent Paid";
      case "overdue":
        return "Overdue";
      case "partial":
        return "Partial Payment";
      case "up_to_date":
        return "Up to Date"; // Legacy support
      case "pending":
        return "Pending";
      default:
        return "Unknown";
    }
  };

  // Helper functions for payment proof status
  const getProofStatusColor = (status) => {
    switch (status) {
      case "verified":
        return colors.success;
      case "rejected":
        return colors.error;
      case "pending":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getProofStatusText = (status) => {
    switch (status) {
      case "verified":
        return "Verified";
      case "rejected":
        return "Rejected";
      case "pending":
        return "Pending";
      default:
        return "Unknown";
    }
  };

  const getProofStatusIcon = (status) => {
    switch (status) {
      case "verified":
        return "checkmark-circle";
      case "rejected":
        return "close-circle";
      case "pending":
        return "time";
      default:
        return "help-circle";
    }
  };

  return (
    <LinearGradient
      colors={gradients.background}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.userName}>Tenant</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="person-circle" size={40} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Property Info */}
        <GradientCard variant="primary" style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <Ionicons name="home" size={24} color={colors.white} />
            <Text style={styles.propertyTitle}>Current Property</Text>
          </View>
          <Text style={styles.propertyName}>
            {dashboardData.current_property.name}
          </Text>
          <Text style={styles.propertyAddress}>
            {dashboardData.current_property.address}
          </Text>
          <Text style={styles.unitNumber}>
            Unit: {dashboardData.current_unit.unit_number} (
            {dashboardData.current_unit.unit_type})
          </Text>
        </GradientCard>

        {/* Payment Status */}
        <View style={styles.paymentStatusContainer}>
          <Text style={styles.sectionTitle}>Payment Status</Text>
          <GradientCard variant="surface" style={styles.paymentStatusCard}>
            <View style={styles.paymentStatusHeader}>
              <Text style={styles.paymentStatusLabel}>Status</Text>
              <View
                style={[
                  styles.paymentStatusBadge,
                  {
                    backgroundColor:
                      getStatusColor(dashboardData.payment_status) + "20",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.paymentStatusText,
                    { color: getStatusColor(dashboardData.payment_status) },
                  ]}
                >
                  {getStatusText(dashboardData.payment_status)}
                </Text>
              </View>
            </View>

            <View style={styles.paymentInfo}>
              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Monthly Rent</Text>
                <Text style={styles.paymentValue}>
                  {formatCurrency(dashboardData.monthly_rent)}
                </Text>
              </View>

              <View style={styles.paymentItem}>
                <Text style={styles.paymentLabel}>Next Due Date</Text>
                <Text style={styles.paymentValue}>
                  {formatDate(dashboardData.next_due_date)}
                </Text>
              </View>

              {dashboardData.pending_amount > 0 && (
                <View style={styles.paymentItem}>
                  <Text style={styles.paymentLabel}>Pending Amount</Text>
                  <Text style={[styles.paymentValue, { color: colors.error }]}>
                    {formatCurrency(dashboardData.pending_amount)}
                  </Text>
                </View>
              )}
            </View>
          </GradientCard>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[
                styles.quickAction,
                dashboardData.current_month_paid && styles.quickActionDisabled,
              ]}
              onPress={() => {
                if (dashboardData.current_month_paid) {
                  Alert.alert(
                    "Rent Already Paid",
                    "Rent for this month has already been paid.",
                    [{ text: "OK" }]
                  );
                } else {
                  navigation.navigate("TenantPayment");
                }
              }}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  {
                    backgroundColor: dashboardData.current_month_paid
                      ? colors.textSecondary + "20"
                      : colors.success + "20",
                  },
                ]}
              >
                <Ionicons
                  name={
                    dashboardData.current_month_paid
                      ? "checkmark-circle"
                      : "card"
                  }
                  size={24}
                  color={
                    dashboardData.current_month_paid
                      ? colors.textSecondary
                      : colors.success
                  }
                />
              </View>
              <Text
                style={[
                  styles.quickActionText,
                  dashboardData.current_month_paid &&
                    styles.quickActionTextDisabled,
                ]}
              >
                {dashboardData.current_month_paid ? "Rent Paid" : "Pay Rent"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate("PaymentTransactions")}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Ionicons name="receipt" size={24} color={colors.primary} />
              </View>
              <Text style={styles.quickActionText}>View History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate("PaymentProofUpload")}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: colors.accent + "20" },
                ]}
              >
                <Ionicons name="camera" size={24} color={colors.accent} />
              </View>
              <Text style={styles.quickActionText}>Upload Payment Proof</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate("ContactMaintenance")}
            >
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: colors.warning + "20" },
                ]}
              >
                <Ionicons name="construct" size={24} color={colors.warning} />
              </View>
              <Text style={styles.quickActionText}>Contact Maintenance</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Documents Section */}
        <View style={styles.documentsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documents</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("TenantDocuments")}
            >
              <Text style={styles.seeAllText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {/* Warning Notice for Missing Documents */}
          {documents.length < 2 && (
            <GradientCard variant="surface" style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <Ionicons name="warning" size={20} color={colors.warning} />
                <Text style={styles.warningTitle}>Action Required</Text>
              </View>
              <Text style={styles.warningText}>
                Please upload your required documents to complete your profile
                verification.
              </Text>
            </GradientCard>
          )}

          {/* Document Cards Grid */}
          {documents.length > 0 ? (
            <View style={styles.documentCardsGrid}>
              {documents.slice(0, 4).map((document) => (
                <TouchableOpacity
                  key={document.id}
                  style={styles.documentCard}
                  onPress={() => navigation.navigate("TenantDocuments")}
                >
                  <GradientCard
                    variant="surface"
                    style={styles.documentCardContent}
                  >
                    {/* Document Preview */}
                    <View style={styles.documentPreview}>
                      {isImageFile(document.file_name) ? (
                        <Image
                          source={{ uri: document.document_url }}
                          style={styles.documentImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.documentIconContainer}>
                          <Ionicons
                            name={getDocumentIcon(document.document_type)}
                            size={32}
                            color={colors.primary}
                          />
                        </View>
                      )}
                      {/* Document Type Badge */}
                      <View style={styles.documentTypeBadge}>
                        <Text style={styles.documentTypeBadgeText}>
                          {document.document_type === "aadhaar"
                            ? "Aadhaar"
                            : document.document_type === "rental_agreement"
                            ? "Rental"
                            : "Doc"}
                        </Text>
                      </View>
                    </View>

                    {/* Document Info */}
                    <View style={styles.documentInfo}>
                      <Text style={styles.documentName} numberOfLines={1}>
                        {getDocumentDisplayName(document.document_type)}
                      </Text>
                      <Text style={styles.documentSize}>
                        {formatFileSize(document.file_size)}
                      </Text>
                      <Text style={styles.documentDate}>
                        {new Date(document.uploaded_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </GradientCard>
                </TouchableOpacity>
              ))}

              {/* Show More Button if there are more than 4 documents */}
              {documents.length > 4 && (
                <TouchableOpacity
                  style={styles.documentCard}
                  onPress={() => navigation.navigate("TenantDocuments")}
                >
                  <GradientCard
                    variant="surface"
                    style={styles.documentCardContent}
                  >
                    <View style={styles.showMoreContainer}>
                      <Ionicons
                        name="ellipsis-horizontal"
                        size={32}
                        color={colors.primary}
                      />
                      <Text style={styles.showMoreText}>
                        +{documents.length - 4} more
                      </Text>
                    </View>
                  </GradientCard>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <GradientCard variant="surface" style={styles.emptyDocumentsCard}>
              <View style={styles.emptyDocumentsContent}>
                <Ionicons
                  name="document-outline"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyDocumentsText}>
                  No documents uploaded
                </Text>
                <Text style={styles.emptyDocumentsSubtext}>
                  Upload your required documents to get started
                </Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => navigation.navigate("TenantDocuments")}
                >
                  <Text style={styles.uploadButtonText}>Upload Documents</Text>
                </TouchableOpacity>
              </View>
            </GradientCard>
          )}
        </View>

        {/* Payment Proof History */}
        {paymentProofs.length > 0 && (
          <View style={styles.paymentProofsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payment Proof History</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("PaymentProofUpload")}
              >
                <Text style={styles.seeAllText}>Upload New</Text>
              </TouchableOpacity>
            </View>
            <GradientCard variant="surface" style={styles.proofsCard}>
              {paymentProofs.slice(0, 3).map((proof) => (
                <View key={proof.id} style={styles.proofItem}>
                  <View style={styles.proofImageContainer}>
                    {proof.payment_proof_image_url && (
                      <Image
                        source={{ uri: proof.payment_proof_image_url }}
                        style={styles.proofThumbnail}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                  <View style={styles.proofInfo}>
                    <Text style={styles.proofAmount}>
                      {formatCurrency(proof.amount)}
                    </Text>
                    <Text style={styles.proofDate}>
                      {formatDate(proof.uploaded_at)}
                    </Text>
                    <Text style={styles.proofUnit} numberOfLines={1}>
                      Unit: {proof.unit_number}
                    </Text>
                    {proof.description && (
                      <Text style={styles.proofDescription} numberOfLines={2}>
                        {proof.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.proofStatusContainer}>
                    <Ionicons
                      name={getProofStatusIcon(proof.verification_status)}
                      size={24}
                      color={getProofStatusColor(proof.verification_status)}
                    />
                    <Text
                      style={[
                        styles.proofStatusText,
                        {
                          color: getProofStatusColor(
                            proof.verification_status
                          ),
                        },
                      ]}
                    >
                      {getProofStatusText(proof.verification_status)}
                    </Text>
                    {proof.verified_at && (
                      <Text style={styles.proofVerifiedDate}>
                        {new Date(proof.verified_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
              {paymentProofs.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllProofsButton}
                  onPress={() => navigation.navigate("PaymentProofUpload")}
                >
                  <Text style={styles.viewAllProofsText}>
                    View All ({paymentProofs.length})
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </GradientCard>
          </View>
        )}

        {/* Recent Payments */}
        <View style={styles.recentPaymentsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Payment")}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <GradientCard variant="surface" style={styles.paymentsCard}>
            {dashboardData.recent_payments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentMonth}>{payment.month}</Text>
                  <Text style={styles.paymentDate}>
                    {formatDate(payment.payment_date || payment.created_at || payment.updated_at)}
                  </Text>
                </View>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(payment.amount)}
                  </Text>
                  <View
                    style={[
                      styles.paymentStatusBadge,
                      { backgroundColor: colors.success + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.paymentStatusText,
                        { color: colors.success },
                      ]}
                    >
                      {payment.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </GradientCard>
        </View>
      </ScrollView>
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
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greeting: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: "bold",
  },
  profileButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  seeAllText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "500",
  },
  propertyCard: {
    marginBottom: spacing.xl,
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
  paymentStatusContainer: {
    marginBottom: spacing.xl,
  },
  paymentStatusCard: {
    padding: spacing.lg,
  },
  paymentStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  paymentStatusLabel: {
    ...typography.h6,
    color: colors.text,
    fontWeight: "600",
  },
  paymentStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  paymentStatusText: {
    ...typography.caption,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  paymentInfo: {
    gap: spacing.md,
  },
  paymentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  paymentValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  quickActionsContainer: {
    marginBottom: spacing.xl,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickAction: {
    width: "48%",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  quickActionText: {
    ...typography.body2,
    color: colors.text,
    textAlign: "center",
    fontWeight: "500",
  },
  documentsContainer: {
    marginBottom: spacing.xl,
  },
  // Document Cards Grid Styles
  documentCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  documentCard: {
    width: "48%",
    marginBottom: spacing.sm,
  },
  documentCardContent: {
    padding: spacing.sm,
    height: 160,
  },
  documentPreview: {
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  documentImage: {
    width: "100%",
    height: "100%",
  },
  documentIconContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  documentTypeBadge: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  documentTypeBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
    fontSize: 10,
  },
  documentInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  documentName: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  documentSize: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  documentDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  showMoreContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: 160,
  },
  showMoreText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  emptyDocumentsCard: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyDocumentsContent: {
    alignItems: "center",
  },
  emptyDocumentsText: {
    ...typography.h6,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyDocumentsSubtext: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  uploadButtonText: {
    ...typography.body2,
    color: colors.white,
    fontWeight: "600",
  },
  warningCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  warningTitle: {
    ...typography.body1,
    color: colors.warning,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  warningText: {
    ...typography.body2,
    color: colors.text,
    lineHeight: 18,
  },
  quickActionDisabled: {
    opacity: 0.6,
  },
  quickActionTextDisabled: {
    color: colors.textSecondary,
  },
  recentPaymentsContainer: {
    marginBottom: spacing.xl,
  },
  paymentsCard: {
    padding: spacing.md,
  },
  paymentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMonth: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  paymentDate: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  paymentDetails: {
    alignItems: "flex-end",
  },
  paymentAmount: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  // Payment Proof History Styles
  paymentProofsContainer: {
    marginBottom: spacing.xl,
  },
  proofsCard: {
    padding: spacing.md,
  },
  proofItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  proofImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  proofThumbnail: {
    width: "100%",
    height: "100%",
  },
  proofInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  proofAmount: {
    ...typography.h6,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  proofDate: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  proofUnit: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  proofDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
  proofStatusContainer: {
    alignItems: "center",
    minWidth: 80,
  },
  proofStatusText: {
    ...typography.caption,
    fontWeight: "600",
    marginTop: spacing.xs,
    textAlign: "center",
  },
  proofVerifiedDate: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  viewAllProofsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
  },
  viewAllProofsText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "600",
    marginRight: spacing.xs,
  },
});

export default TenantDashboardScreen;
