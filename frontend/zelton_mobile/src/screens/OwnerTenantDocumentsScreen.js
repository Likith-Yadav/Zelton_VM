import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import GradientCard from "../components/GradientCard";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatDate } from "../utils/helpers";
import DataService from "../services/dataService";

const DOCUMENT_TYPE_LABELS = {
  aadhaar: "Aadhaar Card",
  rental_agreement: "Rental Agreement",
};

const OwnerTenantDocumentsScreen = ({ navigation, route }) => {
  const { unitId } = route.params;
  const [loading, setLoading] = useState(false);
  const [unitInfo, setUnitInfo] = useState(null);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    loadTenantDocuments();
  }, [unitId]);

  const loadTenantDocuments = async () => {
    try {
      setLoading(true);
      const response = await DataService.getTenantDocumentsByUnit(unitId);
      if (response.success) {
        // Handle nested response structure for owner documents
        const responseData = response.data?.data || response.data;
        setUnitInfo(responseData.unit);
        setTenantInfo(responseData.tenant);
        // Ensure documents is always an array
        setDocuments(
          Array.isArray(responseData.documents) ? responseData.documents : []
        );
      } else {
        console.error("Error loading tenant documents:", response.error);
        // Don't show alert for empty documents, just set empty arrays
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error loading tenant documents:", error);
      // Don't show alert for network errors, just set empty arrays
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      console.log("Downloading document:", document);
      const response = await DataService.downloadTenantDocumentAsOwner(
        document.id
      );
      console.log("Download response:", response);
      console.log("Response data:", JSON.stringify(response.data, null, 2));
      console.log("Response success:", response.success);
      console.log("Response data success:", response.data?.success);

      if (response.success && response.data.success) {
        // Handle response structure - backend returns flat structure
        const downloadUrl = response.data.download_url;
        const fileName = response.data.file_name;
        const debugInfo = response.data.debug_info;

        console.log("Download URL:", downloadUrl);
        console.log("File name:", fileName);
        console.log("Debug info:", debugInfo);

        if (!downloadUrl || !fileName) {
          Alert.alert("Error", `Invalid download response from server. URL: ${downloadUrl}, File: ${fileName}`);
          return;
        }

        // Use FileSystem to download and save the file
        const fileUri = FileSystem.documentDirectory + fileName;
        console.log("File URI:", fileUri);

        const downloadResult = await FileSystem.downloadAsync(
          downloadUrl,
          fileUri
        );

        console.log("Download result:", downloadResult);

        if (downloadResult.status === 200) {
          // Ask user if they want to open the document
          Alert.alert(
            "Download Complete",
            "Document downloaded successfully. Would you like to open it with another app?",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Open",
                onPress: async () => {
                  try {
                    // Check if sharing is available
                    const isAvailable = await Sharing.isAvailableAsync();
                    if (isAvailable) {
                      await Sharing.shareAsync(fileUri, {
                        mimeType: getMimeType(fileName),
                        dialogTitle: `Open ${fileName}`,
                      });
                    } else {
                      Alert.alert(
                        "Error",
                        "Sharing is not available on this device"
                      );
                    }
                  } catch (error) {
                    console.error("Error opening document:", error);
                    Alert.alert("Error", "Failed to open document");
                  }
                },
              },
            ]
          );
        } else {
          console.error("Download failed with status:", downloadResult.status);
          Alert.alert("Error", `Failed to download document. Status: ${downloadResult.status}`);
        }
      } else {
        const errorMsg = response.error || response.data?.error || "Unknown error";
        console.error("Download API error:", errorMsg);
        Alert.alert("Error", errorMsg);
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      console.error("Error details:", error.message, error.stack);
      Alert.alert("Error", `Failed to download document: ${error.message}`);
    }
  };

  const getDocumentTypeLabel = (type) => {
    return DOCUMENT_TYPE_LABELS[type] || type;
  };

  // Helper function to get MIME type from file extension
  const getMimeType = (fileName) => {
    const extension = fileName.toLowerCase().split(".").pop();
    switch (extension) {
      case "pdf":
        return "application/pdf";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "doc":
        return "application/msword";
      case "docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      default:
        return "application/octet-stream";
    }
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case "aadhaar":
        return "card";
      case "rental_agreement":
        return "document-text";
      default:
        return "document";
    }
  };

  const renderDocumentCard = (document) => (
    <GradientCard
      key={document.id}
      variant="surface"
      style={styles.documentCard}
    >
      <View style={styles.documentHeader}>
        <View style={styles.documentTypeInfo}>
          <Ionicons
            name={getDocumentIcon(document.document_type)}
            size={24}
            color={colors.primary}
          />
          <View style={styles.documentTypeDetails}>
            <Text style={styles.documentTypeName}>
              {getDocumentTypeLabel(document.document_type)}
            </Text>
            {document.is_required && (
              <Text style={styles.requiredBadge}>Required</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownloadDocument(document)}
        >
          <Ionicons name="download" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.documentDetails}>
        <Text style={styles.documentFileName}>{document.file_name}</Text>
        <Text style={styles.documentUploadDate}>
          Uploaded: {formatDate(document.uploaded_at)}
        </Text>
        <Text style={styles.documentFileSize}>
          Size: {document.file_size_mb} MB
        </Text>
      </View>
    </GradientCard>
  );

  if (loading) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Tenant Documents</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading documents...</Text>
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
        <Text style={styles.title}>Tenant Documents</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Unit and Tenant Info */}
        {unitInfo && tenantInfo && (
          <GradientCard variant="surface" style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="home" size={24} color={colors.primary} />
              <Text style={styles.infoTitle}>Unit Information</Text>
            </View>
            <View style={styles.infoDetails}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Unit:</Text>
                <Text style={styles.infoValue}>{unitInfo.unit_number}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Property:</Text>
                <Text style={styles.infoValue}>{unitInfo.property_name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoHeader}>
              <Ionicons name="person" size={24} color={colors.accent} />
              <Text style={styles.infoTitle}>Tenant Information</Text>
            </View>
            <View style={styles.infoDetails}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{tenantInfo.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{tenantInfo.email}</Text>
              </View>
            </View>
          </GradientCard>
        )}

        {/* Documents List */}
        <View style={styles.documentsContainer}>
          <Text style={styles.sectionTitle}>Uploaded Documents</Text>

          {documents.length === 0 ? (
            <GradientCard variant="surface" style={styles.emptyCard}>
              <Ionicons
                name="document-outline"
                size={48}
                color={colors.textLight}
              />
              <Text style={styles.emptyTitle}>No Documents Uploaded</Text>
              <Text style={styles.emptyDescription}>
                The tenant has not uploaded any documents yet.
              </Text>
            </GradientCard>
          ) : (
            documents.map(renderDocumentCard)
          )}
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
  infoCard: {
    marginBottom: spacing.lg,
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
  infoDetails: {
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  infoLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  documentsContainer: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: "600",
  },
  documentCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  documentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  documentTypeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  documentTypeDetails: {
    marginLeft: spacing.sm,
  },
  documentTypeName: {
    ...typography.h6,
    color: colors.text,
    fontWeight: "600",
  },
  requiredBadge: {
    ...typography.body2,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  documentDetails: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  documentFileName: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  documentUploadDate: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  documentFileSize: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  emptyDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});

export default OwnerTenantDocumentsScreen;
