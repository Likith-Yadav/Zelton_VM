import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  Linking,
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

const MOCK_PRICING_PLANS = [
  {
    id: "mock-plan-1",
    name: "1-10 Houses",
    min_units: 1,
    max_units: 10,
    monthly_price: 2500,
    yearly_price: 27500,
    features: [
      "Up to 10 houses",
      "Perfect for small property owners",
      "Basic property management",
      "Tenant management",
      "Payment tracking",
      "Email support",
    ],
  },
  {
    id: "mock-plan-2",
    name: "11-20 Houses",
    min_units: 11,
    max_units: 20,
    monthly_price: 5000,
    yearly_price: 55000,
    features: [
      "Up to 20 houses",
      "For growing property businesses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-3",
    name: "21-30 Houses",
    min_units: 21,
    max_units: 30,
    monthly_price: 7500,
    yearly_price: 82500,
    features: [
      "Up to 30 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-4",
    name: "31-40 Houses",
    min_units: 31,
    max_units: 40,
    monthly_price: 10000,
    yearly_price: 110000,
    features: [
      "Up to 40 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-5",
    name: "41-50 Houses",
    min_units: 41,
    max_units: 50,
    monthly_price: 12500,
    yearly_price: 137500,
    features: [
      "Up to 50 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-6",
    name: "51-60 Houses",
    min_units: 51,
    max_units: 60,
    monthly_price: 15000,
    yearly_price: 165000,
    features: [
      "Up to 60 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-7",
    name: "61-70 Houses",
    min_units: 61,
    max_units: 70,
    monthly_price: 17500,
    yearly_price: 192500,
    features: [
      "Up to 70 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-8",
    name: "71-80 Houses",
    min_units: 71,
    max_units: 80,
    monthly_price: 20000,
    yearly_price: 220000,
    features: [
      "Up to 80 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-9",
    name: "81-90 Houses",
    min_units: 81,
    max_units: 90,
    monthly_price: 22500,
    yearly_price: 247500,
    features: [
      "Up to 90 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-10",
    name: "91-100 Houses",
    min_units: 91,
    max_units: 100,
    monthly_price: 25000,
    yearly_price: 275000,
    features: [
      "Up to 100 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-11",
    name: "101-110 Houses",
    min_units: 101,
    max_units: 110,
    monthly_price: 27500,
    yearly_price: 302500,
    features: [
      "Up to 110 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-12",
    name: "111-120 Houses",
    min_units: 111,
    max_units: 120,
    monthly_price: 30000,
    yearly_price: 330000,
    features: [
      "Up to 120 houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "Priority support",
    ],
  },
  {
    id: "mock-plan-13",
    name: "121+ Houses",
    min_units: 121,
    max_units: 999999,
    monthly_price: 32500,
    yearly_price: 357500,
    features: [
      "Unlimited houses",
      "Advanced property management",
      "Tenant management",
      "Payment tracking",
      "Analytics dashboard",
      "Automated reports",
      "API access",
      "Custom integrations",
      "Dedicated account manager",
      "White-label options",
      "Priority support",
    ],
  },
];

const PricingScreen = ({ navigation, route }) => {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly"); // 'monthly' or 'yearly'
  const [propertyCount, setPropertyCount] = useState("1-10");
  const [pricingPlans, setPricingPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scrollY] = useState(new Animated.Value(0));
  const [userData, setUserData] = useState(null);
  const scrollViewRef = useRef(null);
  const planPositions = useRef({});

  // Convert property count range to numeric value for comparison
  const getPropertyCountValue = (count) => {
    switch (count) {
      case "1-10":
        return 5;
      case "11-20":
        return 15;
      case "21-30":
        return 25;
      case "31-40":
        return 35;
      case "41-50":
        return 45;
      case "51-60":
        return 55;
      case "61-70":
        return 65;
      case "71-80":
        return 75;
      case "81-90":
        return 85;
      case "91-100":
        return 95;
      case "101-110":
        return 105;
      case "111-120":
        return 115;
      case "121+":
        return 130; // Use a high value for 121+
      default:
        return 5;
    }
  };

  useEffect(() => {
    console.log("PricingScreen mounted, loading pricing plans...");
    loadPricingPlans();
    loadUserData();
  }, []);

  // Scroll to recommended plan when propertyCount changes
  useEffect(() => {
    if (pricingPlans.length > 0) {
      const recommendedPlan = getRecommendedPlan();
      if (recommendedPlan && planPositions.current[recommendedPlan.id] !== undefined) {
        // Scroll to the recommended plan after a short delay to ensure rendering
        setTimeout(() => {
          const yPosition = planPositions.current[recommendedPlan.id];
          if (yPosition !== undefined && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: Math.max(0, yPosition - 100), // Offset by 100px for better visibility
              animated: true,
            });
          }
        }, 300);
      }
    }
  }, [propertyCount, pricingPlans]);

  useEffect(() => {
    if (route.params?.isUpgrade) {
      // Pre-select the suggested plan
      if (route.params.suggestedPlan) {
        setSelectedPlan(route.params.suggestedPlan.id);
      }
    }
  }, [route.params]);

  const loadUserData = async () => {
    try {
      const userDataResponse = await AuthService.getStoredUserData();
      if (userDataResponse.success) {
        setUserData(userDataResponse.data);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

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
            numericCount >= (plan.min_units || plan.min_properties || 0) &&
            numericCount <= (plan.max_units || plan.max_properties || 999999)
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
            numericCount >= (plan.min_units || plan.min_properties || 0) &&
            numericCount <= (plan.max_units || plan.max_properties || 999999)
        );
        if (recommendedPlan) {
          console.log("Auto-selecting plan:", recommendedPlan);
          setSelectedPlan(recommendedPlan.id);
        }
      } else {
        console.error("Invalid pricing plans data:", data);
        // Use mock data instead of showing error
        setPricingPlans(MOCK_PRICING_PLANS);
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
        numericCount >= (plan.min_units || plan.min_properties || 0) &&
        numericCount <= (plan.max_units || plan.max_properties || 999999)
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
    const plan = pricingPlans.find((p) => p.id === planId);
    
    // Check for downgrade prevention
    if (userData && userData.data && userData.data.profile && userData.data.profile.subscription_plan) {
      const currentPlan = userData.data.profile.subscription_plan;
      
      // If the selected plan has fewer max units than current plan, it's a downgrade
      if (plan.max_units < currentPlan.max_units) {
        Alert.alert(
          "Downgrade Not Allowed",
          `You cannot downgrade from ${currentPlan.name} (${currentPlan.max_units} units) to ${plan.name} (${plan.max_units} units). Please contact our sales team at sales@zelton.in for assistance.`,
          [
            {
              text: "Contact Sales",
              onPress: () => {
                // Open email client
                const emailUrl = `mailto:sales@zelton.in?subject=Plan Downgrade Request&body=Hello,%0D%0A%0D%0AI would like to request a downgrade from ${currentPlan.name} to ${plan.name}.%0D%0A%0D%0APlease provide assistance.%0D%0A%0D%0AThank you.`;
                Linking.openURL(emailUrl).catch(err => {
                  console.error('Error opening email client:', err);
                  Alert.alert('Error', 'Could not open email client. Please contact sales@zelton.in directly.');
                });
              }
            },
            { text: "Cancel", style: "cancel" }
          ]
        );
        return;
      }
    }
    
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
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          planPositions.current[plan.id] = y;
        }}
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
              {(plan.min_units || plan.min_properties || 0)}-
              {(plan.max_units || plan.max_properties || 0) === 999999 ? "∞" : (plan.max_units || plan.max_properties || 0)}{" "}
              houses
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
        ref={scrollViewRef}
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
          {[
            "1-10",
            "11-20",
            "21-30",
            "31-40",
            "41-50",
            "51-60",
            "61-70",
            "71-80",
            "81-90",
            "91-100",
            "101-110",
            "111-120",
            "121+",
          ].map(
            (count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.propertyCountButton,
                  propertyCount === count && styles.selectedPropertyCountButton,
                ]}
                onPress={() => {
                  setPropertyCount(count);
                  // Auto-select and scroll to the recommended plan
                  setTimeout(() => {
                    const recommendedPlan = getRecommendedPlan();
                    if (recommendedPlan) {
                      setSelectedPlan(recommendedPlan.id);
                    }
                  }, 100);
                }}
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
          Price increases by ₹2,500 for every 10 houses
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
