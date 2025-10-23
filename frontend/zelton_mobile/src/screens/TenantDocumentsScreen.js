import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import GradientCard from "../components/GradientCard";
import GradientButton from "../components/GradientButton";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatDate } from "../utils/helpers";
import DataService from "../services/dataService";

const DOCUMENT_TYPES = [
  { key: "aadhaar", label: "Aadhaar Card", required: true },
  { key: "rental_agreement", label: "Rental Agreement", required: true },
];

const TenantDocumentsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  // Refresh documents when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadDocuments();
    }, [])
  );

  const loadDocuments = async () => {
    try {
      setLoading(true);
      console.log("Loading documents for documents screen...");
      const response = await DataService.getTenantDocuments();
      console.log("Documents response:", response);
      if (response.success) {
        // Handle nested response structure: response.data.data.data (double nested)
        let documentsData = [];
        if (response.data?.data?.data) {
          documentsData = response.data.data.data;
        } else if (response.data?.data) {
          documentsData = response.data.data;
        } else if (Array.isArray(response.data)) {
          documentsData = response.data;
        }

        setDocuments(Array.isArray(documentsData) ? documentsData : []);
        console.log(
          "Documents loaded successfully:",
          documentsData?.length || 0,
          "documents"
        );
      } else {
        console.error("Error loading documents:", response.error);
        // Don't show alert for empty documents, just set empty array
        setDocuments([]);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      // Don't show alert for network errors, just set empty array
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilePicker = async () => {
    try {
      console.log("File picker button pressed");
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });

      console.log("Document picker result:", result);

      if (result.canceled) {
        console.log("File picker was canceled");
        return;
      }

      const file = result.assets[0];
      console.log("Selected file:", file);

      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        Alert.alert("Error", "File size cannot exceed 5MB");
        return;
      }

      setSelectedFile(file);
      console.log("File selected:", {
        name: file.name,
        size: file.size,
        type: file.mimeType,
        uri: file.uri,
      });
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert(
        "Error", 
        "Failed to pick file. Please try again.\n\nMake sure you have the latest version of the app and proper permissions.",
        [
          { text: "OK", style: "default" },
          { 
            text: "Try Again", 
            style: "default",
            onPress: () => handleFilePicker()
          }
        ]
      );
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedFile) {
      Alert.alert("Error", "Please select a file first");
      return;
    }

    if (!selectedDocumentType) {
      Alert.alert("Error", "Please select a document type first");
      return;
    }

    try {
      setUploading(true);

      // Create FormData for file upload with proper React Native format
      const formData = new FormData();
      formData.append("document_type", selectedDocumentType);

      // For React Native, we need to append the file object directly
      formData.append("document_file", {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || "application/octet-stream",
        name: selectedFile.name || "document",
      });

      console.log("Uploading document:", {
        document_type: selectedDocumentType,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        file_type: selectedFile.mimeType,
      });

      const response = await DataService.uploadTenantDocument(formData);

      if (response.success) {
        Alert.alert("Success", "Document uploaded successfully");
        setShowUploadModal(false);
        setSelectedDocumentType(null);
        setSelectedFile(null);
        loadDocuments(); // Refresh documents list
      } else {
        Alert.alert("Error", response.error);
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      Alert.alert("Error", "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      console.log("Downloading document:", document);
      const response = await DataService.downloadTenantDocument(document.id);
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
          Alert.alert("Error", `Failed to download document. Status: ${downloadResult.status}`);
        }
      } else {
        Alert.alert("Error", response.error || "Failed to get download URL");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      Alert.alert("Error", `Failed to download document: ${error.message}`);
    }
  };

  const handleDeleteDocument = (document) => {
    Alert.alert(
      "Delete Document",
      `Are you sure you want to delete ${document.document_type}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await DataService.deleteTenantDocument(
                document.id
              );
              if (response.success) {
                Alert.alert("Success", "Document deleted successfully");
                loadDocuments(); // Refresh documents list
              } else {
                Alert.alert("Error", response.error);
              }
            } catch (error) {
              console.error("Error deleting document:", error);
              Alert.alert("Error", "Failed to delete document");
            }
          },
        },
      ]
    );
  };

  const getDocumentTypeLabel = (type) => {
    const docType = DOCUMENT_TYPES.find((dt) => dt.key === type);
    return docType ? docType.label : type;
  };

  const isDocumentUploaded = (type) => {
    return documents.some((doc) => doc.document_type === type);
  };

  const getUploadedDocument = (type) => {
    return documents.find((doc) => doc.document_type === type);
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

  const renderUploadModal = () => (
    <Modal
      visible={showUploadModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowUploadModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload Document</Text>
            <TouchableOpacity
              onPress={() => setShowUploadModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.documentTypeSelector}>
              <Text style={styles.selectorTitle}>Select Document Type</Text>
              {DOCUMENT_TYPES.map((docType) => (
                <TouchableOpacity
                  key={docType.key}
                  style={[
                    styles.documentTypeOption,
                    selectedDocumentType === docType.key &&
                      styles.selectedDocumentType,
                  ]}
                  onPress={() => setSelectedDocumentType(docType.key)}
                >
                  <View style={styles.documentTypeInfo}>
                    <Text style={styles.documentTypeLabel}>
                      {docType.label}
                    </Text>
                    {docType.required && (
                      <Text style={styles.requiredText}>Required</Text>
                    )}
                  </View>
                  <Ionicons
                    name={
                      selectedDocumentType === docType.key
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* File Selection Section */}
            <View style={styles.fileSelectionSection}>
              <Text style={styles.fileSelectionTitle}>Select File</Text>
              <TouchableOpacity
                style={styles.filePickerButton}
                onPress={handleFilePicker}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="document-attach"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.filePickerText}>
                  {selectedFile ? selectedFile.name : "Choose File"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
              {selectedFile && (
                <View style={styles.fileInfo}>
                  <Text style={styles.fileInfoText}>
                    Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </Text>
                  <Text style={styles.fileInfoText}>
                    Type: {selectedFile.mimeType}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <GradientButton
              title="Cancel"
              onPress={() => {
                setShowUploadModal(false);
                setSelectedDocumentType(null);
                setSelectedFile(null);
              }}
              variant="secondary"
              style={styles.cancelButton}
            />
            <GradientButton
              title={uploading ? "Uploading..." : "Upload"}
              onPress={handleUploadDocument}
              disabled={!selectedDocumentType || !selectedFile || uploading}
              style={styles.uploadButton}
              icon={uploading ? undefined : "arrow-up"}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
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
        <Text style={styles.title}>Documents</Text>

      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Important Notice */}
        {documents.length === 0 && (
          <GradientCard variant="surface" style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Ionicons name="warning" size={24} color={colors.warning} />
              <Text style={styles.noticeTitle}>Important Notice</Text>
            </View>
            <Text style={styles.noticeText}>
              Please upload your required documents (Aadhaar Card and Rental
              Agreement) to complete your profile. These documents are essential
              for verification and compliance purposes.
            </Text>
          </GradientCard>
        )}

        {/* Document Types */}
        <View style={styles.documentTypesContainer}>
          <Text style={styles.sectionTitle}>Document Types</Text>
          {DOCUMENT_TYPES.map((docType) => {
            const isUploaded = isDocumentUploaded(docType.key);
            const uploadedDoc = getUploadedDocument(docType.key);

            return (
              <GradientCard
                key={docType.key}
                variant="surface"
                style={styles.documentTypeCard}
              >
                <View style={styles.documentTypeHeader}>
                  <View style={styles.documentTypeInfo}>
                    <Text style={styles.documentTypeName}>{docType.label}</Text>
                    {docType.required && (
                      <Text style={styles.requiredBadge}>Required</Text>
                    )}
                  </View>
                  <View style={styles.documentStatus}>
                    {isUploaded ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.success}
                      />
                    ) : (
                      <Ionicons
                        name="ellipse-outline"
                        size={24}
                        color={colors.warning}
                      />
                    )}
                  </View>
                </View>

                {isUploaded && uploadedDoc && (
                  <View style={styles.documentDetails}>
                    <Text style={styles.documentFileName}>
                      {uploadedDoc.file_name}
                    </Text>
                    <Text style={styles.documentUploadDate}>
                      Uploaded: {formatDate(uploadedDoc.uploaded_at)}
                    </Text>
                    <Text style={styles.documentFileSize}>
                      Size: {uploadedDoc.file_size_mb} MB
                    </Text>
                  </View>
                )}

                <View style={styles.documentActions}>
                  {isUploaded ? (
                    <>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDownloadDocument(uploadedDoc)}
                      >
                        <Ionicons
                          name="download"
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={styles.actionButtonText}>Download</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteDocument(uploadedDoc)}
                      >
                        <Ionicons name="trash" size={20} color={colors.error} />
                        <Text
                          style={[
                            styles.actionButtonText,
                            { color: colors.error },
                          ]}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadDocumentButton}
                      onPress={() => {
                        setSelectedDocumentType(docType.key);
                        setShowUploadModal(true);
                      }}
                    >
                      <Ionicons
                        name="cloud-upload"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={styles.uploadDocumentButtonText}>
                        Upload Document
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </GradientCard>
            );
          })}
        </View>
      </ScrollView>

      {renderUploadModal()}
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
  uploadButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
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
  documentTypesContainer: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: "600",
  },
  documentTypeCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  documentTypeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  documentTypeInfo: {
    flex: 1,
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
  documentStatus: {
    alignItems: "center",
  },
  documentDetails: {
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  documentFileName: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
  },
  documentUploadDate: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  documentFileSize: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  documentActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: spacing.xs,
    justifyContent: "center",
  },
  deleteButton: {
    backgroundColor: colors.error + "10",
  },
  actionButtonText: {
    ...typography.body2,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: "500",
  },
  uploadDocumentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.primary + "10",
    borderRadius: 8,
    width: "100%",
  },
  uploadDocumentButtonText: {
    ...typography.body1,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.md,
    width: "90%",
    maxHeight: "90%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text,
    fontWeight: "bold",
  },
  closeButton: {
    padding: spacing.sm,
  },
  documentTypeSelector: {
    marginBottom: spacing.md,
  },
  selectorTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  documentTypeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  selectedDocumentType: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "10",
  },
  documentTypeLabel: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  requiredText: {
    ...typography.body2,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: "center",
  },
  cancelButton: {
    flex: 1,
    marginRight: spacing.sm,
    minHeight: 48,
  },
  uploadButton: {
    flex: 1,
    marginLeft: spacing.sm,
    minHeight: 48,
  },
  noticeCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  noticeTitle: {
    ...typography.h6,
    color: colors.warning,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  noticeText: {
    ...typography.body2,
    color: colors.text,
    lineHeight: 20,
  },
  fileSelectionSection: {
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  fileSelectionTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.primaryLight + "20", // Semi-transparent primary color
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: "solid", // Changed from dashed to solid
    minHeight: 50,
    ...shadows.md,
  },
  filePickerText: {
    ...typography.body1,
    color: colors.primary,
    marginLeft: spacing.sm,
    flex: 1,
    fontWeight: "600",
  },
  fileInfo: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
  },
  fileInfoText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  modalScrollView: {
    flex: 1,
    marginBottom: spacing.sm,
  },
  modalScrollContent: {
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
});

export default TenantDocumentsScreen;
