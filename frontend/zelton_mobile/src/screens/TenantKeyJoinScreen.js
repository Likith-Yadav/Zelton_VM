import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import GradientButton from "../components/GradientButton";
import GradientCard from "../components/GradientCard";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatOrdinal } from "../utils/helpers";
import DataService from "../services/dataService";
import AuthService from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/constants";

const TenantKeyJoinScreen = ({ navigation, route }) => {
  const [tenantKey, setTenantKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState(null);
  const [inputError, setInputError] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scaleAnim = new Animated.Value(1);

  // Get registration data from previous screens (OTP verification)
  const registrationData = route?.params?.registrationData;

  // Debug tenantKey state changes
  useEffect(() => {
    console.log("TenantKey state changed:", tenantKey);
    console.log("TenantKey type:", typeof tenantKey);
    console.log(
      "TenantKey length:",
      tenantKey ? tenantKey.length : "null/undefined"
    );
  }, [tenantKey]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleKeyChange = (value) => {
    console.log("=== handleKeyChange called ===");
    console.log("Raw input value:", value);
    console.log("Value type:", typeof value);
    console.log("Value length:", value ? value.length : "null/undefined");

    // Convert to uppercase and limit to 8 characters
    const formattedValue = value.toUpperCase().substring(0, 8);
    console.log("handleKeyChange - input value:", value);
    console.log("handleKeyChange - formatted value:", formattedValue);
    console.log("About to set tenantKey state to:", formattedValue);

    setTenantKey(formattedValue);

    // Clear any previous input errors
    if (inputError) {
      setInputError("");
    }

    console.log("State set, current tenantKey should be:", formattedValue);
  };

  const handleJoinProperty = async () => {
    // Input validation
    if (!tenantKey.trim()) {
      Alert.alert("Missing Key", "Please enter your tenant key to continue.");
      return;
    }

    if (tenantKey.length !== 8) {
      Alert.alert(
        "Invalid Key Format",
        "Please enter a valid 8-character tenant key."
      );
      return;
    }

    setLoading(true);

    try {
      const keyToSend = tenantKey.trim().toUpperCase();
      console.log("Attempting to join property with key:", keyToSend);

      // If we have registration data from OTP verification, register the user first
      if (registrationData) {
        console.log(
          "Registering user with OTP verified data:",
          registrationData
        );

        const registerResult = await AuthService.register(
          registrationData.email,
          registrationData.password,
          registrationData.firstName,
          registrationData.lastName,
          registrationData.mobile || "",
          "tenant"
        );

        if (!registerResult.success) {
          Alert.alert("Registration Error", registerResult.error);
          setLoading(false);
          return;
        }

        console.log("User registered successfully, now joining property");
      }

      // Join the property (this will use the authenticated user)
      const result = await DataService.joinProperty(keyToSend);

      if (result.success) {
        console.log("Property joined successfully:", result.data);
        console.log(
          "Property data structure:",
          JSON.stringify(result.data, null, 2)
        );
        console.log("Property object:", result.data?.property);
        console.log("Unit object:", result.data?.unit);

        // Store the authentication token
        if (result.token) {
          await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, result.token);
          console.log("Authentication token stored");
        }

        // Store the property data and user info
        await storePropertyData(result.data);
        await storeUserData(result.data);

        setPropertyInfo(result.data);
        setSuccess(true);

        // Animate success
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Handle specific error cases
        handleJoinError(result.error);
      }
    } catch (error) {
      console.error("Join property error:", error);
      handleJoinError(
        error.message ||
          "Network error. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinError = (error) => {
    console.error("Join property failed:", error);

    // Provide specific error messages based on the error type
    if (error.includes("Invalid") || error.includes("not found")) {
      Alert.alert(
        "Invalid Tenant Key",
        "The tenant key you entered is not valid. Please check with your landlord and try again.",
        [
          { text: "Try Again", style: "default" },
          {
            text: "Contact Support",
            style: "default",
            onPress: () => {
              /* Handle contact support */
            },
          },
        ]
      );
    } else if (error.includes("expired")) {
      Alert.alert(
        "Key Expired",
        "This tenant key has expired. Please request a new key from your landlord.",
        [{ text: "OK", style: "default" }]
      );
    } else if (error.includes("already assigned")) {
      Alert.alert(
        "Already Assigned",
        "You are already assigned to a property. Please contact support if this is an error.",
        [{ text: "OK", style: "default" }]
      );
    } else if (error.includes("Network") || error.includes("connection")) {
      Alert.alert(
        "Connection Error",
        "Please check your internet connection and try again.",
        [
          { text: "Retry", style: "default", onPress: handleJoinProperty },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      Alert.alert(
        "Join Failed",
        "Unable to join property. Please try again or contact support.",
        [
          { text: "Try Again", style: "default" },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const storeUserData = async (propertyData) => {
    try {
      // Store user role as tenant
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, "tenant");

      // Store basic user info from the property data
      const userData = {
        role: "tenant",
        property: propertyData.property,
        unit: propertyData.unit,
        joined_at: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(userData)
      );
      console.log("User data stored successfully");
    } catch (error) {
      console.error("Error storing user data:", error);
    }
  };

  const handleContinue = () => {
    // Navigate to tenant dashboard after successful property joining
    navigation.reset({
      index: 0,
      routes: [{ name: "TenantDashboard" }],
    });
  };

  const storePropertyData = async (propertyData) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.PROPERTY_DATA,
        JSON.stringify(propertyData)
      );
      console.log("Property data stored successfully");
    } catch (error) {
      console.error("Error storing property data:", error);
    }
  };

  const handleTryAgain = () => {
    setSuccess(false);
    setPropertyInfo(null);
    setTenantKey("");
  };

  if (success && propertyInfo && propertyInfo.property && propertyInfo.unit) {
    return (
      <LinearGradient
        colors={gradients.background}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.successContainer}>
          <Animated.View
            style={[styles.successIcon, { transform: [{ scale: scaleAnim }] }]}
          >
            <Ionicons
              name="checkmark-circle"
              size={80}
              color={colors.success}
            />
          </Animated.View>

          <Text style={styles.successTitle}>Successfully Joined!</Text>
          <Text style={styles.successSubtitle}>
            You have successfully joined the property
          </Text>

          <GradientCard variant="success" style={styles.propertyCard}>
            <View style={styles.propertyHeader}>
              <Ionicons name="home" size={24} color={colors.white} />
              <Text style={styles.propertyTitle}>Property Details</Text>
            </View>

            <View style={styles.propertyDetails}>
              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Property Name</Text>
                <Text style={styles.propertyValue}>
                  {propertyInfo?.property?.name || "N/A"}
                </Text>
              </View>

              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Address</Text>
                <Text style={styles.propertyValue}>
                  {propertyInfo?.property?.address || "N/A"}
                </Text>
              </View>

              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Unit Number</Text>
                <Text style={styles.propertyValue}>
                  {propertyInfo?.unit?.unit_number || "N/A"}
                </Text>
              </View>

              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Unit Type</Text>
                <Text style={styles.propertyValue}>
                  {propertyInfo?.unit?.unit_type || "N/A"}
                </Text>
              </View>

              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Monthly Rent</Text>
                <Text style={styles.propertyValue}>
                  ₹{propertyInfo?.unit?.rent_amount?.toLocaleString() || "N/A"}
                </Text>
              </View>

              <View style={styles.propertyItem}>
                <Text style={styles.propertyLabel}>Rent Due Date</Text>
                <Text style={styles.propertyValue}>
                  Every{" "}
                  {formatOrdinal(propertyInfo?.unit?.rent_due_date) || "N/A"}
                </Text>
              </View>
            </View>
          </GradientCard>

          <View style={styles.buttonContainer}>
            <GradientButton
              title="Continue to Dashboard"
              onPress={handleContinue}
              style={styles.continueButton}
            />
          </View>
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
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Join Property</Text>
          <Text style={styles.subtitle}>
            Enter the tenant key provided by your landlord
          </Text>
        </View>

        {/* Instructions */}
        <GradientCard variant="primary" style={styles.instructionsCard}>
          <View style={styles.instructionsHeader}>
            <Ionicons
              name="information-circle"
              size={24}
              color={colors.white}
            />
            <Text style={styles.instructionsTitle}>
              How to get a tenant key?
            </Text>
          </View>
          <Text style={styles.instructionsText}>
            1. Contact your landlord{"\n"}
            2. Ask them to generate a tenant key from their ZeltonLivings app
            {"\n"}
            3. Enter the 8-character key below
          </Text>
        </GradientCard>

        {/* Key Input */}
        <View style={[styles.keyInputContainer, keyboardVisible ? { marginBottom: spacing.xxl } : null]}>
          <InputField
            label="Tenant Key"
            placeholder="Enter 8-character tenant key"
            value={tenantKey}
            onChangeText={handleKeyChange}
            autoCapitalize="characters"
            maxLength={8}
            leftIcon="key"
            style={styles.keyInput}
          />

          <Text style={styles.keyHint}>
            The key should be 8 characters long (letters and numbers)
          </Text>

          {inputError ? (
            <Text style={styles.errorText}>{inputError}</Text>
          ) : null}
        </View>

        {/* Join Button */}
        <GradientButton
          title={loading ? "Joining Property..." : "Join Property"}
          onPress={handleJoinProperty}
          loading={loading}
          disabled={!tenantKey.trim() || tenantKey.length !== 8 || loading}
          style={styles.joinButton}
        />

        {/* Loading indicator with message */}
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              Verifying your tenant key and setting up your account...
            </Text>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If you don't have a tenant key, please contact your landlord or
            property manager.
          </Text>

          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="call" size={20} color={colors.primary} />
            <Text style={styles.contactButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingTop: 60,
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
    lineHeight: 20,
  },
  keyInputContainer: {
    marginBottom: spacing.xl,
  },
  keyInput: {
    marginBottom: spacing.sm,
  },
  keyHint: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: "center",
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  joinButton: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },
  helpContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  helpTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helpText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + "20",
    borderRadius: 20,
  },
  contactButtonText: {
    ...typography.body2,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: "500",
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successIcon: {
    marginBottom: spacing.xl,
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  successSubtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  propertyCard: {
    width: "100%",
    marginBottom: spacing.xl,
  },
  propertyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  propertyTitle: {
    ...typography.h5,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  propertyDetails: {
    gap: spacing.md,
  },
  propertyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  propertyLabel: {
    ...typography.body2,
    color: colors.white,
    opacity: 0.8,
    flex: 1,
  },
  propertyValue: {
    ...typography.body1,
    color: colors.white,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  buttonContainer: {
    width: "100%",
  },
  continueButton: {
    marginBottom: spacing.md,
  },
  tryAgainButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  tryAgainText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "500",
  },
});

export default TenantKeyJoinScreen;
