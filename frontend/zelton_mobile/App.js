import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider } from "react-native-paper";
import Toast from "react-native-toast-message";
import { Linking, Alert, View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { paymentAPI } from "./src/services/api";
import AuthService from "./src/services/authService";

// Import screens
import LandingScreen from "./src/screens/LandingScreen";
import AuthScreen from "./src/screens/AuthScreen";
import RoleSelectionScreen from "./src/screens/RoleSelectionScreen";
import OwnerRegistrationScreen from "./src/screens/OwnerRegistrationScreen";
import TenantRegistrationScreen from "./src/screens/TenantRegistrationScreen";
import OwnerDashboardScreen from "./src/screens/OwnerDashboardScreen";
import TenantDashboardScreen from "./src/screens/TenantDashboardScreen";
import PropertyManagementScreen from "./src/screens/PropertyManagementScreen";
import UnitManagementScreen from "./src/screens/UnitManagementScreen";
import TenantKeyJoinScreen from "./src/screens/TenantKeyJoinScreen";
import PaymentScreen from "./src/screens/PaymentScreen";
import TenantPaymentScreen from "./src/screens/TenantPaymentScreen";
import PaymentTransactionsScreen from "./src/screens/PaymentTransactionsScreen";
import TenantSignupScreen from "./src/screens/TenantSignupScreen";
import PricingScreen from "./src/screens/PricingScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import ContactMaintenanceScreen from "./src/screens/ContactMaintenanceScreen";
import TenantDocumentsScreen from "./src/screens/TenantDocumentsScreen";
import OwnerTenantDocumentsScreen from "./src/screens/OwnerTenantDocumentsScreen";
import OTPVerificationScreen from "./src/screens/OTPVerificationScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import PaymentProofUploadScreen from "./src/screens/PaymentProofUploadScreen";
import PaymentProofVerificationScreen from "./src/screens/PaymentProofVerificationScreen";

// Import theme
import { theme } from "./src/theme/theme";

const Stack = createStackNavigator();

export default function App() {
  const [isTokenReady, setIsTokenReady] = useState(false);

  useEffect(() => {
    // Initialize token verification on app startup
    initializeApp();
    
    // Handle deep links when app is already running
    const handleDeepLink = (url) => {
      console.log("Deep link received:", url);
      if (url.includes("ZeltonLivings://payment/callback")) {
        handlePaymentCallback(url);
      }
    };

    // Handle deep links when app is opened from a closed state
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    // Add event listener for deep links
    const linkingListener = Linking.addEventListener("url", handleDeepLink);

    // Check for initial URL
    handleInitialURL();

    return () => {
      linkingListener?.remove();
    };
  }, []);

  // Initialize app and verify/refresh token on startup
  const initializeApp = async () => {
    try {
      console.log("Initializing app - verifying token...");
      const isLoggedIn = await AuthService.isLoggedIn();
      
      if (isLoggedIn) {
        // Verify token is valid with backend (with retry logic for network errors)
        const tokenResult = await AuthService.ensureTokenReady(3);
        if (tokenResult.success) {
          console.log("✅ Token verified successfully on app startup");
        } else {
          console.log("⚠️ Token invalid or expired, clearing storage");
          // Only clear if it's not a network error
          if (!tokenResult.isNetworkError) {
            await AuthService.clearUserData();
          }
        }
      } else {
        console.log("ℹ️ No existing session found");
      }
    } catch (error) {
      console.error("Error initializing app:", error);
      // Don't clear user data on initialization error - might be network issue
    } finally {
      setIsTokenReady(true);
    }
  };

  const handlePaymentCallback = async (url) => {
    try {
      console.log("Processing payment callback:", url);
      
      // Extract orderId and status from URL parameters
      const urlObj = new URL(url);
      const orderId = urlObj.searchParams.get("orderId");
      const status = urlObj.searchParams.get("status");
      
      if (!orderId) {
        console.error("No orderId found in callback URL");
        return;
      }

      // Get stored payment data
      const storedPaymentData = await AsyncStorage.getItem("current_payment_data");
      const storedSubscriptionData = await AsyncStorage.getItem("current_subscription_payment");
      
      let paymentData = null;
      if (storedPaymentData) {
        paymentData = JSON.parse(storedPaymentData);
      } else if (storedSubscriptionData) {
        paymentData = JSON.parse(storedSubscriptionData);
      }

      if (!paymentData) {
        console.error("No stored payment data found");
        Alert.alert("Error", "Payment data not found. Please try again.");
        return;
      }

      // Call backend to handle the callback
      const response = await paymentAPI.handlePaymentCallback(orderId, status);
      
      if (response.data.success) {
        // Clear stored payment data
        await AsyncStorage.removeItem("current_payment_data");
        await AsyncStorage.removeItem("current_subscription_payment");
        
        // Show success message
        Alert.alert(
          "Payment Successful!",
          "Your payment has been processed successfully.",
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate to appropriate dashboard based on payment type
                // This will be handled by the navigation system
              }
            }
          ]
        );
      } else {
        Alert.alert(
          "Payment Failed",
          response.data.message || "Payment could not be processed."
        );
      }
    } catch (error) {
      console.error("Error handling payment callback:", error);
      Alert.alert(
        "Error",
        "Failed to process payment callback. Please check your payment status."
      );
    }
  };

  // Show loading screen while token is being verified
  if (!isTokenReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="Landing"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              };
            },
          }}
        >
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen
            name="OTPVerification"
            component={OTPVerificationScreen}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
          />
          <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
          <Stack.Screen
            name="OwnerRegistration"
            component={OwnerRegistrationScreen}
          />
          <Stack.Screen
            name="TenantRegistration"
            component={TenantRegistrationScreen}
          />
          <Stack.Screen
            name="OwnerDashboard"
            component={OwnerDashboardScreen}
          />
          <Stack.Screen
            name="TenantDashboard"
            component={TenantDashboardScreen}
          />
          <Stack.Screen
            name="PropertyManagement"
            component={PropertyManagementScreen}
          />
          <Stack.Screen
            name="UnitManagement"
            component={UnitManagementScreen}
          />
          <Stack.Screen name="TenantKeyJoin" component={TenantKeyJoinScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="TenantPayment" component={TenantPaymentScreen} />
          <Stack.Screen name="PaymentProofUpload" component={PaymentProofUploadScreen} />
          <Stack.Screen name="PaymentProofVerification" component={PaymentProofVerificationScreen} />
          <Stack.Screen
            name="PaymentTransactions"
            component={PaymentTransactionsScreen}
          />
          <Stack.Screen name="TenantSignup" component={TenantSignupScreen} />
          <Stack.Screen name="Pricing" component={PricingScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          <Stack.Screen
            name="ContactMaintenance"
            component={ContactMaintenanceScreen}
          />
          <Stack.Screen
            name="TenantDocuments"
            component={TenantDocumentsScreen}
          />
          <Stack.Screen
            name="OwnerTenantDocuments"
            component={OwnerTenantDocumentsScreen}
          />
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>
    </PaperProvider>
  );
}
