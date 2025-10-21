import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
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
import { formatCurrency } from "../utils/helpers";
import DataService from "../services/dataService";
import AuthService from "../services/authService";
import { ownerAPI } from "../services/api";

const { width } = Dimensions.get("window");

const PricingScreen = ({ navigation, route }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' or 'yearly'
  const [propertyCount, setPropertyCount] = useState("1-20");
  const [pricingPlans, setPricingPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));

  // Convert property count range to numeric value for comparison
  const getPropertyCountValue = (count) => {
    switch (count) {
      case "1-20":
        return 10; // Use middle value
      case "21-40":
        return 30;
      case "41-60":
        return 50;
      case "61-80":
        return 70;
      case "81-100":
        return 90;
      case "100+":
        return 150; // Use a high value for 100+
      default:
        return 10;
    }
  };

  useEffect(() => {
    console.log("PricingScreen mounted, loading pricing plans...");
    loadPricingPlans();
  }, [propertyCount]);

  useEffect(() => {
    if (route.params?.isUpgrade) {
      // Pre-select the suggested plan
      if (route.params.suggestedPlan) {
        setSelectedPlan(route.params.suggestedPlan.id);
      }
    }
  }, [route.params]);

  const loadPricingPlans = async () => {
    try {
      console.log("Loading pricing plans...");
      const response = await ownerAPI.getPricingPlans();
      console.log("Pricing plans response:", response.data);

      const data = response.data;

      if (data && data.results) {
        console.log("Setting pricing plans:", data.results);
        setPricingPlans(data.results);
        // Auto-select plan based on property count
        const numericCount = getPropertyCountValue(propertyCount);
        const recommendedPlan = data.results.find(
          (plan) =>
            numericCount >= plan.min_properties &&
            numericCount <= plan.max_properties
        );
        if (recommendedPlan) {
          console.log("Auto-selecting plan:", recommendedPlan);
          setSelectedPlan(recommendedPlan.id);
        }
      } else if (Array.isArray(data)) {
        // Handle direct array response
        console.log("Setting pricing plans (array):", data);
        setPricingPlans(data);
        // Auto-select plan based on property count
        const numericCount = getPropertyCountValue(propertyCount);
        const recommendedPlan = data.find(
          (plan) =>
            numericCount >= plan.min_properties &&
            numericCount <= plan.max_properties
        );
        if (recommendedPlan) {
          console.log("Auto-selecting plan:", recommendedPlan);
          setSelectedPlan(recommendedPlan.id);
        }
      } else {
        console.error("Invalid pricing plans data:", data);
        // Use mock data instead of showing error
        setPricingPlans(mockPricingPlans);
      }
    } catch (error) {
      console.error("Error loading pricing plans:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        request: error.request,
      });
    }
  };

  const getRecommendedPlan = () => {
    const numericCount = getPropertyCountValue(propertyCount);
    return pricingPlans.find(
      (plan) =>
        numericCount >= plan.min_properties &&
        numericCount <= plan.max_properties
    );
  };

  const getSavings = (plan) => {
    if (billingCycle === "yearly") {
      const monthlyTotal = plan.monthly_price * 12;
      return monthlyTotal - plan.yearly_price;
    }
    return 0;
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      return; // Just return without showing error
    }

    setLoading(true);
    try {
      const plan = pricingPlans.find((p) => p.id === selectedPlan);

      // Get user data
      const userData = await AuthService.getStoredUserData();
      if (!userData.success || !userData.data.user) {
        // Use a default user ID if no user data found
        const userId = 1; // Default user ID
        const isUpgrade = route.params?.isUpgrade || false;
        navigation.navigate("Payment", {
          subscriptionData: {
            plan: plan,
            billingCycle: billingCycle,
            amount:
              billingCycle === "yearly"
                ? plan.yearly_price
                : plan.monthly_price,
            userId: userId,
          },
          isUpgrade: isUpgrade,
        });
        return;
      }

      const userId = userData.data.user.id;

      // Navigate directly to payment without confirmation dialog
      const isUpgrade = route.params?.isUpgrade || false;
      navigation.navigate("Payment", {
        subscriptionData: {
          plan: plan,
          billingCycle: billingCycle,
          amount:
            billingCycle === "yearly" ? plan.yearly_price : plan.monthly_price,
          userId: userId,
        },
        isUpgrade: isUpgrade,
      });
    } catch (error) {
      console.error("Subscription error:", error);
      // Just continue without showing error
    } finally {
      setLoading(false);
    }
  };

  const renderPricingCard = (plan) => {
    const isSelected = selectedPlan === plan.id;
    const isRecommended = plan.id === getRecommendedPlan()?.id;
    const price =
      billingCycle === "yearly" ? plan.yearly_price : plan.monthly_price;
    const savings = getSavings(plan);

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.pricingCard,
          isSelected && styles.selectedPricingCard,
          isRecommended && styles.recommendedPricingCard,
        ]}
        onPress={() => handlePlanSelect(plan.id)}
        activeOpacity={0.8}
      >
        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedText}>Recommended</Text>
          </View>
        )}

        <GradientCard
          variant={isSelected ? "primary" : "surface"}
          style={styles.cardContent}
        >
          <View style={styles.planHeader}>
            <Text
              style={[styles.planName, isSelected && styles.selectedPlanName]}
            >
              {plan.name}
            </Text>
            <Text
              style={[styles.planRange, isSelected && styles.selectedPlanRange]}
            >
              {plan.min_properties}-
              {plan.max_properties === 999999 ? "∞" : plan.max_properties}{" "}
              properties
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={[styles.price, isSelected && styles.selectedPrice]}>
              {formatCurrency(price)}
            </Text>
            <Text
              style={[
                styles.billingCycle,
                isSelected && styles.selectedBillingCycle,
              ]}
            >
              /{billingCycle === "yearly" ? "year" : "month"}
            </Text>
          </View>

          {savings > 0 && (
            <View style={styles.savingsContainer}>
              <Text style={styles.savingsText}>
                Save {formatCurrency(savings)}/year
              </Text>
            </View>
          )}

          <View style={styles.featuresContainer}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={isSelected ? colors.white : colors.success}
                />
                <Text
                  style={[
                    styles.featureText,
                    isSelected && styles.selectedFeatureText,
                  ]}
                >
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </GradientCard>
      </TouchableOpacity>
    );
  };

  const stickyToggleOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const stickyToggleTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [-60, 0],
    extrapolate: 'clamp',
  });

  return (
    <LinearGradient
      colors={gradients.background}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Sticky Billing Toggle */}
      <Animated.View 
        style={[
          styles.stickyToggleContainer,
          {
            opacity: stickyToggleOpacity,
            transform: [{ translateY: stickyToggleTranslateY }],
          },
        ]}
      >
        <View style={styles.billingToggleContainer}>
          <TouchableOpacity
            style={[
              styles.billingToggle,
              billingCycle === "monthly" && styles.activeBillingToggle,
            ]}
            onPress={() => setBillingCycle("monthly")}
          >
            <Text
              style={[
                styles.billingToggleText,
                billingCycle === "monthly" && styles.activeBillingToggleText,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.billingToggle,
              billingCycle === "yearly" && styles.activeBillingToggle,
            ]}
            onPress={() => setBillingCycle("yearly")}
          >
            <Text
              style={[
                styles.billingToggleText,
                billingCycle === "yearly" && styles.activeBillingToggleText,
              ]}
            >
              Yearly
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Select the perfect plan for your property management needs
        </Text>
      </View>
      {/* Property Count Selector - Updated with ranges */}
      <View style={styles.propertyCountContainer}>
        <Text style={styles.propertyCountLabel}>
          How many properties do you have?
        </Text>
        <View style={styles.propertyCountButtons}>
          {["1-20", "21-40", "41-60", "61-80", "81-100", "100+"].map(
            (count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.propertyCountButton,
                  propertyCount === count && styles.selectedPropertyCountButton,
                ]}
                onPress={() => setPropertyCount(count)}
              >
                <Text
                  style={[
                    styles.propertyCountButtonText,
                    propertyCount === count &&
                      styles.selectedPropertyCountButtonText,
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
        <Text style={styles.pricingNote}>
          Price increases by ₹2,000 for every 20 houses
        </Text>
      </View>

      {/* Billing Cycle Toggle */}
      <View style={styles.billingToggleContainer}>
        <TouchableOpacity
          style={[
            styles.billingToggle,
            billingCycle === "monthly" && styles.activeBillingToggle,
          ]}
          onPress={() => setBillingCycle("monthly")}
        >
          <Text
            style={[
              styles.billingToggleText,
              billingCycle === "monthly" && styles.activeBillingToggleText,
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.billingToggle,
            billingCycle === "yearly" && styles.activeBillingToggle,
          ]}
          onPress={() => setBillingCycle("yearly")}
        >
          <Text
            style={[
              styles.billingToggleText,
              billingCycle === "yearly" && styles.activeBillingToggleText,
            ]}
          >
            Yearly
          </Text>
        </TouchableOpacity>
      </View>

        {/* Pricing Plans */}
        <View style={styles.pricingContainer}>
          {pricingPlans.map(renderPricingCard)}
        </View>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={styles.subscribeContainer}>
        <GradientButton
          title="Pay Now"
          onPress={handleSubscribe}
          loading={loading}
          disabled={!selectedPlan}
          style={styles.subscribeButton}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyToggleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    ...shadows.md,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
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
  propertyCountContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  propertyCountLabel: {
    ...typography.body1,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "500",
  },
  propertyCountButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  propertyCountButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPropertyCountButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  propertyCountButtonText: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
  },
  selectedPropertyCountButtonText: {
    color: colors.white,
  },
  pricingNote: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: "center",
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  billingToggleContainer: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 25,
    padding: 4,
  },
  billingToggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: 20,
  },
  activeBillingToggle: {
    backgroundColor: colors.primary,
  },
  billingToggleText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  activeBillingToggleText: {
    color: colors.white,
  },
  pricingContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  pricingCard: {
    marginBottom: spacing.lg,
    position: "relative",
  },
  selectedPricingCard: {
    transform: [{ scale: 1.02 }],
  },
  recommendedPricingCard: {
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 16,
  },
  recommendedBadge: {
    position: "absolute",
    top: -8,
    right: 20,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    zIndex: 1,
  },
  recommendedText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
  },
  cardContent: {
    padding: spacing.lg,
  },
  planHeader: {
    marginBottom: spacing.md,
  },
  planName: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  selectedPlanName: {
    color: colors.white,
  },
  planRange: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  selectedPlanRange: {
    color: colors.white,
    opacity: 0.9,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.sm,
  },
  price: {
    ...typography.h2,
    color: colors.text,
    fontWeight: "bold",
  },
  selectedPrice: {
    color: colors.white,
  },
  billingCycle: {
    ...typography.body1,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  selectedBillingCycle: {
    color: colors.white,
    opacity: 0.9,
  },
  savingsContainer: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  savingsText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "600",
  },
  featuresContainer: {
    marginTop: spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  featureText: {
    ...typography.body2,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  selectedFeatureText: {
    color: colors.white,
    opacity: 0.9,
  },
  subscribeContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  subscribeButton: {
    marginTop: spacing.lg,
  },
});

export default PricingScreen;
