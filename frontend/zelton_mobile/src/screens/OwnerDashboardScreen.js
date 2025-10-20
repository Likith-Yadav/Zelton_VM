import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
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

const { width } = Dimensions.get("window");

const OwnerDashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    total_properties: 0,
    total_units: 0,
    occupied_units: 0,
    vacant_units: 0,
    monthly_revenue: 0,
    pending_payments: 0,
    overdue_payments: 0,
    total_due: 0,
    recent_payments: [],
    recent_tenants: [],
  });

  // Profile data for user display
  const [profileData, setProfileData] = useState(null);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load both dashboard data and profile data
      const [dashboardResponse, profileResponse] = await Promise.all([
        DataService.getOwnerDashboard(),
        DataService.getOwnerProfile()
      ]);

      // Handle profile data
      if (profileResponse.success && profileResponse.data) {
        setProfileData(profileResponse.data);
        console.log("Profile data loaded successfully");
      } else {
        console.log("Profile data not available, using fallback");
      }

      if (dashboardResponse.success) {
        // Ensure arrays are properly handled and format payment data
        const dashboardData = {
          ...dashboardResponse.data,
          recent_payments: Array.isArray(dashboardResponse.data.recent_payments)
            ? dashboardResponse.data.recent_payments.map((payment) => ({
                id: payment.id,
                tenant_name: payment.tenant_name || "Tenant",
                unit_number: payment.unit_number || "N/A",
                amount: payment.amount,
                status: payment.status,
                payment_date: payment.payment_date,
                property_name: payment.property_name || "Property",
              }))
            : [],
          recent_tenants: Array.isArray(dashboardResponse.data.recent_tenants)
            ? dashboardResponse.data.recent_tenants.map((tenant) => ({
                id: tenant.id,
                name:
                  tenant.user?.first_name + " " + tenant.user?.last_name ||
                  "Tenant",
                unit: tenant.tenant_keys?.first()?.unit?.unit_number || "N/A",
                join_date: tenant.created_at,
              }))
            : [],
        };
        setDashboardData(dashboardData);
        console.log("Dashboard data loaded successfully");
      } else {
        // Check if it's an authentication error
        if (dashboardResponse.error && dashboardResponse.error.includes("401")) {
          setError("Session expired. Please login again.");
          // Navigate to login after a delay
          setTimeout(() => {
            navigation.navigate("Landing");
          }, 2000);
        } else if (
          dashboardResponse.error &&
          dashboardResponse.error.includes("Owner profile not found")
        ) {
          // Handle case where user doesn't have owner profile
          console.log("No owner profile found, loading demo data");
          await loadDemoData();
        } else {
          setError(dashboardResponse.error || "Failed to load dashboard data");
          // Load tenant payment data as fallback
          await loadTenantPaymentData();
        }
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError("Failed to load dashboard data");
      // Load demo data as fallback
      await loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadTenantPaymentData = async () => {
    try {
      // Load tenant payment history to show in owner dashboard
      const paymentHistory = await AsyncStorage.getItem(
        "tenant_payment_history"
      );
      let recentPayments = [];

      if (paymentHistory) {
        const payments = JSON.parse(paymentHistory);
        // Convert tenant payments to owner dashboard format
        recentPayments = payments.map((payment) => ({
          id: payment.id,
          tenant_name: "Tenant User",
          unit_number: payment.unit_number,
          amount: payment.amount,
          status: payment.status,
          payment_date: payment.payment_date,
          property_name: payment.property_name,
        }));
      }

      // Set default dashboard data with tenant payments
      setDashboardData({
        total_properties: 1,
        total_units: 1,
        occupied_units: 1,
        vacant_units: 0,
        monthly_revenue: recentPayments.reduce(
          (sum, payment) => sum + payment.amount,
          0
        ),
        pending_payments: 0,
        overdue_payments: 0,
        total_due: 0,
        recent_payments: recentPayments,
        recent_tenants: [],
      });

      console.log("Fallback dashboard data loaded successfully");
    } catch (error) {
      console.error("Error loading tenant payment data:", error);
      // Set minimal fallback data
      setDashboardData({
        total_properties: 0,
        total_units: 0,
        occupied_units: 0,
        vacant_units: 0,
        monthly_revenue: 0,
        pending_payments: 0,
        overdue_payments: 0,
        total_due: 0,
        recent_payments: [],
        recent_tenants: [],
      });
    }
  };

  const loadDemoData = async () => {
    try {
      // Load tenant payment history and due tracking
      const paymentHistory = await AsyncStorage.getItem(
        "tenant_payment_history"
      );
      const dueTracking = await AsyncStorage.getItem("tenant_due_tracking");

      let recentPayments = [];
      let totalRevenue = 0;
      let pendingAmount = 0;

      if (paymentHistory) {
        const payments = JSON.parse(paymentHistory);
        // Convert tenant payments to owner dashboard format
        recentPayments = payments.map((payment) => ({
          id: payment.id,
          tenant_name: "Tenant User",
          unit_number: payment.unit_number,
          amount: payment.amount,
          status: payment.status,
          payment_date: payment.payment_date,
          property_name: payment.property_name,
        }));

        // Calculate total revenue from completed payments
        totalRevenue = payments
          .filter((payment) => payment.status === "completed")
          .reduce((sum, payment) => sum + payment.amount, 0);
      }

      // Load due tracking data
      if (dueTracking) {
        const dueData = JSON.parse(dueTracking);
        pendingAmount = dueData.totalDue;
      }

      // Set demo dashboard data with real tenant data
      setDashboardData({
        total_properties: 2,
        total_units: 5,
        occupied_units: 3,
        vacant_units: 2,
        monthly_revenue: totalRevenue || 15000,
        pending_payments: pendingAmount,
        overdue_payments: pendingAmount > 0 ? pendingAmount : 0,
        total_due: pendingAmount,
        recent_payments:
          recentPayments.length > 0
            ? recentPayments
            : [
                {
                  id: 1,
                  tenant_name: "Demo Tenant",
                  unit_number: "A-101",
                  amount: 15000,
                  status: "completed",
                  payment_date: new Date().toISOString(),
                  property_name: "Demo Property",
                },
              ],
        recent_tenants: [
          {
            id: 1,
            user: {
              first_name: "Demo",
              last_name: "Tenant",
              email: "demo@example.com",
            },
          },
        ],
      });

      console.log("Demo dashboard data loaded successfully");
      console.log("Total revenue:", totalRevenue);
      console.log("Pending amount:", pendingAmount);
    } catch (error) {
      console.error("Error loading demo data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return colors.success;
      case "pending":
        return colors.warning;
      case "failed":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
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

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AuthService.logout();
          navigation.navigate("Landing");
        },
      },
    ]);
  };

  const renderStatsCard = (title, value, subtitle, icon, color) => (
    <GradientCard variant="surface" style={styles.statsCard}>
      <View style={styles.statsContent}>
        <View style={styles.statsHeader}>
          <View style={[styles.statsIcon, { backgroundColor: color + "20" }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          <Text style={styles.statsTitle}>{title}</Text>
        </View>
        <Text style={styles.statsValue}>{value}</Text>
        {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
      </View>
    </GradientCard>
  );

  const renderQuickAction = (title, icon, onPress, color = colors.primary) => (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );

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
            <Text style={styles.userName}>
              {profileData?.user?.first_name && profileData?.user?.last_name
                ? `${profileData.user.first_name} ${profileData.user.last_name}`
                : "Property Owner"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Profile")}
          >
            {profileData?.profile_image ? (
              <Image 
                source={{ 
                  uri: profileData.profile_image + (profileData.profile_image.includes('?') ? '&' : '?') + 't=' + Date.now()
                }} 
                style={styles.profileImage}
                onError={() => console.log('Profile image load error')}
              />
            ) : (
              <Ionicons name="person-circle" size={40} color={colors.primary} />
            )}
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
        {/* Error Message */}
        {error && (
          <GradientCard variant="surface" style={styles.errorCard}>
            <View style={styles.errorContent}>
              <Ionicons name="warning" size={24} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={loadDashboardData}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </GradientCard>
        )}

        {/* Loading State */}
        {loading && !refreshing && (
          <GradientCard variant="surface" style={styles.loadingCard}>
            <View style={styles.loadingContent}>
              <Ionicons name="refresh" size={24} color={colors.primary} />
              <Text style={styles.loadingText}>Loading dashboard data...</Text>
            </View>
          </GradientCard>
        )}
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            {renderStatsCard(
              "Properties",
              dashboardData.total_properties.toString(),
              "Total properties",
              "business",
              colors.primary
            )}
            {renderStatsCard(
              "Units",
              dashboardData.total_units.toString(),
              `${dashboardData.occupied_units} occupied`,
              "home",
              colors.accent
            )}
            {renderStatsCard(
              "Revenue",
              formatCurrency(dashboardData.monthly_revenue),
              "Total received",
              "trending-up",
              colors.success
            )}
            {renderStatsCard(
              "Pending",
              formatCurrency(dashboardData.pending_payments),
              "Outstanding",
              "time",
              colors.warning
            )}
            {renderStatsCard(
              "Overdue",
              formatCurrency(dashboardData.overdue_payments),
              "Past due",
              "alert-circle",
              colors.error
            )}
            {renderStatsCard(
              "Total Due",
              formatCurrency(dashboardData.total_due),
              "All pending",
              "card",
              colors.secondary
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {renderQuickAction(
              "Add Property",
              "add-circle",
              () => navigation.navigate("PropertyManagement"),
              colors.primary
            )}
            {renderQuickAction(
              "Manage Units",
              "grid",
              () => navigation.navigate("UnitManagement"),
              colors.accent
            )}
            {renderQuickAction(
              "View Payments",
              "card",
              () => navigation.navigate("PaymentTransactions"),
              colors.success
            )}
            {renderQuickAction(
              "Analytics",
              "analytics",
              () => navigation.navigate("Analytics"),
              colors.secondary
            )}
          </View>
        </View>

        {/* Recent Payments */}
        <View style={styles.recentPaymentsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("PaymentTransactions")}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <GradientCard variant="surface" style={styles.paymentsCard}>
            {dashboardData.recent_payments.map((payment) => (
              <View key={payment.id} style={styles.paymentItem}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTenant}>
                    {payment.tenant_name}
                  </Text>
                  <Text style={styles.paymentUnit}>{payment.unit_number}</Text>
                </View>
                <View style={styles.paymentDetails}>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(payment.amount)}
                  </Text>
                  <View style={styles.paymentStatus}>
                    <Ionicons
                      name={getStatusIcon(payment.status)}
                      size={16}
                      color={getStatusColor(payment.status)}
                    />
                    <Text
                      style={[
                        styles.paymentStatusText,
                        { color: getStatusColor(payment.status) },
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

        {/* Recent Tenants */}
        <View style={styles.recentTenantsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Tenants</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <GradientCard variant="surface" style={styles.tenantsCard}>
            {dashboardData.recent_tenants.map((tenant) => (
              <View key={tenant.id} style={styles.tenantItem}>
                <View style={styles.tenantAvatar}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <View style={styles.tenantInfo}>
                  <Text style={styles.tenantName}>{tenant.name}</Text>
                  <Text style={styles.tenantUnit}>{tenant.unit}</Text>
                </View>
                <Text style={styles.tenantDate}>
                  {formatDate(tenant.join_date)}
                </Text>
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
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  statsContainer: {
    marginBottom: spacing.xl,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statsCard: {
    width: (width - spacing.lg * 2 - spacing.sm) / 2,
    marginBottom: spacing.md,
  },
  statsContent: {
    padding: spacing.md,
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  statsTitle: {
    ...typography.body2,
    color: colors.textSecondary,
    flex: 1,
  },
  statsValue: {
    ...typography.h4,
    color: colors.text,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  statsSubtitle: {
    ...typography.caption,
    color: colors.textLight,
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
    width: (width - spacing.lg * 2 - spacing.sm) / 2,
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
  paymentTenant: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  paymentUnit: {
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
  paymentStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentStatusText: {
    ...typography.caption,
    marginLeft: spacing.xs,
    textTransform: "capitalize",
  },
  recentTenantsContainer: {
    marginBottom: spacing.xl,
  },
  tenantsCard: {
    padding: spacing.md,
  },
  tenantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tenantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  tenantUnit: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  tenantDate: {
    ...typography.caption,
    color: colors.textLight,
  },
  errorCard: {
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    flex: 1,
    marginLeft: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body2,
    color: colors.white,
    fontWeight: "600",
  },
  loadingCard: {
    marginBottom: spacing.lg,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text,
    marginLeft: spacing.sm,
  },
});

export default OwnerDashboardScreen;
