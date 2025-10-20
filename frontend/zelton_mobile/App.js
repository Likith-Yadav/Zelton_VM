import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider } from "react-native-paper";
import Toast from "react-native-toast-message";

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

// Import theme
import { theme } from "./src/theme/theme";

const Stack = createStackNavigator();

export default function App() {
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
