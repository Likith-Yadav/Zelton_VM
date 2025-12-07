import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../components/GradientButton';
import { colors, typography, spacing, gradients } from '../theme/theme';
import AuthService from '../services/authService';
import DataService from '../services/dataService';

const { width, height } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkAuthAndRedirect();
    
    // Animate on mount (only if not redirecting)
    if (!isCheckingAuth) {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
    }
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      console.log("🔐 LandingScreen: Checking authentication status...");
      
      // Check if user has stored credentials
      const isLoggedIn = await AuthService.isLoggedIn();
      
      if (isLoggedIn) {
        console.log("✅ User is logged in, verifying token...");
        
        // Verify token is valid with backend
        const tokenResult = await AuthService.verifyToken();
        
        if (tokenResult.success) {
          console.log("✅ Token verified, redirecting to dashboard...");
          
          // Get user data to determine role
          const userData = await AuthService.getStoredUserData();
          
          if (userData.success) {
            const role = userData.role || userData.data?.role;
            
            // Check if owner has active subscription
            if (role === "owner" && userData.data.profile) {
              if (userData.data.profile.subscription_status !== "active") {
                navigation.replace("Pricing");
                return;
              }
              navigation.replace("OwnerDashboard");
              return;
            }
            
            // For tenants, check if property is assigned
            if (role === "tenant") {
              try {
                const dashboardResult = await DataService.getTenantDashboard();
                if (!dashboardResult.success && dashboardResult.error === "No property assigned") {
                  navigation.replace("TenantKeyJoin");
                  return;
                }
                navigation.replace("TenantDashboard");
                return;
              } catch (error) {
                console.error("Error checking tenant dashboard:", error);
                // If there's an error, still try to navigate to dashboard
                navigation.replace("TenantDashboard");
                return;
              }
            }
            
            // Default navigation based on role
            if (role === "owner") {
              navigation.replace("OwnerDashboard");
            } else if (role === "tenant") {
              navigation.replace("TenantDashboard");
            }
          }
        } else {
          console.log("⚠️ Token invalid, clearing and showing landing screen");
          await AuthService.clearUserData();
        }
      } else {
        console.log("ℹ️ No existing session found");
      }
    } catch (error) {
      console.error("Error checking authentication:", error);
    } finally {
      setIsCheckingAuth(false);
      // Start animation after auth check
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const handleGetStarted = () => {
    navigation.navigate('Auth');
  };

  // Show loading indicator while checking auth
  if (isCheckingAuth) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
        <LinearGradient
          colors={gradients.primary}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <LinearGradient
        colors={gradients.primary}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="home" size={40} color={colors.white} />
            <Text style={styles.logoText}>ZeltonLivings</Text>
          </View>
        </View>

        {/* Main Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              Smart Property{'\n'}Management{'\n'}Made Simple
            </Text>
            <Text style={styles.heroSubtitle}>
              Connect landlords and tenants through our comprehensive rental platform
            </Text>
          </View>

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark" size={24} color={colors.white} />
              </View>
              <Text style={styles.featureText}>Secure Payments</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="analytics" size={24} color={colors.white} />
              </View>
              <Text style={styles.featureText}>Real-time Analytics</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="phone-portrait" size={24} color={colors.white} />
              </View>
              <Text style={styles.featureText}>Mobile First</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bottom Section */}
        <Animated.View
          style={[
            styles.bottomSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <GradientButton
            title="Get Started"
            onPress={handleGetStarted}
            variant="secondary"
            size="large"
            style={styles.getStartedButton}
          />
          
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.linkText} onPress={handleGetStarted}>
              Sign In
            </Text>
          </Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    ...typography.h3,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  heroSection: {
    marginBottom: spacing.xxl,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 40,
  },
  heroSubtitle: {
    ...typography.body1,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xxl,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  featureText: {
    ...typography.caption,
    color: colors.white,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  getStartedButton: {
    marginBottom: spacing.lg,
  },
  footerText: {
    ...typography.body2,
    color: colors.white,
    textAlign: 'center',
    opacity: 0.8,
  },
  linkText: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body1,
    color: colors.white,
    marginTop: spacing.md,
    opacity: 0.9,
  },
});

export default LandingScreen;
