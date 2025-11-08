import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientCard from "../components/GradientCard";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import DataService from "../services/dataService";

const ContactMaintenanceScreen = ({ navigation }) => {
  const [maintenanceContacts, setMaintenanceContacts] = useState([]);
  // Emergency contact removed per requirements
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaintenanceContacts();
  }, []);

  const loadMaintenanceContacts = async () => {
    try {
      setLoading(true);

      // Try to get maintenance contacts from tenant dashboard
      const response = await DataService.getTenantDashboard();

      if (response.success && response.data.current_property) {
        const property = response.data.current_property;
        const maintenanceContactsData = property.maintenance_contacts || {};

        // Convert JSON data to frontend format
        const contacts = Object.entries(maintenanceContactsData).map(
          ([serviceType, contact]) => ({
            id: serviceType,
            name: contact.name,
            service: getServiceDisplayName(serviceType),
            phone: contact.phone,
            description: `${getServiceDisplayName(serviceType)} services`,
            icon: getServiceIcon(serviceType),
            is_emergency: false,
          })
        );

        setMaintenanceContacts(contacts);

        // Emergency contact removed
      } else {
        // No maintenance contacts available from property
        console.log("No maintenance contacts found for this property");
        setMaintenanceContacts([]);
      }
    } catch (error) {
      console.error("Error loading maintenance contacts:", error);
      Alert.alert("Error", "Failed to load maintenance contacts");
    } finally {
      setLoading(false);
    }
  };

  const getServiceDisplayName = (serviceType) => {
    const serviceMap = {
      plumber: "Plumber",
      electrician: "Electrician",
      carpenter: "Carpenter",
      ac_technician: "AC Technician",
      housekeeping: "Housekeeping",
      security: "Security",
      other: "Other",
    };
    return serviceMap[serviceType] || serviceType;
  };

  const getServiceIcon = (serviceType) => {
    const iconMap = {
      plumber: "water",
      electrician: "flash",
      carpenter: "hammer",
      ac_technician: "snow",
      housekeeping: "home",
      security: "shield-checkmark",
      other: "construct",
    };
    return iconMap[serviceType] || "construct";
  };

  const handleCall = (phone) => {
    const phoneNumber = phone.replace(/\s+/g, "");
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleWhatsApp = (phone, name) => {
    const phoneNumber = phone.replace(/\s+/g, "");
    const message = `Hi, I need ${name} services. Please contact me.`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
      message
    )}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "WhatsApp is not installed on this device");
        }
      })
      .catch((err) => {
        console.error("Error opening WhatsApp:", err);
        Alert.alert("Error", "Failed to open WhatsApp");
      });
  };

  const getServiceColor = (service) => {
    const colors = {
      Plumber: "#2196F3",
      Electrician: "#FF9800",
      Carpenter: "#795548",
      "AC Technician": "#00BCD4",
      Housekeeping: "#4CAF50",
      Security: "#F44336",
    };
    return colors[service] || colors.primary;
  };

  const renderContactCard = (contact) => (
    <GradientCard key={contact.id} variant="surface" style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactInfo}>
          <View style={styles.serviceIconContainer}>
            <Ionicons
              name={contact.icon}
              size={24}
              color={getServiceColor(contact.service)}
            />
          </View>
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactService}>{contact.service}</Text>
            <Text style={styles.contactDescription}>{contact.description}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contactActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.success }]}
          onPress={() => handleCall(contact.phone)}
        >
          <Ionicons name="call" size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#25D366" }]}
          onPress={() => handleWhatsApp(contact.phone, contact.name)}
        >
          <Ionicons name="logo-whatsapp" size={20} color={colors.white} />
          <Text style={styles.actionButtonText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </GradientCard>
  );

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
        <Text style={styles.title}>Contact Maintenance</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={Platform.OS === "android"}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        {/* Info Card */}
        <GradientCard variant="primary" style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle"
              size={24}
              color={colors.white}
            />
            <Text style={styles.infoTitle}>Maintenance Services</Text>
          </View>
          <Text style={styles.infoText}>
            Contact the maintenance staff for any repairs or issues in your
            unit. All services are available 24/7 for emergencies.
          </Text>
        </GradientCard>

        {/* Emergency Contact removed */}

        {/* Maintenance Contacts */}
        <View style={styles.contactsContainer}>
          <Text style={styles.sectionTitle}>Available Services</Text>
          {maintenanceContacts.map(renderContactCard)}
        </View>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    ...shadows.sm,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  infoTitle: {
    ...typography.h6,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  infoText: {
    ...typography.body2,
    color: colors.white,
    opacity: 0.9,
    lineHeight: 20,
  },
  emergencyCard: {
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emergencyTitle: {
    ...typography.h6,
    color: colors.text,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  emergencyText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emergencyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  emergencyButtonText: {
    ...typography.body1,
    color: colors.white,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  contactsContainer: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: "600",
  },
  contactCard: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  contactHeader: {
    marginBottom: spacing.md,
  },
  contactInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    ...typography.h6,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  contactService: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  contactDescription: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  contactActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
  },
  actionButtonText: {
    ...typography.body2,
    color: colors.white,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
});

export default ContactMaintenanceScreen;
