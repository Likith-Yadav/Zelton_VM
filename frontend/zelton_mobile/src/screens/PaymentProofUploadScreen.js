import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import GradientCard from "../components/GradientCard";
import GradientButton from "../components/GradientButton";
import InputField from "../components/InputField";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatCurrency } from "../utils/helpers";
import { paymentProofAPI, testAPI } from "../services/api";
import DataService from "../services/dataService";

const PaymentProofUploadScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState("full");
  const [customAmount, setCustomAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [remainingAmount, setRemainingAmount] = useState(0);

  useEffect(() => {
    loadPaymentData();
    requestImagePermissions();
  }, []);

  const requestImagePermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload payment proofs.');
    }
  };

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      // Test API connection first
      try {
        await testAPI.testConnection();
      } catch (error) {
        console.error("API connection test failed:", error);
        Alert.alert("Connection Error", "Cannot connect to server. Please check your internet connection.");
        return;
      }
      
      const result = await DataService.getTenantDashboard();
      if (result.success) {
        setPaymentData(result.data);
        setRemainingAmount(result.data.current_unit?.remaining_amount || 0);
      } else {
        Alert.alert("Error", result.error);
      }
    } catch (error) {
      console.error("Error loading payment data:", error);
      Alert.alert("Error", "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentAmount = () => {
    if (selectedAmount === "full") {
      return remainingAmount || 0;
    } else if (selectedAmount === "custom") {
      return parseFloat(customAmount) || 0;
    }
    return 0;
  };

  const pickImage = async () => {
    try {
      console.log('Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Media library permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant photo library permissions to select images.');
        return;
      }

      console.log('Launching image library...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Selected image from gallery:', result.assets[0]);
        setSelectedImage(result.assets[0]);
      } else {
        console.log('Image selection was canceled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', `Failed to select image: ${error.message}`);
    }
  };

  const takePhoto = async () => {
    try {
      console.log('Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
        return;
      }

      console.log('Launching camera...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('Camera result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('Selected image from camera:', result.assets[0]);
        setSelectedImage(result.assets[0]);
      } else {
        console.log('Photo capture was canceled');
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', `Failed to take photo: ${error.message}`);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Payment Proof',
      'Choose how you want to add your payment proof',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleUpload = async () => {
    const amount = getPaymentAmount();

    if (amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!selectedImage) {
      Alert.alert("Error", "Please select a payment proof image");
      return;
    }

    if (!paymentData?.current_unit?.id) {
      Alert.alert("Error", "Unit information not available");
      return;
    }

    try {
      setUploading(true);

      const response = await paymentProofAPI.uploadPaymentProof(
        paymentData.current_unit.id,
        amount,
        selectedImage,
        description
      );

      if (response.data.success) {
        Alert.alert(
          "Success",
          "Payment proof uploaded successfully! Your owner will review and verify it.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        throw new Error(response.data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      
      let errorMessage = "Failed to upload payment proof. Please try again.";
      
      if (error.message) {
        if (error.message.includes("Network Error")) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Upload timeout. Please try again with a smaller image.";
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert("Upload Failed", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment information...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Payment Proof</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Property Info */}
        <GradientCard variant="primary" style={styles.propertyCard}>
          <View style={styles.propertyHeader}>
            <Ionicons name="home" size={24} color={colors.white} />
            <Text style={styles.propertyTitle}>Property Details</Text>
          </View>
          <Text style={styles.propertyName}>
            {paymentData?.current_property?.name}
          </Text>
          <Text style={styles.propertyAddress}>
            {paymentData?.current_property?.address}
          </Text>
          <Text style={styles.unitNumber}>
            Unit: {paymentData?.current_unit?.unit_number} (
            {paymentData?.current_unit?.unit_type})
          </Text>
        </GradientCard>

        {/* Amount Selection */}
        <GradientCard variant="surface" style={styles.amountCard}>
          <Text style={styles.cardTitle}>Payment Amount</Text>

          <TouchableOpacity
            style={[
              styles.amountOption,
              selectedAmount === "full" && styles.selectedAmountOption,
            ]}
            onPress={() => setSelectedAmount("full")}
          >
            <View style={styles.amountOptionContent}>
              <Ionicons
                name={
                  selectedAmount === "full"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={colors.primary}
              />
              <View style={styles.amountOptionText}>
                <Text style={styles.amountOptionTitle}>
                  {remainingAmount === paymentData?.monthly_rent
                    ? "Full Monthly Rent"
                    : "Full Remaining Amount"}
                </Text>
                <Text style={styles.amountOptionSubtitle}>
                  Pay complete amount
                </Text>
              </View>
              <Text style={styles.amountOptionValue}>
                {formatCurrency(remainingAmount || 0)}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.amountOption,
              selectedAmount === "custom" && styles.selectedAmountOption,
            ]}
            onPress={() => setSelectedAmount("custom")}
          >
            <View style={styles.amountOptionContent}>
              <Ionicons
                name={
                  selectedAmount === "custom"
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={colors.primary}
              />
              <View style={styles.amountOptionText}>
                <Text style={styles.amountOptionTitle}>Custom Amount</Text>
                <Text style={styles.amountOptionSubtitle}>
                  Pay partial amount
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {selectedAmount === "custom" && (
            <View style={styles.customAmountContainer}>
              <InputField
                label="Enter Amount"
                value={customAmount}
                onChangeText={(text) => {
                  const amount = parseFloat(text) || 0;
                  if (amount <= remainingAmount) {
                    setCustomAmount(text);
                  } else {
                    Alert.alert(
                      "Invalid Amount",
                      `Amount cannot exceed remaining amount of ₹${remainingAmount.toFixed(2)}`
                    );
                  }
                }}
                placeholder="0.00"
                keyboardType="numeric"
                prefix="₹"
              />
            </View>
          )}
        </GradientCard>

        {/* Payment Proof Image */}
        <GradientCard variant="surface" style={styles.imageCard}>
          <Text style={styles.cardTitle}>Payment Proof</Text>
          <Text style={styles.cardSubtitle}>
            Upload a photo of your payment receipt, bank transfer screenshot, or any proof of payment
          </Text>

          {selectedImage ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={showImagePicker}
              >
                <Ionicons name="camera" size={20} color={colors.white} />
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imagePicker} onPress={showImagePicker}>
              <Ionicons name="camera" size={48} color={colors.primary} />
              <Text style={styles.imagePickerText}>Tap to add payment proof</Text>
              <Text style={styles.imagePickerSubtext}>
                Take a photo or select from gallery
              </Text>
            </TouchableOpacity>
          )}
        </GradientCard>

        {/* Description */}
        <GradientCard variant="surface" style={styles.descriptionCard}>
          <Text style={styles.cardTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.descriptionInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Add any additional notes about this payment..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </GradientCard>

        {/* Summary */}
        <GradientCard variant="surface" style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Payment Summary</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Amount to Pay:</Text>
            <Text style={[styles.summaryValue, { color: colors.primary, fontWeight: "bold" }]}>
              {formatCurrency(getPaymentAmount())}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Payment Method:</Text>
            <Text style={styles.summaryValue}>Manual Upload</Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Status:</Text>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              Pending Owner Verification
            </Text>
          </View>
        </GradientCard>

        {/* Upload Button */}
        <GradientButton
          title={uploading ? "Uploading..." : "Upload Payment Proof"}
          onPress={handleUpload}
          style={styles.uploadButton}
          disabled={uploading || getPaymentAmount() <= 0 || !selectedImage}
        />

        {/* Info Card */}
        <GradientCard variant="surface" style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoTitle}>How it works</Text>
          </View>
          <Text style={styles.infoText}>
            1. Upload your payment proof (receipt, screenshot, etc.)
          </Text>
          <Text style={styles.infoText}>
            2. Your owner will review and verify the payment
          </Text>
          <Text style={styles.infoText}>
            3. Once verified, the amount will be deducted from your balance
          </Text>
          <Text style={styles.infoText}>
            4. You'll receive a notification about the verification status
          </Text>
        </GradientCard>
      </ScrollView>
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
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontWeight: "bold",
  },
  placeholder: {
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
    marginTop: spacing.md,
  },
  propertyCard: {
    marginBottom: spacing.lg,
  },
  propertyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  propertyTitle: {
    ...typography.h6,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  propertyName: {
    ...typography.h4,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  propertyAddress: {
    ...typography.body2,
    color: colors.white,
    opacity: 0.9,
    marginBottom: spacing.sm,
  },
  unitNumber: {
    ...typography.body1,
    color: colors.white,
    fontWeight: "500",
  },
  amountCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  cardSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  amountOption: {
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  selectedAmountOption: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  amountOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountOptionText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  amountOptionTitle: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  amountOptionSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  amountOptionValue: {
    ...typography.h6,
    color: colors.primary,
    fontWeight: "bold",
  },
  customAmountContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  imageCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  imagePreview: {
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  changeImageText: {
    ...typography.body2,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: "500",
  },
  imagePicker: {
    alignItems: "center",
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: "dashed",
    borderRadius: 12,
  },
  imagePickerText: {
    ...typography.body1,
    color: colors.text,
    marginTop: spacing.md,
    fontWeight: "500",
  },
  imagePickerSubtext: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  descriptionCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  descriptionInput: {
    ...typography.body1,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
  },
  summaryCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  uploadButton: {
    marginBottom: spacing.lg,
  },
  infoCard: {
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  infoTitle: {
    ...typography.h6,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  infoText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
});

export default PaymentProofUploadScreen;
