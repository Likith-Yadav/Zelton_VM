import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientCard from "../components/GradientCard";
import GradientButton from "../components/GradientButton";
import PhoneInputField from "../components/PhoneInputField";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatDate } from "../utils/helpers";
import DataService from "../services/dataService";
import AuthService from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/constants";

const ProfileScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    // Add a small delay to ensure AsyncStorage is available
    const timer = setTimeout(() => {
      loadProfileData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Safety check for AsyncStorage
      if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
        console.error('AsyncStorage is not available');
        console.log('AsyncStorage object:', AsyncStorage);
        console.log('Available methods:', AsyncStorage ? Object.keys(AsyncStorage) : 'undefined');
        
        // Try to reload after a delay
        setTimeout(() => {
          console.log('Retrying AsyncStorage access...');
          loadProfileData();
        }, 1000);
        
        setLoading(false);
        return;
      }
      
      let role, token, userData;
      
      try {
        role = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
        token = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
        userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      } catch (storageError) {
        console.error('AsyncStorage error:', storageError);
        console.log('Storage error details:', {
          message: storageError.message,
          stack: storageError.stack,
          name: storageError.name
        });
        
        // Fallback: try to continue without storage
        console.log('Continuing without storage data...');
        role = null;
        token = null;
        userData = null;
      }
      
      // Check if we have profile data from login
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          
          // If we have profile data from login, use it directly
          if (parsedUserData.profile && parsedUserData.role) {
            const profile = parsedUserData.profile;
            const completeProfile = {
              ...profile,
              phone: profile.phone || '',
              address: profile.address || '',
              city: profile.city || '',
              state: profile.state || '',
              pincode: profile.pincode || '',
              pan_number: profile.pan_number || '',
              aadhar_number: profile.aadhar_number || '',
              // Emergency contact removed
              profile_image: profile.profile_image || null,
              date_of_birth: profile.date_of_birth || '',
              gender: profile.gender || '',
              occupation: profile.occupation || '',
            };
            setProfileData(completeProfile);
            setUserRole(parsedUserData.role);
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      // Check if token is valid
      if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
        console.log('No valid token found, showing demo profile');
        
        // Show demo profile instead of redirecting
        setProfileData({
          user: {
            email: "demo@example.com",
            first_name: "Demo",
            last_name: "User",
            date_joined: "2024-01-01T00:00:00Z",
          },
          phone: "+91 9876543210",
          address: "123 Demo Street, Mumbai, Maharashtra 400001",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          // Emergency contact removed
          created_at: "2024-01-01T00:00:00Z",
        });
        setUserRole('owner');
        setLoading(false);
        return;
      }
      
      // If no role is set, try to determine from API response
      if (!role) {
        console.log('No role found, trying to determine from API...');
        
        // Try owner profile first
        const ownerResponse = await DataService.getOwnerProfile();
        console.log('Owner response for role detection:', ownerResponse);
        if (ownerResponse.success && ownerResponse.data && ownerResponse.data.length > 0) {
          role = 'owner';
          try {
            await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, 'owner');
          } catch (error) {
            console.error('Error setting owner role:', error);
          }
          console.log('Set role to owner based on API response');
        } else {
          // Try tenant profile
          const tenantResponse = await DataService.getTenantProfile();
          console.log('Tenant response for role detection:', tenantResponse);
          if (tenantResponse.success && tenantResponse.data && tenantResponse.data.length > 0) {
            role = 'tenant';
            await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, 'tenant');
            console.log('Set role to tenant based on API response');
          } else {
            // If both fail, try to determine from stored user data
            if (userData) {
              try {
                const parsedUserData = JSON.parse(userData);
                if (parsedUserData.role) {
                  role = parsedUserData.role;
                  try {
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
                  } catch (error) {
                    console.error('Error setting role from user data:', error);
                  }
                  console.log('Set role from stored user data:', role);
                }
              } catch (error) {
                console.error('Error parsing user data for role:', error);
              }
            }
            
            // Last resort: assume owner if we have a token
            if (!role && token) {
              console.log('No role found, defaulting to owner');
              role = 'owner';
              try {
                await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, 'owner');
              } catch (error) {
                console.error('Error setting default owner role:', error);
              }
            }
          }
        }
      }
      
      setUserRole(role);

      if (role === "owner") {
        console.log('=== TESTING API CALL ===');
        const response = await DataService.getOwnerProfile();
        console.log('Full API response:', response);
        
        if (response.success && response.data) {
          // API returns single object from profile action
          const profile = response.data;
          console.log('Raw profile data from API:', profile);
          console.log('PAN Number from API:', profile.pan_number);
          console.log('Aadhar Number from API:', profile.aadhar_number);
          console.log('Profile image URL:', profile.profile_image);
          
          // Ensure all fields are present with defaults, handling null values properly
          const completeProfile = {
            ...profile,
            phone: profile.phone || '',
            address: profile.address || '',
            city: profile.city || '',
            state: profile.state || '',
            pincode: profile.pincode || '',
            pan_number: profile.pan_number || null, // Keep null if not provided
            aadhar_number: profile.aadhar_number || '',
            // Emergency contact removed
            profile_image: profile.profile_image || null,
            date_of_birth: profile.date_of_birth || null,
            gender: profile.gender || null,
            occupation: profile.occupation || '',
            payment_method: profile.payment_method || null,
            bank_name: profile.bank_name || '',
            ifsc_code: profile.ifsc_code || '',
            account_number: profile.account_number || '',
            upi_id: profile.upi_id || '',
          };
          console.log('Complete profile data:', completeProfile);
          console.log('PAN in complete profile:', completeProfile.pan_number);
          console.log('Aadhar in complete profile:', completeProfile.aadhar_number);
          console.log('Profile image URL in complete profile:', completeProfile.profile_image);
          setProfileData(completeProfile);
        } else {
          // Check if it's an authentication error
          if (response.error && response.error.includes('Authentication credentials were not provided')) {
            console.log('Authentication error detected, redirecting to login');
            Alert.alert(
              'Authentication Required',
              'Your session has expired. Please log in again.',
              [
                {
                  text: 'Login',
                  onPress: () => navigation.navigate('Auth')
                }
              ]
            );
            return;
          }
          
          // No owner profile exists, create one
          console.log('No owner profile found, creating one...');
          const createResponse = await DataService.createOwnerProfile();
          if (createResponse.success) {
            const profile = createResponse.data;
            // Ensure all fields are present with defaults
            const completeProfile = {
              ...profile,
              phone: profile.phone || '',
              address: profile.address || '',
              city: profile.city || '',
              state: profile.state || '',
              pincode: profile.pincode || '',
              pan_number: profile.pan_number || '',
              aadhar_number: profile.aadhar_number || '',
              // Emergency contact removed
              profile_image: profile.profile_image || null,
              date_of_birth: profile.date_of_birth || '',
              gender: profile.gender || '',
              occupation: profile.occupation || '',
            };
            setProfileData(completeProfile);
          } else {
            // Fallback to demo data
            setProfileData({
              user: {
                email: "demo@owner.com",
                first_name: "Demo",
                last_name: "Owner",
                date_joined: "2024-01-01T00:00:00Z",
              },
              phone: "+91 9876543210",
              address: "123 Owner Street, Mumbai, Maharashtra 400001",
              city: "Mumbai",
              state: "Maharashtra",
              pincode: "400001",
              aadhar_number: "1234-5678-9012",
              pan_number: "ABCDE1234F",
              emergency_contact: "+91 9876543211",
              emergency_contact_name: "Emergency Contact",
              date_of_birth: "1990-01-01",
              gender: "male",
              occupation: "Property Manager",
              created_at: "2024-01-01T00:00:00Z",
            });
          }
        }
      } else if (role === "tenant") {
        console.log('=== LOADING TENANT PROFILE ===');
        const response = await DataService.getTenantProfile();
        console.log('Tenant profile API response:', response);
        
        if (response.success && response.data) {
          // API returns single object from profile action (same as owner)
          const profile = response.data;
          console.log('Raw tenant profile data from API:', profile);
          // Emergency contact removed
          console.log('Profile image URL:', profile.profile_image);
          
          // Ensure all fields are present with defaults
          const completeProfile = {
            ...profile,
            phone: profile.phone || '',
            address: profile.address || '',
            city: profile.city || '',
            state: profile.state || '',
            pincode: profile.pincode || '',
            pan_number: profile.pan_number || '',
            aadhar_number: profile.aadhar_number || '',
            // Emergency contact removed
            profile_image: profile.profile_image || null,
            date_of_birth: profile.date_of_birth || '',
            gender: profile.gender || '',
            occupation: profile.occupation || '',
          };
          console.log('Complete tenant profile data:', completeProfile);
          // Emergency contact removed
          console.log('Profile image URL in complete profile:', completeProfile.profile_image);
          setProfileData(completeProfile);
        } else {
          // Check if it's an authentication error
          if (response.error && response.error.includes('Authentication credentials were not provided')) {
            console.log('Authentication error detected for tenant, redirecting to login');
            Alert.alert(
              'Authentication Required',
              'Your session has expired. Please log in again.',
              [
                {
                  text: 'Login',
                  onPress: () => navigation.navigate('Auth')
                }
              ]
            );
            return;
          }
          
          // Fallback to demo data
          setProfileData({
            user: {
              email: "demo@tenant.com",
              first_name: "Demo",
              last_name: "Tenant",
              date_joined: "2024-01-01T00:00:00Z",
            },
            phone: "+91 9876543210",
            address: "456 Tenant Avenue, Mumbai, Maharashtra 400001",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001",
            aadhar_number: "1234-5678-9012",
            pan_number: "ABCDE1234F",
            // Emergency contact removed
            date_of_birth: "1995-01-01",
            gender: "female",
            occupation: "Software Engineer",
            created_at: "2024-01-01T00:00:00Z",
          });
        }
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    console.log('=== MANUAL REFRESH TRIGGERED ===');
    await loadProfileData();
    setRefreshing(false);
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password change functionality will be implemented soon. For now, please contact support if you need to change your password.',
      [
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );
  };

  const handleEdit = () => {
    if (userRole === 'tenant') {
      // For tenants, only allow editing phone number
      setEditData({
        phone: profileData?.phone || '',
      });
    } else {
      // For owners, allow editing all fields
      setEditData({
        phone: profileData?.phone || '',
        address: profileData?.address || '',
        city: profileData?.city || '',
        state: profileData?.state || '',
        pincode: profileData?.pincode || '',
        pan_number: profileData?.pan_number || '',
        aadhar_number: profileData?.aadhar_number || '',
      });
    }
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      const response = userRole === 'owner' 
        ? await DataService.updateOwnerProfile(editData)
        : await DataService.updateTenantProfile(editData);
      
      if (response.success) {
        setProfileData({ ...profileData, ...editData });
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };



  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await AuthService.logout();
            navigation.reset({
              index: 0,
              routes: [{ name: "Landing" }],
            });
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  const renderProfileField = (icon, label, value, isEmail = false) => {
    // For email, always show the value even if empty
    if (isEmail) {
      const displayValue = value || "No email provided";
      return (
        <View style={styles.profileField}>
          <View style={styles.fieldHeader}>
            <Ionicons name={icon} size={20} color={colors.primary} />
            <Text style={styles.fieldLabel}>{label}</Text>
          </View>
          <Text style={styles.fieldValue}>{displayValue}</Text>
        </View>
      );
    }
    
    // Handle null, undefined, empty string, or "None" values
    let displayValue = "Not provided";
    if (value !== null && value !== undefined && value !== "" && value !== "None") {
      const stringValue = value.toString().trim();
      if (stringValue !== "" && stringValue !== "None") {
        displayValue = stringValue;
      }
    }
    
    return (
      <View style={styles.profileField}>
        <View style={styles.fieldHeader}>
          <Ionicons name={icon} size={20} color={colors.primary} />
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        <Text style={styles.fieldValue}>{displayValue}</Text>
      </View>
    );
  };

  const renderEditField = (label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false) => {
    // Special handling for phone fields
    if (keyboardType === 'phone-pad' && label.toLowerCase().includes('phone')) {
      return (
        <PhoneInputField
          label={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
        />
      );
    }
    
    return (
      <View style={styles.editField}>
        <Text style={styles.editLabel}>{label}</Text>
        <TextInput
          style={[styles.editInput, multiline && styles.textArea]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
        />
      </View>
    );
  };

  const renderProfile = () => {
    if (!profileData) return null;

    console.log('Profile data for rendering:', profileData);
    console.log('User data:', profileData.user);
    console.log('Phone:', profileData.phone);
    console.log('Address:', profileData.address);
    console.log('City:', profileData.city);
    console.log('State:', profileData.state);
    console.log('Pincode:', profileData.pincode);
    console.log('Aadhar:', profileData.aadhar_number);
    console.log('PAN:', profileData.pan_number);

    const {
      user,
      phone,
      address,
      city,
      state,
      pincode,
      aadhar_number,
      pan_number,
      profile_image,
      created_at,
    } = profileData;

    const roleDisplayName = userRole === 'owner' ? 'Property Owner' : 'Tenant';

    return (
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <GradientCard variant="surface" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {profile_image && profile_image.trim() !== '' ? (
                <Image 
                  source={{ 
                    uri: profile_image + (profile_image.includes('?') ? '&' : '?') + 't=' + Date.now()
                  }} 
                  style={styles.profileImage}
                  onError={(error) => {
                    console.log('Image load error for:', profile_image, 'Error:', error);
                    console.log('Full image URL:', profile_image + (profile_image.includes('?') ? '&' : '?') + 't=' + Date.now());
                  }}
                  onLoad={() => console.log('Image loaded successfully:', profile_image)}
                />
              ) : (
                <Ionicons name="person-circle" size={80} color={colors.primary} />
              )}
            </View>
            <Text style={styles.profileName}>
              {user?.first_name} {user?.last_name}
            </Text>
            <Text style={styles.profileRole}>{roleDisplayName}</Text>
          </View>

          <View style={styles.profileFields}>
            {isEditing ? (
              <>
                {userRole === 'tenant' ? (
                  // For tenants, only allow editing phone number
                  renderEditField("Phone", editData.phone, (text) => setEditData({...editData, phone: text}), "Enter phone number", "phone-pad")
                ) : (
                  // For owners, show all editable fields
                  <>
                    {renderEditField("Phone", editData.phone, (text) => setEditData({...editData, phone: text}), "Enter phone number", "phone-pad")}
                    {renderEditField("Address", editData.address, (text) => setEditData({...editData, address: text}), "Enter address", "default", true)}
                    {renderEditField("City", editData.city, (text) => setEditData({...editData, city: text}), "Enter city")}
                    {renderEditField("State", editData.state, (text) => setEditData({...editData, state: text}), "Enter state")}
                    {renderEditField("Pincode", editData.pincode, (text) => setEditData({...editData, pincode: text}), "Enter pincode", "numeric")}
                    {renderEditField("PAN Number", editData.pan_number, (text) => setEditData({...editData, pan_number: text}), "Enter PAN number")}
                    {renderEditField("Aadhar Number", editData.aadhar_number, (text) => setEditData({...editData, aadhar_number: text}), "Enter Aadhar number", "numeric")}
                  </>
                )}
              </>
            ) : (
              <>
                {renderProfileField("mail", "Email", user?.email, true)}
                {renderProfileField("call", "Phone", phone)}
                {userRole === 'owner' && (
                  <>
                    {renderProfileField("location", "Address", address)}
                    {renderProfileField("location", "City", city)}
                    {renderProfileField("location", "State", state)}
                    {renderProfileField("location", "Pincode", pincode)}
                    {renderProfileField("card", "Aadhar Number", aadhar_number)}
                    {renderProfileField("document", "PAN Number", pan_number)}
                    {renderProfileField("card", "Payment Method", profileData.payment_method === 'bank' ? 'Bank Details' : profileData.payment_method === 'upi' ? 'UPI' : null)}
                    {profileData.payment_method === 'bank' && (
                      <>
                        {renderProfileField("business", "Bank Name", profileData.bank_name)}
                        {renderProfileField("card", "IFSC Code", profileData.ifsc_code)}
                        {renderProfileField("wallet", "Account Number", profileData.account_number)}
                      </>
                    )}
                    {profileData.payment_method === 'upi' && (
                      renderProfileField("phone-portrait", "UPI ID", profileData.upi_id)
                    )}
                  </>
                )}
                {renderProfileField("calendar", "Member Since", formatDate(created_at))}
              </>
            )}
          </View>

          <View style={styles.profileActions}>
            {isEditing ? (
              <View style={styles.editActions}>
                <GradientButton
                  title="Save Changes"
                  onPress={handleSaveEdit}
                  style={styles.saveButton}
                  loading={loading}
                />
                <GradientButton
                  title="Cancel"
                  onPress={handleCancelEdit}
                  variant="secondary"
                  style={styles.cancelButton}
                />
              </View>
            ) : (
              <View style={styles.viewActions}>
                {userRole === 'tenant' ? (
                  // For tenants, show "Edit Phone" instead of "Edit Profile"
                  <GradientButton
                    title="Edit Phone"
                    onPress={handleEdit}
                    style={styles.editButton}
                  />
                ) : (
                  // For owners, show "Edit Profile"
                  <GradientButton
                    title="Edit Profile"
                    onPress={handleEdit}
                    style={styles.editButton}
                  />
                )}
                <GradientButton
                  title="Change Password"
                  onPress={handleChangePassword}
                  variant="secondary"
                  style={styles.passwordButton}
                />
              </View>
            )}
          </View>
        </GradientCard>

        <GradientCard variant="surface" style={styles.actionsCard}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </GradientCard>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <LinearGradient
        colors={gradients.background}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      {/* Content */}
      {renderProfile()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.lg,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  profileName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  profileRole: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  profileFields: {
    gap: spacing.md,
  },
  profileField: {
    paddingVertical: spacing.sm,
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontWeight: "500",
  },
  fieldValue: {
    ...typography.body1,
    color: colors.text,
    marginLeft: 28, // Icon width + margin
  },
  actionsCard: {
    marginBottom: spacing.lg,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    backgroundColor: colors.error + "10",
    borderWidth: 1,
    borderColor: colors.error + "30",
  },
  logoutText: {
    ...typography.body1,
    color: colors.error,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  // New styles for enhanced profile
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageEditIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editField: {
    marginBottom: spacing.md,
  },
  editLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  editInput: {
    ...typography.body1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  profileActions: {
    marginTop: spacing.lg,
  },
  editActions: {
    gap: spacing.md,
  },
  viewActions: {
    gap: spacing.md,
  },
  editButton: {
    marginBottom: spacing.sm,
  },
  saveButton: {
    marginBottom: spacing.sm,
  },
  cancelButton: {
    marginBottom: spacing.sm,
  },
  passwordButton: {
    marginBottom: spacing.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.xl,
    margin: spacing.lg,
    minWidth: 280,
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  modalButtons: {
    gap: spacing.md,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  modalButtonText: {
    ...typography.body1,
    color: colors.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  modalCancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.body1,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default ProfileScreen;