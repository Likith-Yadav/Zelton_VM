import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
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
import AuthService from "../services/authService";

const { width } = Dimensions.get("window");

const RoleSelectionScreen = ({ navigation, route }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const scaleAnim = new Animated.Value(1);

  // Get registration data from previous screen
  const registrationData = route?.params?.registrationData || null;

  const roles = [
    {
      id: "owner",
      title: "Property Owner",
      subtitle: "Manage your properties and tenants",
      icon: "business",
      gradient: gradients.primary,
      features: [
        "Add and manage properties",
        "Create rental units",
        "Generate tenant keys",
        "Track payments and analytics",
        "Manage subscriptions",
      ],
    },
    {
      id: "tenant",
      title: "Tenant",
      subtitle: "Pay rent and manage your rental",
      icon: "home",
      gradient: gradients.accent,
      features: [
        "Join properties with keys",
        "Make secure payments",
        "View payment history",
        "Access property details",
        "Contact landlord",
      ],
    },
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);

    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleContinue = async () => {
    if (!selectedRole) return;

    // Navigate to appropriate registration screen with verified registration data
    if (selectedRole === "owner") {
      navigation.navigate("OwnerRegistration", {
        registrationData: registrationData,
      });
    } else {
      // For tenants, go to TenantKeyJoin first to join a property
      navigation.navigate("TenantKeyJoin", {
        registrationData: registrationData,
      });
    }
  };

  const handleBack = () => {
    navigation.goBack();
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
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Choose Your Role</Text>
        <Text style={styles.subtitle}>
          Select how you'll be using ZeltonLivings
        </Text>
      </View>

      {/* Role Cards */}
      <View style={styles.rolesContainer}>
        {roles.map((role) => (
          <Animated.View
            key={role.id}
            style={[
              styles.roleCardContainer,
              {
                transform: [
                  { scale: selectedRole === role.id ? scaleAnim : 1 },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === role.id && styles.selectedRoleCard,
              ]}
              onPress={() => handleRoleSelect(role.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={role.gradient}
                style={styles.roleGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.roleHeader}>
                  <View style={styles.roleIconContainer}>
                    <Ionicons name={role.icon} size={32} color={colors.white} />
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.featuresContainer}>
                  {role.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={colors.white}
                        style={styles.featureIcon}
                      />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      {/* Continue Button */}
      <View style={styles.bottomSection}>
        <GradientButton
          title="Continue"
          onPress={handleContinue}
          disabled={!selectedRole}
          style={styles.continueButton}
        />
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
    paddingBottom: spacing.xl,
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
  rolesContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  roleCardContainer: {
    marginBottom: spacing.lg,
  },
  roleCard: {
    borderRadius: 16,
    overflow: "hidden",
    ...shadows.lg,
  },
  selectedRoleCard: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  roleGradient: {
    padding: spacing.lg,
  },
  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    ...typography.h4,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  roleSubtitle: {
    ...typography.body2,
    color: colors.white,
    opacity: 0.9,
  },
  featuresContainer: {
    marginTop: spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  featureIcon: {
    marginRight: spacing.sm,
  },
  featureText: {
    ...typography.body2,
    color: colors.white,
    flex: 1,
    opacity: 0.9,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  continueButton: {
    marginTop: spacing.lg,
  },
});

export default RoleSelectionScreen;
