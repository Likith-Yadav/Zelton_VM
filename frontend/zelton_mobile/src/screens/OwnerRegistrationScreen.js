import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import PhoneInputField from "../components/PhoneInputField";
import GradientButton from "../components/GradientButton";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import {
  validateEmail,
  validatePhone,
  validatePAN,
  validateAadhar,
  validatePincode,
} from "../utils/helpers";
import { ERROR_MESSAGES } from "../constants/constants";
import DataService from "../services/dataService";
import AuthService from "../services/authService";

const OwnerRegistrationScreen = ({ navigation, route }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",

    // Address Information
    address: "",
    city: "",
    state: "",
    pincode: "",

    // KYC Information
    pan_number: "",
    aadhar_number: "",

    // Payment Method Information
    payment_method: "",
    bank_name: "",
    ifsc_code: "",
    account_number: "",
    upi_id: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Get registration data from previous screens (OTP verification)
  const registrationData = route?.params?.registrationData;

  // Pre-fill form data if coming from OTP verification
  useEffect(() => {
    if (registrationData) {
      setFormData((prev) => ({
        ...prev,
        firstName: registrationData.firstName || "",
        lastName: registrationData.lastName || "",
        email: registrationData.email || "",
        phone: registrationData.mobile || "",
      }));
    }
  }, [registrationData]);

  // Track keyboard visibility to add extra bottom space so inputs are not hidden
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const steps = [
    { id: 1, title: "Personal Info", subtitle: "Basic information about you" },
    { id: 2, title: "Address", subtitle: "Your contact address" },
    { id: 3, title: "KYC Details", subtitle: "Aadhar required, PAN optional" },
    { id: 4, title: "Payment Method", subtitle: "Choose Bank Details or UPI" },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.firstName)
          newErrors.firstName = ERROR_MESSAGES.REQUIRED_FIELD;
        if (!formData.lastName)
          newErrors.lastName = ERROR_MESSAGES.REQUIRED_FIELD;
        if (!formData.email) {
          newErrors.email = ERROR_MESSAGES.REQUIRED_FIELD;
        } else if (!validateEmail(formData.email)) {
          newErrors.email = ERROR_MESSAGES.INVALID_EMAIL;
        }
        if (!formData.phone) {
          newErrors.phone = ERROR_MESSAGES.REQUIRED_FIELD;
        } else if (!validatePhone(formData.phone)) {
          newErrors.phone = ERROR_MESSAGES.INVALID_PHONE;
        }
        break;
      case 2:
        if (!formData.address)
          newErrors.address = ERROR_MESSAGES.REQUIRED_FIELD;
        if (!formData.city) newErrors.city = ERROR_MESSAGES.REQUIRED_FIELD;
        if (!formData.state) newErrors.state = ERROR_MESSAGES.REQUIRED_FIELD;
        if (!formData.pincode) {
          newErrors.pincode = ERROR_MESSAGES.REQUIRED_FIELD;
        } else if (!validatePincode(formData.pincode)) {
          newErrors.pincode = ERROR_MESSAGES.INVALID_PINCODE;
        }
        break;
      case 3:
        // Aadhar number is required, PAN is optional
        if (!formData.aadhar_number) {
          newErrors.aadhar_number = ERROR_MESSAGES.REQUIRED_FIELD;
        } else if (!validateAadhar(formData.aadhar_number)) {
          newErrors.aadhar_number = ERROR_MESSAGES.INVALID_AADHAR;
        }
        if (formData.pan_number && !validatePAN(formData.pan_number)) {
          newErrors.pan_number = ERROR_MESSAGES.INVALID_PAN;
        }
        break;
      case 4:
        // Payment method validation
        if (!formData.payment_method) {
          newErrors.payment_method = ERROR_MESSAGES.REQUIRED_FIELD;
        } else if (formData.payment_method === "bank") {
          // Bank details validation
          if (!formData.bank_name)
            newErrors.bank_name = ERROR_MESSAGES.REQUIRED_FIELD;
          if (!formData.ifsc_code)
            newErrors.ifsc_code = ERROR_MESSAGES.REQUIRED_FIELD;
          if (!formData.account_number)
            newErrors.account_number = ERROR_MESSAGES.REQUIRED_FIELD;
        } else if (formData.payment_method === "upi") {
          // UPI validation
          if (!formData.upi_id)
            newErrors.upi_id = ERROR_MESSAGES.REQUIRED_FIELD;
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Check if we have registration data from OTP verification
      if (registrationData) {
        // New flow: Register user first, then complete profile
        console.log(
          "Registering new user with OTP verified data:",
          registrationData
        );

        const registerResult = await AuthService.register(
          registrationData.email,
          registrationData.password,
          registrationData.firstName,
          registrationData.lastName,
          registrationData.mobile || "",
          "owner"
        );

        if (registerResult.success) {
          // User registered successfully, now complete profile
          const userId = registerResult.data.user.id;
          const completeResult = await AuthService.completeProfile(
            userId,
            formData
          );

          if (completeResult.success) {
            Alert.alert(
              "Registration Completed",
              "Your account has been created successfully! Please complete your subscription payment to access the dashboard.",
              [
                {
                  text: "Complete Payment",
                  onPress: () => navigation.navigate("Pricing"),
                },
              ]
            );
          } else {
            Alert.alert("Error", completeResult.error);
          }
        } else {
          Alert.alert("Registration Error", registerResult.error);
        }
      } else {
        // Old flow: User already registered, just complete profile
        const userData = await AuthService.getStoredUserData();
        if (!userData.success || !userData.data.user) {
          Alert.alert(
            "Error",
            "User data not found. Please try logging in again."
          );
          return;
        }

        const userId = userData.data.user.id;

        // Complete profile with additional information
        const result = await AuthService.completeProfile(userId, formData);
        if (result.success) {
          Alert.alert(
            "Profile Completed",
            "Your profile has been completed successfully! Please complete your subscription payment to access the dashboard.",
            [
              {
                text: "Complete Payment",
                onPress: () => navigation.navigate("Pricing"),
              },
            ]
          );
        } else {
          Alert.alert("Error", result.error);
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <InputField
              label="First Name"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChangeText={(value) => handleInputChange("firstName", value)}
              error={errors.firstName}
              leftIcon="person"
              required
            />
            <InputField
              label="Last Name"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChangeText={(value) => handleInputChange("lastName", value)}
              error={errors.lastName}
              leftIcon="person"
              required
            />
            <InputField
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon="mail"
              required
            />
            <PhoneInputField
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange("phone", value)}
              error={errors.phone}
              leftIcon="call"
              required
            />
          </>
        );
      case 2:
        return (
          <>
            <InputField
              label="Address"
              placeholder="Enter your address"
              value={formData.address}
              onChangeText={(value) => handleInputChange("address", value)}
              multiline
              numberOfLines={3}
              error={errors.address}
              leftIcon="location"
              required
            />
            <InputField
              label="City"
              placeholder="Enter your city"
              value={formData.city}
              onChangeText={(value) => handleInputChange("city", value)}
              error={errors.city}
              leftIcon="business"
              required
            />
            <InputField
              label="State"
              placeholder="Enter your state"
              value={formData.state}
              onChangeText={(value) => handleInputChange("state", value)}
              error={errors.state}
              leftIcon="map"
              required
            />
            <InputField
              label="Pincode"
              placeholder="Enter your pincode"
              value={formData.pincode}
              onChangeText={(value) => handleInputChange("pincode", value)}
              keyboardType="numeric"
              error={errors.pincode}
              leftIcon="mail"
              required
            />
          </>
        );
      case 3:
        return (
          <>
            <InputField
              label="Aadhar Number"
              placeholder="Enter 12-digit Aadhar number"
              value={formData.aadhar_number}
              onChangeText={(value) => {
                // Only allow digits and limit to 12 characters
                const numericValue = value
                  .replace(/[^0-9]/g, "")
                  .substring(0, 12);
                handleInputChange("aadhar_number", numericValue);
              }}
              keyboardType="numeric"
              maxLength={12}
              error={errors.aadhar_number}
              leftIcon="id-card"
              required
            />
            <Text style={styles.characterCount}>
              {formData.aadhar_number.length}/12 digits
            </Text>
            <InputField
              label="PAN Number (Optional)"
              placeholder="Enter your PAN number (e.g., ABCDE1234F)"
              value={formData.pan_number}
              onChangeText={(value) => {
                // Remove spaces and convert to uppercase
                const cleanedValue = value.replace(/\s/g, "").toUpperCase();
                handleInputChange("pan_number", cleanedValue);
              }}
              autoCapitalize="characters"
              maxLength={10}
              error={errors.pan_number}
              leftIcon="card"
            />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.sectionTitle}>Choose Payment Method</Text>

            {/* Payment Method Radio Buttons */}
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  formData.payment_method === "bank" &&
                    styles.radioOptionSelected,
                ]}
                onPress={() => handleInputChange("payment_method", "bank")}
              >
                <View style={styles.radioButton}>
                  {formData.payment_method === "bank" && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <View style={styles.radioContent}>
                  <Text
                    style={[
                      styles.radioLabel,
                      formData.payment_method === "bank" &&
                        styles.radioLabelSelected,
                    ]}
                  >
                    Bank Details
                  </Text>
                  <Text style={styles.radioDescription}>
                    Provide your bank account information
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.radioOption,
                  formData.payment_method === "upi" &&
                    styles.radioOptionSelected,
                ]}
                onPress={() => handleInputChange("payment_method", "upi")}
              >
                <View style={styles.radioButton}>
                  {formData.payment_method === "upi" && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <View style={styles.radioContent}>
                  <Text
                    style={[
                      styles.radioLabel,
                      formData.payment_method === "upi" &&
                        styles.radioLabelSelected,
                    ]}
                  >
                    UPI
                  </Text>
                  <Text style={styles.radioDescription}>
                    Provide your UPI ID
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {errors.payment_method && (
              <Text style={styles.errorText}>{errors.payment_method}</Text>
            )}

            {/* Bank Details Fields */}
            {formData.payment_method === "bank" && (
              <View style={styles.paymentFields}>
                <InputField
                  label="Bank Name"
                  placeholder="Enter bank name"
                  value={formData.bank_name}
                  onChangeText={(value) =>
                    handleInputChange("bank_name", value)
                  }
                  error={errors.bank_name}
                  leftIcon="business"
                  required
                />
                <InputField
                  label="IFSC Code"
                  placeholder="Enter IFSC code (e.g., SBIN0001234)"
                  value={formData.ifsc_code}
                  onChangeText={(value) => {
                    const cleanedValue = value.replace(/\s/g, "").toUpperCase();
                    handleInputChange("ifsc_code", cleanedValue);
                  }}
                  autoCapitalize="characters"
                  maxLength={11}
                  error={errors.ifsc_code}
                  leftIcon="card"
                  required
                />
                <InputField
                  label="Account Number"
                  placeholder="Enter account number"
                  value={formData.account_number}
                  onChangeText={(value) => {
                    const numericValue = value.replace(/[^0-9]/g, "");
                    handleInputChange("account_number", numericValue);
                  }}
                  keyboardType="numeric"
                  error={errors.account_number}
                  leftIcon="wallet"
                  required
                />
              </View>
            )}

            {/* UPI Field */}
            {formData.payment_method === "upi" && (
              <View style={styles.paymentFields}>
                <InputField
                  label="UPI ID"
                  placeholder="Enter UPI ID (e.g., user@paytm)"
                  value={formData.upi_id}
                  onChangeText={(value) => handleInputChange("upi_id", value)}
                  error={errors.upi_id}
                  leftIcon="phone-portrait"
                  required
                />
              </View>
            )}
          </>
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Property Owner Registration</Text>
          <Text style={styles.subtitle}>
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  currentStep >= step.id && styles.progressDotActive,
                ]}
              >
                <Text
                  style={[
                    styles.progressDotText,
                    currentStep >= step.id && styles.progressDotTextActive,
                  ]}
                >
                  {step.id}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    currentStep > step.id && styles.progressLineActive,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Form Content */}
        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={[
            styles.formContent,
            keyboardVisible ? { paddingBottom: spacing.xxl * 2 } : null,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
          {/* Navigation Buttons inside scrollable area */}
          <View style={[styles.navigationContainer, keyboardVisible ? { paddingBottom: spacing.xl } : null]}>
            <View style={styles.buttonRow}>
              {currentStep > 1 && (
                <GradientButton
                  title="Previous"
                  onPress={handlePrevious}
                  variant="secondary"
                  style={[styles.navButton, styles.previousButton]}
                />
              )}
              <GradientButton
                title={currentStep === 4 ? "Register" : "Next"}
                onPress={handleNext}
                loading={loading}
                style={[
                  styles.navButton,
                  currentStep === 1 && styles.nextButtonFull,
                ]}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
  },
  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  progressStep: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  progressDotText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  progressDotTextActive: {
    color: colors.white,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  navigationContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
    minHeight: 48,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previousButton: {
    marginRight: spacing.sm,
  },
  nextButtonFull: {
    marginHorizontal: 0,
  },
  characterCount: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: "right",
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: "600",
  },
  radioGroup: {
    marginBottom: spacing.lg,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  radioOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  radioLabelSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  radioDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  paymentFields: {
    marginTop: spacing.lg,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
});

export default OwnerRegistrationScreen;
