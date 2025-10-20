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
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import GradientButton from "../components/GradientButton";
import GradientCard from "../components/GradientCard";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatCurrency, formatDate, formatOrdinal } from "../utils/helpers";
import DataService from "../services/dataService";
import { UNIT_TYPES, UNIT_STATUS } from "../constants/constants";

const SERVICE_TYPES = [
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "carpenter", label: "Carpenter" },
  { value: "ac_technician", label: "AC Technician" },
  { value: "housekeeping", label: "Housekeeping" },
  { value: "security", label: "Security" },
  { value: "other", label: "Other" },
];

const UnitManagementScreen = ({ navigation, route }) => {
  const [property, setProperty] = useState(route.params?.property || null);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    unit_number: "",
    unit_type: "1bhk",
    rent_amount: "",
    security_deposit: "",
    maintenance_charge: "",
    rent_due_date: "",
    area_sqft: "",
    description: "",
  });
  const [maintenanceContacts, setMaintenanceContacts] = useState({});
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    name: "",
    service_type: "plumber",
    phone: "",
  });
  const [showPropertySelector, setShowPropertySelector] = useState(false);

  useEffect(() => {
    if (property) {
      loadUnits();
      loadMaintenanceContacts();
    } else {
      // Load all properties and show property selector
      loadAllProperties();
    }
  }, [property]);

  useEffect(() => {
    // Show property selector if no property is selected and properties are loaded
    if (!property && properties.length > 0) {
      setShowPropertySelector(true);
    }
  }, [property, properties]);

  const loadAllProperties = async () => {
    try {
      setLoading(true);
      const response = await DataService.getProperties();

      if (response.success && response.data.length > 0) {
        setProperties(response.data);
        console.log(`Loaded ${response.data.length} properties`);
      } else {
        setError("No properties found. Please create a property first.");
      }
    } catch (err) {
      console.error("Error loading properties:", err);
      setError("Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  const handlePropertySelect = (selectedProperty) => {
    setProperty(selectedProperty);
    setShowPropertySelector(false);
    console.log("Selected property:", selectedProperty);
  };

  const loadUnits = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await DataService.getUnits(property.id);

      if (response.success) {
        // Ensure we have an array of units
        const unitsData = Array.isArray(response.data) ? response.data : [];
        setUnits(unitsData);
        console.log(`Loaded ${unitsData.length} units`);
      } else {
        setError(response.error || "Failed to load units");
      }
    } catch (err) {
      console.error("Units load error:", err);
      setError("Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  const loadMaintenanceContacts = async () => {
    try {
      // Get maintenance contacts from the property
      if (property && property.maintenance_contacts) {
        setMaintenanceContacts(property.maintenance_contacts);
      }
    } catch (err) {
      console.error("Error loading maintenance contacts:", err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUnits();
    await loadMaintenanceContacts();
    setRefreshing(false);
  };

  const handleAddUnit = () => {
    setEditingUnit(null);
    setFormData({
      unit_number: "",
      unit_type: "1bhk",
      rent_amount: "",
      security_deposit: "",
      maintenance_charge: "",
      rent_due_date: "",
      area_sqft: "",
      description: "",
    });
    setShowAddModal(true);
  };

  const handleEditUnit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      unit_number: unit.unit_number,
      unit_type: unit.unit_type,
      rent_amount: unit.rent_amount.toString(),
      security_deposit: unit.security_deposit.toString(),
      maintenance_charge: unit.maintenance_charge.toString(),
      rent_due_date: unit.rent_due_date,
      area_sqft: unit.area_sqft ? unit.area_sqft.toString() : "",
      description: unit.description || "",
    });
    setShowAddModal(true);
  };

  const handleSaveUnit = async () => {
    try {
      setLoading(true);

      // Validation
      if (!formData.unit_number.trim()) {
        Alert.alert("Validation Error", "Please enter a unit number");
        setLoading(false);
        return;
      }

      if (!formData.rent_amount || parseFloat(formData.rent_amount) <= 0) {
        Alert.alert("Validation Error", "Please enter a valid rent amount");
        setLoading(false);
        return;
      }

      if (
        !formData.rent_due_date ||
        formData.rent_due_date < 1 ||
        formData.rent_due_date > 31
      ) {
        Alert.alert(
          "Validation Error",
          "Please enter a valid rent due date (1-31)"
        );
        setLoading(false);
        return;
      }

      const unitData = {
        ...formData,
        property: property.id,
        rent_amount: parseFloat(formData.rent_amount),
        security_deposit: parseFloat(formData.security_deposit),
        maintenance_charge: parseFloat(formData.maintenance_charge),
        rent_due_date: parseInt(formData.rent_due_date),
        area_sqft: formData.area_sqft ? parseInt(formData.area_sqft) : null,
      };

      console.log("Unit data being sent:", unitData);
      console.log("Property ID:", property.id);

      let response;
      if (editingUnit) {
        response = await DataService.updateUnit(editingUnit.id, unitData);
      } else {
        response = await DataService.createUnit(unitData);
      }

      if (response.success) {
        // Update property with maintenance contacts
        const propertyData = {
          maintenance_contacts: maintenanceContacts,
        };
        await DataService.updateProperty(property.id, propertyData);

        setShowAddModal(false);
        await loadUnits();
        await loadMaintenanceContacts();
        Alert.alert(
          "Success",
          editingUnit ? "Unit updated successfully" : "Unit added successfully"
        );
      } else {
        Alert.alert("Error", response.error || "Failed to save unit");
      }
    } catch (err) {
      console.error("Save unit error:", err);
      Alert.alert("Error", "Failed to save unit");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnit = (unit) => {
    Alert.alert(
      "Delete Unit",
      `Are you sure you want to delete unit "${unit.unit_number}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await DataService.deleteUnit(unit.id);
              if (response.success) {
                await loadUnits();
                Alert.alert("Success", "Unit deleted successfully");
              } else {
                Alert.alert("Error", response.error || "Failed to delete unit");
              }
            } catch (err) {
              console.error("Delete unit error:", err);
              Alert.alert("Error", "Failed to delete unit");
            }
          },
        },
      ]
    );
  };

  const handleGenerateTenantKey = async (unit) => {
    try {
      setLoading(true);

      console.log(
        "Generating tenant key for property:",
        property.id,
        "unit:",
        unit.id
      );

      const response = await DataService.generateTenantKey(
        property.id,
        unit.id
      );
      console.log("DataService response:", response);

      if (response.success) {
        console.log("Tenant key generation result:", response.data);

        Alert.alert(
          "Tenant Key Generated",
          `Key: ${response.data.key}\n\nThis key will expire on ${formatDate(
            response.data.expires_at
          )}`,
          [
            { text: "OK" },
            {
              text: "Copy Key",
              onPress: () => {
                // In a real app, you would copy to clipboard
                console.log("Key copied:", response.data.key);
              },
            },
          ]
        );
      } else {
        // Handle specific error cases
        if (response.tenant_key_exists) {
          Alert.alert("Unit Already Occupied", response.message, [
            { text: "OK" },
            {
              text: "Remove Tenant",
              onPress: () => handleRemoveTenant(unit),
              style: "destructive",
            },
          ]);
        } else {
          Alert.alert(
            "Error",
            response.error || "Failed to generate tenant key"
          );
        }
      }
    } catch (err) {
      console.error("Generate key error:", err);
      Alert.alert("Error", "Failed to generate tenant key");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTenant = async (unit) => {
    Alert.alert(
      "Remove Tenant",
      `Are you sure you want to remove the tenant from unit ${unit.unit_number}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await DataService.removeTenant(unit.id);

              if (response.success) {
                Alert.alert("Tenant Removed", response.message, [
                  { text: "OK" },
                ]);
                loadUnits(); // Refresh the units list
              } else {
                Alert.alert(
                  "Error",
                  response.error || "Failed to remove tenant"
                );
              }
            } catch (err) {
              console.error("Remove tenant error:", err);
              Alert.alert("Error", "Failed to remove tenant");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeTenant = async (unit) => {
    Alert.alert(
      "Change Tenant",
      `Are you sure you want to change the tenant for unit ${unit.unit_number}? This will remove the current tenant and make the unit available for a new tenant.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change Tenant",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              const response = await DataService.changeTenant(unit.id);

              if (response.success) {
                Alert.alert("Tenant Changed", response.message, [
                  { text: "OK" },
                  {
                    text: "Generate New Key",
                    onPress: () => handleGenerateTenantKey(unit),
                  },
                ]);
                loadUnits(); // Refresh the units list
              } else {
                Alert.alert(
                  "Error",
                  response.error || "Failed to change tenant"
                );
              }
            } catch (err) {
              console.error("Change tenant error:", err);
              Alert.alert("Error", "Failed to change tenant");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCopyTenantKey = async (tenantKey) => {
    try {
      await Clipboard.setStringAsync(tenantKey);
      Alert.alert(
        "Tenant Key Copied",
        `Key: ${tenantKey}\n\nThis key has been copied to your clipboard.`,
        [{ text: "OK" }]
      );
      console.log("Tenant key copied:", tenantKey);
    } catch (error) {
      console.error("Failed to copy tenant key:", error);
      Alert.alert("Copy Failed", "Failed to copy tenant key to clipboard.", [
        { text: "OK" },
      ]);
    }
  };

  const handleAddMaintenanceContact = () => {
    setMaintenanceFormData({
      name: "",
      service_type: "plumber",
      phone: "",
    });
    setShowMaintenanceModal(true);
  };

  const handleSaveMaintenanceContact = () => {
    if (!maintenanceFormData.name.trim() || !maintenanceFormData.phone.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const newContacts = {
      ...maintenanceContacts,
      [maintenanceFormData.service_type]: {
        name: maintenanceFormData.name.trim(),
        phone: maintenanceFormData.phone.trim(),
        service_type: maintenanceFormData.service_type,
      },
    };
    setMaintenanceContacts(newContacts);
    setShowMaintenanceModal(false);
  };

  const handleDeleteMaintenanceContact = (serviceType) => {
    const contact = maintenanceContacts[serviceType];
    Alert.alert(
      "Delete Contact",
      `Are you sure you want to delete "${contact.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const newContacts = { ...maintenanceContacts };
            delete newContacts[serviceType];
            setMaintenanceContacts(newContacts);
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "available":
        return colors.success;
      case "occupied":
        return colors.primary;
      case "maintenance":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getRentStatusColor = (colorName) => {
    switch (colorName) {
      case "green":
        return colors.success;
      case "red":
        return colors.error;
      case "orange":
        return colors.warning;
      case "blue":
        return colors.info;
      case "gray":
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getTenantKeyStatusColor = (status) => {
    switch (status) {
      case "available":
        return colors.success;
      case "used":
        return colors.primary;
      case "expired":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getTenantKeyStatusText = (status) => {
    switch (status) {
      case "available":
        return "Available";
      case "used":
        return "Used";
      case "expired":
        return "Expired";
      default:
        return "Unknown";
    }
  };

  const getRentStatusIcon = (status) => {
    switch (status) {
      case "paid":
        return "checkmark-circle";
      case "overdue":
        return "warning";
      case "partial":
        return "time";
      case "available":
        return "home";
      default:
        return "help-circle";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "available":
        return "checkmark-circle";
      case "occupied":
        return "person";
      case "maintenance":
        return "construct";
      default:
        return "help-circle";
    }
  };

  const renderUnitCard = (unit) => (
    <GradientCard key={unit.id} variant="surface" style={styles.unitCard}>
      <View style={styles.unitHeader}>
        <View style={styles.unitInfo}>
          <Text style={styles.unitNumber}>{unit.unit_number}</Text>
          <Text style={styles.unitType}>{unit.unit_type.toUpperCase()}</Text>
          <Text style={styles.unitRent}>
            {formatCurrency(unit.rent_amount)}/month
          </Text>
        </View>
        <View style={styles.unitStatus}>
          <Ionicons
            name={getRentStatusIcon(unit.rent_status)}
            size={20}
            color={getRentStatusColor(unit.rent_status_color)}
          />
          <Text
            style={[
              styles.statusText,
              { color: getRentStatusColor(unit.rent_status_color) },
            ]}
          >
            {unit.rent_status_text}
          </Text>
        </View>
      </View>

      {/* Rent Status Section */}
      <View style={styles.rentStatusSection}>
        <View style={styles.rentStatusHeader}>
          <Text style={styles.rentStatusTitle}>Rent Status</Text>
          <View
            style={[
              styles.rentStatusBadge,
              {
                backgroundColor:
                  getRentStatusColor(unit.rent_status_color) + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.rentStatusText,
                { color: getRentStatusColor(unit.rent_status_color) },
              ]}
            >
              {unit.rent_status_text}
            </Text>
          </View>
        </View>

        {unit.tenant_name && (
          <View style={styles.tenantInfo}>
            <Ionicons name="person" size={16} color={colors.textSecondary} />
            <Text style={styles.tenantLabel}>Tenant:</Text>
            <Text style={styles.tenantName}>{unit.tenant_name}</Text>
          </View>
        )}

        {unit.tenant_key && (
          <View style={styles.tenantKeyInfo}>
            <Ionicons name="key" size={16} color={colors.textSecondary} />
            <Text style={styles.tenantKeyLabel}>Tenant Key:</Text>
            <View style={styles.tenantKeyContainer}>
              <Text style={styles.tenantKeyValue}>{unit.tenant_key}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => handleCopyTenantKey(unit.tenant_key)}
              >
                <Ionicons
                  name="copy-outline"
                  size={14}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>
            {unit.tenant_key_status && (
              <View style={styles.tenantKeyStatusContainer}>
                <View
                  style={[
                    styles.tenantKeyStatusBadge,
                    {
                      backgroundColor:
                        getTenantKeyStatusColor(unit.tenant_key_status) + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tenantKeyStatusText,
                      {
                        color: getTenantKeyStatusColor(unit.tenant_key_status),
                      },
                    ]}
                  >
                    {getTenantKeyStatusText(unit.tenant_key_status)}
                  </Text>
                </View>
              </View>
            )}
            {unit.tenant_key_expires && (
              <Text style={styles.tenantKeyExpiry}>
                Expires: {formatDate(unit.tenant_key_expires)}
              </Text>
            )}
          </View>
        )}

        {unit.pending_amount > 0 && (
          <View style={styles.pendingAmountContainer}>
            <Ionicons name="warning" size={16} color={colors.error} />
            <Text style={styles.pendingAmountLabel}>Pending:</Text>
            <Text style={styles.pendingAmountValue}>
              {formatCurrency(unit.pending_amount)}
            </Text>
          </View>
        )}

        {unit.current_month_paid && (
          <View style={styles.paidStatusContainer}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={colors.success}
            />
            <Text style={styles.paidStatusText}>Current month paid</Text>
          </View>
        )}
      </View>

      {/* Unit Details Section */}
      <View style={styles.unitDetailsSection}>
        <View style={styles.unitDetailsRow}>
          <View style={styles.unitDetailItem}>
            <Ionicons name="home" size={16} color={colors.textSecondary} />
            <Text style={styles.unitDetailLabel}>Area</Text>
            <Text style={styles.unitDetailValue}>
              {unit.area_sqft ? `${unit.area_sqft} sq ft` : "Not specified"}
            </Text>
          </View>

          <View style={styles.unitDetailItem}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles.unitDetailLabel}>Security Deposit</Text>
            <Text style={styles.unitDetailValue}>
              {formatCurrency(unit.security_deposit)}
            </Text>
          </View>
        </View>

        <View style={styles.unitDetailsRow}>
          <View style={styles.unitDetailItem}>
            <Ionicons name="construct" size={16} color={colors.textSecondary} />
            <Text style={styles.unitDetailLabel}>Maintenance Charge</Text>
            <Text style={styles.unitDetailValue}>
              {formatCurrency(unit.maintenance_charge)}
            </Text>
          </View>

          <View style={styles.unitDetailItem}>
            <Ionicons name="calendar" size={16} color={colors.textSecondary} />
            <Text style={styles.unitDetailLabel}>Rent Due Date</Text>
            <Text style={styles.unitDetailValue}>
              {formatOrdinal(unit.rent_due_date)} of month
            </Text>
          </View>
        </View>

        {unit.description && (
          <View style={styles.unitDescriptionContainer}>
            <Text style={styles.unitDescriptionLabel}>Description</Text>
            <Text style={styles.unitDescriptionText}>{unit.description}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.unitActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditUnit(unit)}
          >
            <Ionicons name="create" size={20} color={colors.primary} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          {unit.status === "occupied" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRemoveTenant(unit)}
            >
              <Ionicons name="person-remove" size={20} color={colors.warning} />
              <Text style={styles.actionText}>Remove</Text>
            </TouchableOpacity>
          )}

          {unit.status === "occupied" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate("OwnerTenantDocuments", { unitId: unit.id })
              }
            >
              <Ionicons name="document-text" size={20} color={colors.accent} />
              <Text style={styles.actionText}>Documents</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteUnit(unit)}
          >
            <Ionicons name="trash" size={20} color={colors.error} />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GradientCard>
  );

  // Always render the main layout so the property selector modal can open

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
        <Text style={styles.title}>
          {property ? `Units - ${property.name}` : "Unit Management"}
        </Text>
        {property ? (
          <TouchableOpacity style={styles.addButton} onPress={handleAddUnit}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowPropertySelector(true)}
          >
            <Ionicons name="business" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
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
              <TouchableOpacity onPress={loadUnits} style={styles.retryButton}>
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
              <Text style={styles.loadingText}>Loading units...</Text>
            </View>
          </GradientCard>
        )}

        {/* No Property Selected */}
        {!property && !loading && !error && (
          <GradientCard variant="surface" style={styles.emptyCard}>
            <Ionicons name="business" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Select a Property</Text>
            <Text style={styles.emptyDescription}>
              Choose a property to manage its units and tenants.
            </Text>
            <GradientButton
              title="Select Property"
              onPress={() => setShowPropertySelector(true)}
              style={styles.addUnitButton}
            />
          </GradientCard>
        )}

        {/* Units List */}
        {property && !loading && units.length === 0 && !error && (
          <GradientCard variant="surface" style={styles.emptyCard}>
            <Ionicons name="home" size={48} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Units Found</Text>
            <Text style={styles.emptyDescription}>
              Add your first rental unit to start managing tenants.
            </Text>
            <GradientButton
              title="Add Unit"
              onPress={handleAddUnit}
              style={styles.addUnitButton}
            />
          </GradientCard>
        )}

        {property && units.map(renderUnitCard)}
      </ScrollView>

      {/* Add/Edit Unit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
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
              {editingUnit ? "Edit Unit" : "Add Unit"}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <GradientCard variant="surface" style={styles.formCard}>
              <Text style={styles.inputLabel}>Unit Number *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.unit_number}
                onChangeText={(text) =>
                  setFormData({ ...formData, unit_number: text })
                }
                placeholder="e.g., A-101, B-202"
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.inputLabel}>Unit Type *</Text>
              <View style={styles.typeSelector}>
                {UNIT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      formData.unit_type === type.value &&
                        styles.typeOptionSelected,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, unit_type: type.value })
                    }
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        formData.unit_type === type.value &&
                          styles.typeOptionTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Rent Amount (₹) *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.rent_amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, rent_amount: text })
                }
                placeholder="Enter monthly rent"
                placeholderTextColor={colors.textLight}
                keyboardType="numeric"
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Security Deposit (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.security_deposit}
                    onChangeText={(text) =>
                      setFormData({ ...formData, security_deposit: text })
                    }
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Maintenance (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.maintenance_charge}
                    onChangeText={(text) =>
                      setFormData({ ...formData, maintenance_charge: text })
                    }
                    placeholder="0"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Rent Due Date</Text>
                  <TextInput
                    style={styles.textInput}
                    value={
                      formData.rent_due_date
                        ? formData.rent_due_date.toString()
                        : ""
                    }
                    onChangeText={(text) => {
                      const value = text.trim();
                      if (value === "") {
                        setFormData({
                          ...formData,
                          rent_due_date: "",
                        });
                      } else {
                        const numValue = parseInt(value);
                        if (
                          !isNaN(numValue) &&
                          numValue >= 1 &&
                          numValue <= 31
                        ) {
                          setFormData({
                            ...formData,
                            rent_due_date: numValue,
                          });
                        }
                      }
                    }}
                    placeholder="Enter day (1-31)"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Area (sq ft)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={formData.area_sqft}
                    onChangeText={(text) =>
                      setFormData({ ...formData, area_sqft: text })
                    }
                    placeholder="Optional"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
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
                placeholder="Enter unit description (optional)"
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
                maxLength={100}
              />
              <Text style={styles.characterCount}>
                {formData.description.length}/100 characters
              </Text>

              {/* Maintenance Contacts Section */}
              <View style={styles.maintenanceSection}>
                <Text style={styles.inputLabel}>
                  Maintenance Contacts (Optional)
                </Text>
                <Text style={styles.maintenanceSubtitle}>
                  Add maintenance contacts for this property. Tenants will be
                  able to contact these services.
                </Text>

                {Object.keys(maintenanceContacts).length === 0 ? (
                  <View style={styles.emptyMaintenanceContainer}>
                    <Ionicons
                      name="construct"
                      size={24}
                      color={colors.textLight}
                    />
                    <Text style={styles.emptyMaintenanceText}>
                      No maintenance contacts added
                    </Text>
                  </View>
                ) : (
                  <View style={styles.maintenanceContactsList}>
                    {Object.entries(maintenanceContacts).map(
                      ([serviceType, contact]) => (
                        <View
                          key={serviceType}
                          style={styles.maintenanceContactItem}
                        >
                          <View style={styles.maintenanceContactInfo}>
                            <Text style={styles.maintenanceContactName}>
                              {contact.name}
                            </Text>
                            <Text style={styles.maintenanceContactService}>
                              {SERVICE_TYPES.find(
                                (s) => s.value === serviceType
                              )?.label || serviceType}
                            </Text>
                            <Text style={styles.maintenanceContactPhone}>
                              {contact.phone}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteMaintenanceButton}
                            onPress={() =>
                              handleDeleteMaintenanceContact(serviceType)
                            }
                          >
                            <Ionicons
                              name="trash"
                              size={16}
                              color={colors.error}
                            />
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.addMaintenanceButton}
                  onPress={handleAddMaintenanceContact}
                >
                  <Ionicons name="add" size={20} color={colors.primary} />
                  <Text style={styles.addMaintenanceText}>
                    Add Maintenance Contact
                  </Text>
                </TouchableOpacity>
              </View>
            </GradientCard>
          </ScrollView>

          <View style={styles.modalFooter}>
            <GradientButton
              title={editingUnit ? "Update Unit" : "Add Unit"}
              onPress={handleSaveUnit}
              loading={loading}
            />
          </View>
        </LinearGradient>
      </Modal>

      {/* Add Maintenance Contact Modal */}
      <Modal
        visible={showMaintenanceModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <LinearGradient
          colors={gradients.background}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMaintenanceModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Maintenance Contact</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <GradientCard variant="surface" style={styles.formCard}>
              <Text style={styles.inputLabel}>Service Type</Text>
              <View style={styles.typeSelector}>
                {SERVICE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      maintenanceFormData.service_type === type.value &&
                        styles.typeOptionSelected,
                    ]}
                    onPress={() =>
                      setMaintenanceFormData({
                        ...maintenanceFormData,
                        service_type: type.value,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        maintenanceFormData.service_type === type.value &&
                          styles.typeOptionTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Contact Name</Text>
              <TextInput
                style={styles.textInput}
                value={maintenanceFormData.name}
                onChangeText={(text) =>
                  setMaintenanceFormData({
                    ...maintenanceFormData,
                    name: text,
                  })
                }
                placeholder="Enter contact name"
                placeholderTextColor={colors.textLight}
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={maintenanceFormData.phone}
                onChangeText={(text) =>
                  setMaintenanceFormData({
                    ...maintenanceFormData,
                    phone: text,
                  })
                }
                placeholder="Enter phone number"
                placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />
            </GradientCard>
          </ScrollView>

          <View style={styles.modalFooter}>
            <GradientButton
              title="Add Contact"
              onPress={handleSaveMaintenanceContact}
            />
          </View>
        </LinearGradient>
      </Modal>

      {/* Property Selector Modal */}
      <Modal
        visible={showPropertySelector}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <LinearGradient
          colors={gradients.background}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Property</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <GradientCard variant="surface" style={styles.formCard}>
              <Text style={styles.inputLabel}>
                Choose a property to manage units
              </Text>
              <Text style={styles.maintenanceSubtitle}>
                Select the property for which you want to manage units.
              </Text>

              {properties.map((prop) => (
                <TouchableOpacity
                  key={prop.id}
                  style={styles.propertyOption}
                  onPress={() => handlePropertySelect(prop)}
                >
                  <View style={styles.propertyInfo}>
                    <Text style={styles.propertyName}>{prop.name}</Text>
                    <Text style={styles.propertyAddress}>
                      {prop.address}, {prop.city}
                    </Text>
                    <Text style={styles.propertyUnits}>
                      {prop.total_units || 0} units • {prop.occupied_units || 0} occupied
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </GradientCard>
          </ScrollView>
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
  errorText: {
    ...typography.body1,
    color: colors.error,
    textAlign: "center",
    marginBottom: spacing.lg,
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
  addUnitButton: {
    marginTop: spacing.md,
  },
  unitCard: {
    marginBottom: spacing.lg,
  },
  unitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  unitInfo: {
    flex: 1,
  },
  unitNumber: {
    ...typography.h6,
    color: colors.text,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  unitType: {
    ...typography.body2,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  unitRent: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
  },
  unitStatus: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    ...typography.caption,
    marginLeft: spacing.xs,
    textTransform: "capitalize",
  },
  unitArea: {
    ...typography.body2,
    color: colors.textLight,
    marginBottom: spacing.md,
  },
  rentStatusSection: {
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rentStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  rentStatusTitle: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
  },
  rentStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  rentStatusText: {
    ...typography.caption,
    fontWeight: "600",
  },
  tenantInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  tenantLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  tenantName: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
    marginLeft: spacing.xs,
  },
  tenantKeyInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
    flexWrap: "wrap",
  },
  tenantKeyLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  tenantKeyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: spacing.xs,
  },
  tenantKeyValue: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "600",
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  copyButton: {
    padding: spacing.xs,
    borderRadius: 4,
    backgroundColor: colors.primary + "20",
  },
  tenantKeyExpiry: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginTop: spacing.xs,
    width: "100%",
  },
  tenantKeyStatusContainer: {
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  tenantKeyStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.xs,
    alignSelf: "flex-start",
  },
  tenantKeyStatusText: {
    ...typography.caption,
    fontWeight: "600",
  },
  pendingAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  pendingAmountLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  pendingAmountValue: {
    ...typography.body2,
    color: colors.error,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  paidStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  paidStatusText: {
    ...typography.body2,
    color: colors.success,
    fontWeight: "500",
    marginLeft: spacing.xs,
  },
  unitDetailsSection: {
    marginVertical: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  unitDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  unitDetailItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  unitDetailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  unitDetailValue: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
    textAlign: "center",
  },
  unitDescriptionContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  unitDescriptionLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  unitDescriptionText: {
    ...typography.body2,
    color: colors.text,
    lineHeight: 20,
  },
  unitActions: {
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
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
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
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body1,
    color: colors.text,
    marginTop: spacing.md,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  // Maintenance Contacts Styles
  maintenanceSection: {
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    fontWeight: "600",
  },
  addMaintenanceButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary + "20",
    borderRadius: 20,
  },
  addMaintenanceText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "600",
    marginLeft: spacing.xs,
  },
  emptyMaintenanceCard: {
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyMaintenanceTitle: {
    ...typography.h6,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMaintenanceDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  maintenanceCard: {
    padding: spacing.md,
  },
  maintenanceContactItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    marginBottom: spacing.xs,
  },
  maintenanceContactDescription: {
    ...typography.body2,
    color: colors.textLight,
    fontStyle: "italic",
  },
  deleteMaintenanceButton: {
    padding: spacing.sm,
  },
  modalAddButton: {
    padding: spacing.sm,
  },
  addContactButton: {
    marginTop: spacing.md,
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
  // Property Selector Styles
  propertyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  propertyInfo: {
    flex: 1,
  },
  propertyName: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  propertyAddress: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  propertyUnits: {
    ...typography.caption,
    color: colors.textLight,
  },
});

export default UnitManagementScreen;
