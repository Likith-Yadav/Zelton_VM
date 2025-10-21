import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GradientButton from '../components/GradientButton';
import GradientCard from '../components/GradientCard';
import InputField from '../components/InputField';
import PhoneInputField from '../components/PhoneInputField';
import { colors, typography, spacing, gradients, shadows } from '../theme/theme';
import { formatCurrency } from '../utils/helpers';
import AuthService from '../services/authService';

const { width } = Dimensions.get('window');

const TenantSignupScreen = ({ navigation, route }) => {
  const { tenantKey } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    
    // Address Information
    address: '',
    city: '',
    state: '',
    pincode: '',
    
    // Emergency Contact removed
  });

  const handleInputChange = (field, value) => {
    console.log(`Input change - Field: ${field}, Value: ${value}`);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    console.log('Current formData:', formData);
    // Basic validation
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone || !formData.password) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    // Address validation
    if (!formData.address || !formData.city || !formData.state || !formData.pincode) {
      Alert.alert('Validation Error', 'Please fill in your address information');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return;
    }

    if (!tenantKey) {
      Alert.alert('Error', 'No tenant key provided');
      return;
    }

    try {
      setLoading(true);
      
      const signupData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        tenant_key: tenantKey,
        role: 'tenant',
        // Address Information
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        // Emergency Contact removed
      };

      const response = await AuthService.register(
        signupData.email,
        signupData.password,
        signupData.first_name,
        signupData.last_name,
        signupData.phone,
        signupData.role,
        signupData.tenant_key,
        {
          address: signupData.address,
          city: signupData.city,
          state: signupData.state,
          pincode: signupData.pincode,
        }
      );

      if (response.success) {
        Alert.alert(
          'Signup Successful!',
          'Your account has been created. You can now login and make payments.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Landing')
            }
          ]
        );
      } else {
        Alert.alert('Signup Failed', response.error || 'Please try again');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={gradients.background}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Tenant Signup</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        {/* Tenant Key Info */}
        <GradientCard variant="surface" style={styles.keyCard}>
          <View style={styles.keyHeader}>
            <Ionicons name="key" size={24} color={colors.primary} />
            <Text style={styles.keyTitle}>Tenant Key</Text>
          </View>
          <Text style={styles.keyValue}>{tenantKey || 'No key provided'}</Text>
          <Text style={styles.keyDescription}>
            Use this key to sign up as a tenant for the property
          </Text>
        </GradientCard>

        {/* Signup Form */}
        <GradientCard variant="surface" style={styles.formCard}>
          <Text style={styles.formTitle}>Create Your Account</Text>
          
          <InputField
            label="First Name"
            placeholder="Enter your first name"
            value={formData.first_name}
            onChangeText={(text) => handleInputChange('first_name', text)}
            leftIcon="person"
            required
          />

          <InputField
            label="Last Name"
            placeholder="Enter your last name"
            value={formData.last_name}
            onChangeText={(text) => handleInputChange('last_name', text)}
            leftIcon="person"
            required
          />

          <InputField
            label="Email"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon="mail"
            required
          />

          <PhoneInputField
            label="Phone"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChangeText={(text) => handleInputChange('phone', text)}
            leftIcon="call"
            required
          />

          <InputField
            label="Password"
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
            secureTextEntry
            leftIcon="lock-closed"
            required
          />

          <InputField
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChangeText={(text) => handleInputChange('confirmPassword', text)}
            secureTextEntry
            leftIcon="lock-closed"
            required
          />
        </GradientCard>

        {/* Address Information */}
        <View style={[styles.formCard, {backgroundColor: 'white', padding: 20, marginBottom: 20, borderRadius: 10}]}>
          <Text style={styles.formTitle}>Address Information</Text>
          
          <InputField
            label="Address"
            placeholder="Enter your address"
            value={formData.address}
            onChangeText={(text) => handleInputChange('address', text)}
            leftIcon="location"
            multiline
            numberOfLines={3}
            required
          />

          <InputField
            label="City"
            placeholder="Enter your city"
            value={formData.city}
            onChangeText={(text) => handleInputChange('city', text)}
            leftIcon="location"
            required
          />

          <InputField
            label="State"
            placeholder="Enter your state"
            value={formData.state}
            onChangeText={(text) => handleInputChange('state', text)}
            leftIcon="location"
            required
          />

          <InputField
            label="Pincode"
            placeholder="Enter your pincode"
            value={formData.pincode}
            onChangeText={(text) => handleInputChange('pincode', text)}
            keyboardType="numeric"
            maxLength={6}
            leftIcon="location"
            required
          />
        </View>

        {/* Emergency Contact removed */}

        {/* Signup Button */}
        <GradientButton
          title="Create Account"
          onPress={handleSignup}
          loading={loading}
          style={styles.signupButton}
        />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
    padding: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  keyCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  keyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  keyTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  keyValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    fontFamily: 'monospace',
  },
  keyDescription: {
    ...typography.body2,
    color: colors.textLight,
  },
  formCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  formTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  textInput: {
    ...typography.body1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  signupButton: {
    marginBottom: spacing.xl,
  },
});

export default TenantSignupScreen;
