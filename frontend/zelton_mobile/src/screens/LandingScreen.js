import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../components/GradientButton';
import { colors, typography, spacing, gradients } from '../theme/theme';

const { width, height } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    // Animate on mount
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
  }, []);

  const handleGetStarted = () => {
    navigation.navigate('Auth');
  };

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
});

export default LandingScreen;
