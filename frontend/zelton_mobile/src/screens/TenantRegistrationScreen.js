import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import { colors, typography, spacing, gradients, shadows } from '../theme/theme';
import { validateEmail, validatePhone } from '../utils/helpers';
import { ERROR_MESSAGES } from '../constants/constants';
import DataService from '../services/dataService';

const TenantRegistrationScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    emergencyContact: '',
    emergencyContactName: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName) newErrors.firstName = ERROR_MESSAGES.REQUIRED_FIELD;
    if (!formData.lastName) newErrors.lastName = ERROR_MESSAGES.REQUIRED_FIELD;
    
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
    
    if (!formData.address) newErrors.address = ERROR_MESSAGES.REQUIRED_FIELD;
    if (!formData.city) newErrors.city = ERROR_MESSAGES.REQUIRED_FIELD;
    if (!formData.state) newErrors.state = ERROR_MESSAGES.REQUIRED_FIELD;
    if (!formData.pincode) newErrors.pincode = ERROR_MESSAGES.REQUIRED_FIELD;
    
    if (!formData.emergencyContact) {
      newErrors.emergencyContact = ERROR_MESSAGES.REQUIRED_FIELD;
    } else if (!validatePhone(formData.emergencyContact)) {
      newErrors.emergencyContact = ERROR_MESSAGES.INVALID_PHONE;
    }
    
    if (!formData.emergencyContactName) {
      newErrors.emergencyContactName = ERROR_MESSAGES.REQUIRED_FIELD;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Update tenant profile with additional information
      const result = await DataService.updateTenantProfile(formData);
      if (result.success) {
        Alert.alert('Success', 'Profile completed successfully!');
        navigation.navigate('TenantDashboard');
      } else {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Tenant Registration</Text>
            <Text style={styles.subtitle}>
              Complete your profile to start using ZeltonLivings
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <InputField
              label="First Name"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChangeText={(value) => handleInputChange('firstName', value)}
              error={errors.firstName}
              leftIcon="person"
            />
            
            <InputField
              label="Last Name"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChangeText={(value) => handleInputChange('lastName', value)}
              error={errors.lastName}
              leftIcon="person"
            />
            
            <InputField
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              leftIcon="mail"
            />
            
            <InputField
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              keyboardType="phone-pad"
              error={errors.phone}
              leftIcon="call"
            />

            <Text style={styles.sectionTitle}>Address Information</Text>
            
            <InputField
              label="Address"
              placeholder="Enter your address"
              value={formData.address}
              onChangeText={(value) => handleInputChange('address', value)}
              multiline
              numberOfLines={3}
              error={errors.address}
              leftIcon="location"
            />
            
            <InputField
              label="City"
              placeholder="Enter your city"
              value={formData.city}
              onChangeText={(value) => handleInputChange('city', value)}
              error={errors.city}
              leftIcon="business"
            />
            
            <InputField
              label="State"
              placeholder="Enter your state"
              value={formData.state}
              onChangeText={(value) => handleInputChange('state', value)}
              error={errors.state}
              leftIcon="map"
            />
            
            <InputField
              label="Pincode"
              placeholder="Enter your pincode"
              value={formData.pincode}
              onChangeText={(value) => handleInputChange('pincode', value)}
              keyboardType="numeric"
              error={errors.pincode}
              leftIcon="mail"
            />

            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            
            <InputField
              label="Emergency Contact Name"
              placeholder="Enter emergency contact name"
              value={formData.emergencyContactName}
              onChangeText={(value) => handleInputChange('emergencyContactName', value)}
              error={errors.emergencyContactName}
              leftIcon="person"
            />
            
            <InputField
              label="Emergency Contact Phone"
              placeholder="Enter emergency contact phone"
              value={formData.emergencyContact}
              onChangeText={(value) => handleInputChange('emergencyContact', value)}
              keyboardType="phone-pad"
              error={errors.emergencyContact}
              leftIcon="call"
            />

            <GradientButton
              title="Complete Registration"
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitButton}
            />
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
  scrollContent: {
    flexGrow: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
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
  form: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
});

export default TenantRegistrationScreen;
