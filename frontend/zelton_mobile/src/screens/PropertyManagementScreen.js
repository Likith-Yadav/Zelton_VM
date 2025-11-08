import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientButton from "../components/GradientButton";
import GradientCard from "../components/GradientCard";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatCurrency, formatDate } from "../utils/helpers";
import DataService from "../services/dataService";
import { PROPERTY_TYPES } from "../constants/constants";

const PropertyManagementScreen = ({ navigation }) => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    property_type: "apartment",
    description: "",
  });
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // Maintenance contacts are managed per unit, not at property level

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    // Listen for keyboard show/hide events
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (showDetailedView !== undefined) {
      loadProperties();
    }
  }, [showDetailedView]);

  // Refresh dashboard data when component mounts or when properties change
  useEffect(() => {
    const refreshDashboard = async () => {
      try {
        // This will trigger a refresh of the dashboard data
        // The parent component (OwnerDashboardScreen) should handle this
      } catch (error) {
        console.error("Error refreshing dashboard:", error);
      }
    };

    if (properties.length > 0) {
      refreshDashboard();
    }
  }, [properties]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use regular properties endpoint (now includes payment data)
      // For detailed view with units, try detailed properties endpoint
      let response;
      if (showDetailedView) {
        try {
          response = await DataService.getDetailedProperties();
          if (!response.success) {
            // Fallback to regular properties if detailed fails
            response = await DataService.getProperties();
          }
        } catch (err) {
          console.log("Detailed properties error, using regular properties:", err);
          response = await DataService.getProperties();
        }
      } else {
        response = await DataService.getProperties();
      }

      if (response.success) {
        // Ensure we have an array of properties
        const propertiesData = Array.isArray(response.data)
          ? response.data
          : [];
        
        // Ensure all required fields exist with defaults
        const enrichedProperties = propertiesData.map(property => ({
          ...property,
          total_payments: property.total_payments ?? 0,
          current_month_payments: property.current_month_payments ?? 0,
          pending_payments: property.pending_payments ?? 0,
          occupied_units: property.occupied_units ?? 0,
          total_units: property.total_units ?? 0,
          units: property.units ?? [],
        }));
        
        console.log(`Loaded ${enrichedProperties.length} properties`);
        setProperties(enrichedProperties);
      } else {
        console.error("Failed to load properties:", response.error);
        setError(response.error || "Failed to load properties");
        setProperties([]);
      }
    } catch (err) {
      console.error("Properties load error:", err);
      setError("Failed to load properties. Please try again.");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProperties();
    setRefreshing(false);
  };

  const handleAddProperty = () => {
    setEditingProperty(null);
    const newFormData = {
      name: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      property_type: "apartment",
      description: "",
    };
    setFormData(newFormData);
    // Maintenance contacts not captured at property level
    setShowAddModal(true);
  };

  const handleEditProperty = (property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      pincode: property.pincode,
      property_type: property.property_type,
      description: property.description || "",
    });
    // Maintenance contacts not editable at property level
    setShowAddModal(true);
  };

  // Property-level maintenance contact management removed

  // Property-level maintenance contact management removed

  const handleSaveProperty = async () => {
    try {
      setLoading(true);

      // Basic validation
      const requiredFields = [
        "name",
        "address",
        "city",
        "state",
        "pincode",
        "property_type",
      ];
      const missingFields = requiredFields.filter(
        (field) => !formData[field] || formData[field].trim() === ""
      );

      if (missingFields.length > 0) {
        Alert.alert(
          "Validation Error",
          `Please fill in the following required fields: ${missingFields.join(
            ", "
          )}`
        );
        setLoading(false);
        return;
      }

      // Do not include maintenance contacts at property level
      const propertyData = { ...formData };

      let response;
      if (editingProperty) {
        response = await DataService.updateProperty(
          editingProperty.id,
          propertyData
        );
      } else {
        response = await DataService.createProperty(propertyData);
      }

      if (response.success) {
        setShowAddModal(false);
        await loadProperties();
        Alert.alert(
          "Success",
          editingProperty
            ? "Property updated successfully"
            : "Property added successfully"
        );
      } else {
        Alert.alert("Error", response.error || "Failed to save property");
      }
    } catch (err) {
      console.error("Save property error:", err);
      Alert.alert("Error", "Failed to save property");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProperty = (property) => {
    Alert.alert(
      "Delete Property",
      `Are you sure you want to delete "${property.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await DataService.deleteProperty(property.id);
              if (response.success) {
                await loadProperties();
                Alert.alert("Success", "Property deleted successfully");
              } else {
                Alert.alert(
                  "Error",
                  response.error || "Failed to delete property"
                );
              }
            } catch (err) {
              console.error("Delete property error:", err);
              Alert.alert("Error", "Failed to delete property");
            }
          },
        },
      ]
    );
  };

  const renderPropertyCard = (property) => {
    const occupiedUnits = property.occupied_units || 0;
    const totalUnits = property.total_units || 0;
    const vacantUnits = totalUnits - occupiedUnits;
    
    return (
      <GradientCard
        key={property.id}
        variant="surface"
        style={styles.propertyCard}
      >
        {/* Property Header */}
        <View style={styles.propertyHeader}>
          <View style={styles.propertyInfo}>
            <Text style={styles.propertyName}>{property.name}</Text>
            <View style={styles.propertyTypeBadge}>
              <Text style={styles.propertyTypeText}>
                {property.property_type?.toUpperCase() || 'PROPERTY'}
              </Text>
            </View>
          </View>
          <View style={styles.propertyStatsBadge}>
            <Text style={styles.statValue}>{totalUnits}</Text>
            <Text style={styles.statLabel}>Units</Text>
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.propertyLocationSection}>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={colors.textSecondary} />
            <Text style={styles.propertyLocation}>
              {property.city}, {property.state}
            </Text>
          </View>
          {property.address && (
            <View style={styles.locationRow}>
              <Ionicons name="map" size={16} color={colors.textSecondary} />
              <Text style={styles.propertyAddress}>{property.address}</Text>
            </View>
          )}
          {property.pincode && (
            <View style={styles.locationRow}>
              <Ionicons name="pin" size={16} color={colors.textSecondary} />
              <Text style={styles.propertyPincode}>{property.pincode}</Text>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.propertyStatsSection}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Property Statistics</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="home" size={20} color={colors.primary} />
              </View>
              <Text style={styles.statItemValue}>{totalUnits}</Text>
              <Text style={styles.statItemLabel}>Total Units</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.success + "20" }]}>
                <Ionicons name="person" size={20} color={colors.success} />
              </View>
              <Text style={styles.statItemValue}>{occupiedUnits}</Text>
              <Text style={styles.statItemLabel}>Occupied</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.warning + "20" }]}>
                <Ionicons name="home-outline" size={20} color={colors.warning} />
              </View>
              <Text style={styles.statItemValue}>{vacantUnits}</Text>
              <Text style={styles.statItemLabel}>Vacant</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary Section */}
        <View style={styles.paymentSummarySection}>
          <View style={styles.paymentSummaryHeader}>
            <Text style={styles.paymentSummaryTitle}>Payment Summary</Text>
          </View>
          <View style={styles.paymentItems}>
            <View style={styles.paymentItem}>
              <Ionicons name="cash" size={16} color={colors.success} />
              <Text style={styles.paymentLabel}>Total Received</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(property.total_payments || 0)}
              </Text>
            </View>
            <View style={styles.paymentItem}>
              <Ionicons name="calendar" size={16} color={colors.primary} />
              <Text style={styles.paymentLabel}>This Month</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(property.current_month_payments || 0)}
              </Text>
            </View>
            <View style={styles.paymentItem}>
              <Ionicons name="time" size={16} color={colors.warning} />
              <Text style={styles.paymentLabel}>Pending</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(property.pending_payments || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Unit Preview Section (if units exist) */}
        {showDetailedView && property.units && property.units.length > 0 && (
          <View style={styles.unitsPreviewSection}>
            <View style={styles.unitsPreviewHeader}>
              <Text style={styles.unitsPreviewTitle}>
                Units ({property.units.length})
              </Text>
            </View>
            {property.units.slice(0, 3).map((unit) => (
              <View key={unit.id} style={styles.unitPreviewItem}>
                <View style={styles.unitPreviewInfo}>
                  <Ionicons name="cube" size={16} color={colors.primary} />
                  <Text style={[styles.unitPreviewNumber, { marginLeft: spacing.xs }]}>
                    Unit {unit.unit_number}
                  </Text>
                  <View style={[
                    styles.unitStatusBadge,
                    { 
                      backgroundColor: unit.status === 'occupied' ? colors.success + "20" : colors.warning + "20",
                      marginLeft: spacing.xs,
                    }
                  ]}>
                    <Text style={[
                      styles.unitStatusText,
                      { color: unit.status === 'occupied' ? colors.success : colors.warning }
                    ]}>
                      {unit.status?.toUpperCase() || 'AVAILABLE'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.unitPreviewRent}>
                  {formatCurrency(unit.rent_amount)}
                </Text>
              </View>
            ))}
            {property.units.length > 3 && (
              <Text style={styles.moreUnits}>
                +{property.units.length - 3} more units
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.propertyActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate("UnitManagement", { property })}
          >
            <Ionicons name="grid" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Manage Units</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditProperty(property)}
          >
            <Ionicons name="create" size={20} color={colors.accent} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteProperty(property)}
          >
            <Ionicons name="trash" size={20} color={colors.error} />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </GradientCard>
    );
  };

  return (
    <LinearGradient
      colors={gradients.background}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Property Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              showDetailedView && styles.viewToggleButtonActive,
            ]}
            onPress={() => setShowDetailedView(!showDetailedView)}
          >
            <Ionicons
              name={showDetailedView ? "list" : "grid"}
              size={20}
              color={showDetailedView ? colors.white : colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddProperty}
          >
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Error Message */}
        {error && (
          <GradientCard variant="surface" style={styles.errorCard}>
            <View style={styles.errorContent}>
              <Ionicons name="warning" size={24} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                onPress={loadProperties}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </GradientCard>
        )}

        {/* Loading State */}
        {loading && !refreshing && (
          <GradientCard variant="surface" style={styles.loadingCard}>
            <View style={styles.loadingContent}>
              <Ionicons name="refresh" size={24} color={colors.primary} />
              <Text style={styles.loadingText}>Loading properties...</Text>
            </View>
          </GradientCard>
        )}

        {/* Properties List */}
        {!loading && properties.length === 0 && !error && (
          <GradientCard variant="surface" style={styles.emptyCard}>
            <Ionicons name="home" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Properties Found</Text>
            <Text style={styles.emptyDescription}>
              Add your first property to get started with managing rental units.
            </Text>
            <GradientButton
              title="Add Property"
              onPress={handleAddProperty}
              style={styles.addPropertyButton}
            />
          </GradientCard>
        )}

        {properties.map(renderPropertyCard)}
      </ScrollView>

      {/* Add/Edit Property Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <LinearGradient
          colors={gradients.background}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAddModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingProperty ? "Edit Property" : "Add Property"}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalBody}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={[
                styles.modalContentContainer,
                keyboardVisible && Platform.OS === "android" && { paddingBottom: 300 }
              ]}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={Platform.OS === "ios"}
              scrollEnabled={true}
            >
            <GradientCard variant="surface" style={styles.formCard}>
              <Text style={styles.inputLabel}>Property Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                }}
                placeholder="Enter property name"
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                placeholder="Enter full address"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>City *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.city}
                    onChangeText={(text) =>
                      setFormData({ ...formData, city: text })
                    }
                    placeholder="Enter city"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>State *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.state}
                    onChangeText={(text) =>
                      setFormData({ ...formData, state: text })
                    }
                    placeholder="Enter state"
                    placeholderTextColor={colors.textLight}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Pincode *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.pincode}
                onChangeText={(text) =>
                  setFormData({ ...formData, pincode: text })
                }
                placeholder="Enter pincode"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
                maxLength={6}
              />

              <Text style={styles.inputLabel}>Property Type *</Text>
              <View style={styles.typeSelector}>
                {PROPERTY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      formData.property_type === type.value &&
                        styles.typeOptionSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, property_type: type.value })
                    }
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        formData.property_type === type.value &&
                          styles.typeOptionTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => {
                  if (text.length <= 100) {
                    setFormData({ ...formData, description: text });
                  }
                }}
                placeholder="Enter property description (optional)"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={4}
                maxLength={100}
              />
              <Text style={styles.characterCount}>
                {formData.description.length}/100 characters
              </Text>

              {/* Emergency Contact removed */}

              {/* Maintenance contacts removed from property form. Manage per unit in Unit Management. */}
            </GradientCard>
            {/* Add extra spacing at bottom to ensure button is accessible */}
            <View style={{ height: keyboardVisible && Platform.OS === "android" ? spacing.xxl * 2 : spacing.xl * 2 }} />
          </ScrollView>

            <View style={styles.modalFooter}>
              <GradientButton
                title={editingProperty ? "Update Property" : "Add Property"}
                onPress={handleSaveProperty}
                loading={loading}
              />
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>
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
    padding: spacing.sm,
  },
  title: {
    ...typography.h4,
    color: colors.text,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  addButton: {
    padding: spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  errorCard: {
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  errorText: {
    ...typography.body2,
    color: colors.error,
    flex: 1,
    marginLeft: spacing.sm,
  },
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body2,
    color: colors.white,
    fontWeight: "600",
  },
  loadingCard: {
    marginBottom: spacing.lg,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  loadingText: {
    ...typography.body2,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h5,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  addPropertyButton: {
    marginTop: spacing.md,
  },
  propertyCard: {
    marginBottom: spacing.lg,
  },
  propertyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    ...typography.h6,
    color: colors.text,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  propertyTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  propertyTypeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    fontSize: 10,
  },
  propertyStatsBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    minWidth: 70,
  },
  statValue: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: "bold",
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  propertyLocationSection: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  propertyLocation: {
    ...typography.body2,
    color: colors.text,
    marginLeft: spacing.xs,
    fontWeight: "500",
  },
  propertyAddress: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  propertyPincode: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  propertyStatsSection: {
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statsHeader: {
    marginBottom: spacing.md,
  },
  statsTitle: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statItemValue: {
    ...typography.h6,
    color: colors.text,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  statItemLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
  },
  paymentSummarySection: {
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  paymentSummaryHeader: {
    marginBottom: spacing.sm,
  },
  paymentSummaryTitle: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
  },
  paymentItems: {
    // Container for payment items
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  paymentLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.xs,
  },
  paymentValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
  },
  unitsPreviewSection: {
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  unitsPreviewHeader: {
    marginBottom: spacing.sm,
  },
  unitsPreviewTitle: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
  },
  unitPreviewItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  unitPreviewInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  unitPreviewNumber: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
  },
  unitStatusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unitStatusText: {
    ...typography.caption,
    fontWeight: "600",
    fontSize: 9,
  },
  unitPreviewRent: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
  },
  propertyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    minHeight: 44,
    width: "48%",
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  actionText: {
    ...typography.body2,
    color: colors.text,
    marginLeft: spacing.xs,
    fontWeight: "600",
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text,
    fontWeight: "bold",
  },
  placeholder: {
    width: 40,
  },
  modalBody: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  formCard: {
    padding: spacing.lg,
  },
  inputLabel: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfWidth: {
    width: "48%",
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  typeOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  typeOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeOptionText: {
    ...typography.body2,
    color: colors.text,
  },
  typeOptionTextSelected: {
    color: colors.white,
  },
  modalFooter: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === "android" ? spacing.xl : spacing.lg,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: colors.borderLight,
  },
  maintenanceSection: {
    marginTop: spacing.md,
  },
  maintenanceSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyMaintenanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  emptyMaintenanceText: {
    ...typography.body2,
    color: colors.textLight,
    marginLeft: spacing.sm,
  },
  maintenanceContactsList: {
    marginBottom: spacing.md,
  },
  maintenanceContactItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  maintenanceContactInfo: {
    flex: 1,
  },
  maintenanceContactName: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  maintenanceContactService: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  maintenanceContactPhone: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  deleteMaintenanceButton: {
    padding: spacing.sm,
  },
  addMaintenanceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
  },
  addMaintenanceText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  characterCount: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: "right",
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  // Header Actions
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  viewToggleButton: {
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  // Detailed View Styles
  detailedInfo: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  paymentSummary: {
    marginBottom: spacing.md,
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  paymentLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    flex: 1,
    marginLeft: spacing.xs,
  },
  paymentValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
  },
  unitsSection: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  unitItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  unitInfo: {
    flex: 1,
  },
  unitNumber: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
  },
  unitStatus: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  tenantName: {
    ...typography.caption,
    color: colors.primary,
  },
  unitStats: {
    alignItems: "flex-end",
  },
  unitRent: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
  },
  unitPayments: {
    ...typography.caption,
    color: colors.success,
  },
  moreUnits: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
});

export default PropertyManagementScreen;
