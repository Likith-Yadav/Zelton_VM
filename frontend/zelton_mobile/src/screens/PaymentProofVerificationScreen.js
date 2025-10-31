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
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import GradientCard from "../components/GradientCard";
import GradientButton from "../components/GradientButton";
import {
  colors,
  typography,
  spacing,
  gradients,
  shadows,
} from "../theme/theme";
import { formatCurrency, formatDate } from "../utils/helpers";
import { paymentProofAPI } from "../services/api";

const { width } = Dimensions.get("window");

const PaymentProofVerificationScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [allPaymentProofs, setAllPaymentProofs] = useState([]);
  const [paymentProofs, setPaymentProofs] = useState([]);
  const [selectedProof, setSelectedProof] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeFilter, setActiveFilter] = useState("pending"); // pending, verified, rejected, all

  useEffect(() => {
    loadPaymentProofs();
  }, []);

  useEffect(() => {
    filterPaymentProofs();
  }, [activeFilter, allPaymentProofs]);

  const filterPaymentProofs = () => {
    if (activeFilter === "all") {
      setPaymentProofs(allPaymentProofs);
    } else {
      const filtered = allPaymentProofs.filter(
        (proof) => proof.verification_status === activeFilter
      );
      setPaymentProofs(filtered);
    }
  };

  const loadPaymentProofs = async () => {
    try {
      setLoading(true);
      // Load all payment proofs instead of just pending
      const response = await paymentProofAPI.getAllPaymentProofs();
      
      if (response.data) {
        // Handle different response structures
        let proofsData = [];
        if (Array.isArray(response.data)) {
          proofsData = response.data;
        } else if (response.data.results) {
          proofsData = response.data.results;
        } else if (response.data.data) {
          proofsData = response.data.data;
        } else if (response.data.success) {
          proofsData = response.data.pending_payment_proofs || [];
        }
        
        // Sort by upload date (newest first)
        const sortedProofs = proofsData.sort(
          (a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)
        );
        setAllPaymentProofs(sortedProofs);
      } else {
        Alert.alert("Error", response.data.error || "Failed to load payment proofs");
      }
    } catch (error) {
      console.error("Error loading payment proofs:", error);
      Alert.alert("Error", "Failed to load payment proofs");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (proofId, status) => {
    try {
      setVerifying(true);
      
      const response = await paymentProofAPI.verifyPaymentProof(
        proofId,
        status,
        verificationNotes
      );

      if (response.data.success) {
        Alert.alert(
          "Success",
          status === "verified" 
            ? "Payment proof verified successfully! Payment record has been created."
            : "Payment proof rejected.",
          [
            {
              text: "OK",
              onPress: () => {
                setShowModal(false);
                setVerificationNotes("");
                setSelectedStatus("");
                setSelectedProof(null);
                loadPaymentProofs(); // Refresh the list
              },
            },
          ]
        );
      } else {
        throw new Error(response.data.error || "Verification failed");
      }
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert(
        "Verification Failed",
        error.message || "Failed to verify payment proof. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  const openVerificationModal = (proof) => {
    setSelectedProof(proof);
    setVerificationNotes("");
    setSelectedStatus("");
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "verified":
        return colors.success;
      case "rejected":
        return colors.error;
      case "pending":
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "verified":
        return "checkmark-circle";
      case "rejected":
        return "close-circle";
      case "pending":
        return "time";
      default:
        return "help-circle";
    }
  };

  const renderVerificationModal = () => {
    const isPending = selectedProof?.verification_status === "pending";
    const isVerified = selectedProof?.verification_status === "verified";
    const isRejected = selectedProof?.verification_status === "rejected";

    return (
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isPending ? "Verify Payment Proof" : "Payment Proof Details"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedProof && (
              <ScrollView style={styles.modalBody}>
                {/* Status Badge for non-pending proofs */}
                {!isPending && (
                  <View
                    style={[
                      styles.statusBanner,
                      {
                        backgroundColor: isVerified
                          ? colors.success + "15"
                          : colors.error + "15",
                      },
                    ]}
                  >
                    <Ionicons
                      name={isVerified ? "checkmark-circle" : "close-circle"}
                      size={24}
                      color={isVerified ? colors.success : colors.error}
                    />
                    <View style={styles.statusBannerText}>
                      <Text
                        style={[
                          styles.statusBannerTitle,
                          { color: isVerified ? colors.success : colors.error },
                        ]}
                      >
                        {isVerified ? "Verified" : "Rejected"}
                      </Text>
                      {selectedProof.verified_at && (
                        <Text style={styles.statusBannerDate}>
                          {formatDate(selectedProof.verified_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Proof Details */}
                <View style={styles.proofDetails}>
                  <Text style={styles.proofTitle}>Payment Details</Text>
                  
                  <View style={styles.proofItem}>
                    <Text style={styles.proofLabel}>Tenant:</Text>
                    <Text style={styles.proofValue}>{selectedProof.tenant_name}</Text>
                  </View>
                  
                  <View style={styles.proofItem}>
                    <Text style={styles.proofLabel}>Unit:</Text>
                    <Text style={styles.proofValue}>{selectedProof.unit_number}</Text>
                  </View>
                  
                  <View style={styles.proofItem}>
                    <Text style={styles.proofLabel}>Amount:</Text>
                    <Text style={[styles.proofValue, { color: colors.primary, fontWeight: "bold" }]}>
                      {formatCurrency(selectedProof.amount)}
                    </Text>
                  </View>
                  
                  <View style={styles.proofItem}>
                    <Text style={styles.proofLabel}>Uploaded:</Text>
                    <Text style={styles.proofValue}>
                      {formatDate(selectedProof.uploaded_at)}
                    </Text>
                  </View>

                  {selectedProof.description && (
                    <View style={styles.proofItem}>
                      <Text style={styles.proofLabel}>Description:</Text>
                      <Text style={styles.proofValue}>{selectedProof.description}</Text>
                    </View>
                  )}
                </View>

                {/* Payment Proof Image */}
                <View style={styles.imageSection}>
                  <Text style={styles.imageTitle}>Payment Proof</Text>
                  {selectedProof.payment_proof_image_url && (
                    <Image
                      source={{ uri: selectedProof.payment_proof_image_url }}
                      style={styles.proofImage}
                      resizeMode="contain"
                    />
                  )}
                </View>

                {/* Verification Notes - Read-only for processed proofs */}
                {isPending ? (
                  <View style={styles.notesSection}>
                    <Text style={styles.notesTitle}>Verification Notes</Text>
                    <TextInput
                      style={styles.notesInput}
                      value={verificationNotes}
                      onChangeText={setVerificationNotes}
                      placeholder="Add notes about your verification decision..."
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                ) : (
                  selectedProof.verification_notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.notesTitle}>Verification Notes</Text>
                      <View style={styles.notesReadOnly}>
                        <Text style={styles.notesReadOnlyText}>
                          {selectedProof.verification_notes}
                        </Text>
                      </View>
                    </View>
                  )
                )}

                {/* Action Buttons - Only show for pending proofs */}
                {isPending && (
                  <View style={styles.modalActions}>
                    <GradientButton
                      title="Reject"
                      onPress={() => handleVerify(selectedProof.id, "rejected")}
                      variant="secondary"
                      style={[styles.actionButton, styles.rejectButton]}
                      disabled={verifying}
                    />
                    <GradientButton
                      title={verifying ? "Verifying..." : "Verify"}
                      onPress={() => handleVerify(selectedProof.id, "verified")}
                      style={[styles.actionButton, styles.verifyButton]}
                      disabled={verifying}
                    />
                  </View>
                )}

                {/* Close Button for processed proofs */}
                {!isPending && (
                  <View style={styles.modalActions}>
                    <GradientButton
                      title="Close"
                      onPress={() => setShowModal(false)}
                      style={styles.closeModalButton}
                    />
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading payment proofs...</Text>
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
        <Text style={styles.title}>Payment Proof Verification</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadPaymentProofs}
        >
          <Ionicons name="refresh" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabs}
          >
            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === "pending" && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter("pending")}
            >
              <Ionicons
                name="time"
                size={18}
                color={activeFilter === "pending" ? colors.white : colors.text}
              />
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === "pending" && styles.filterTabTextActive,
                ]}
              >
                Pending
              </Text>
              {allPaymentProofs.filter((p) => p.verification_status === "pending").length > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {allPaymentProofs.filter((p) => p.verification_status === "pending").length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === "verified" && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter("verified")}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={activeFilter === "verified" ? colors.white : colors.text}
              />
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === "verified" && styles.filterTabTextActive,
                ]}
              >
                Verified
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === "rejected" && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter("rejected")}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={activeFilter === "rejected" ? colors.white : colors.text}
              />
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === "rejected" && styles.filterTabTextActive,
                ]}
              >
                Rejected
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === "all" && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter("all")}
            >
              <Ionicons
                name="list"
                size={18}
                color={activeFilter === "all" ? colors.white : colors.text}
              />
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === "all" && styles.filterTabTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Summary Card */}
        <GradientCard variant="primary" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="receipt" size={24} color={colors.white} />
            <Text style={styles.summaryTitle}>
              {activeFilter === "pending" && "Pending Verifications"}
              {activeFilter === "verified" && "Verified Proofs"}
              {activeFilter === "rejected" && "Rejected Proofs"}
              {activeFilter === "all" && "All Payment Proofs"}
            </Text>
          </View>
          <Text style={styles.summaryCount}>{paymentProofs.length}</Text>
          <Text style={styles.summarySubtext}>
            {activeFilter === "pending" && "Payment proofs waiting for your verification"}
            {activeFilter === "verified" && "Successfully verified payment proofs"}
            {activeFilter === "rejected" && "Payment proofs that were rejected"}
            {activeFilter === "all" && "Total payment proofs from all tenants"}
          </Text>
        </GradientCard>

        {/* Payment Proofs List */}
        {paymentProofs.length === 0 ? (
          <GradientCard variant="surface" style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={colors.success}
              />
              <Text style={styles.emptyTitle}>
                {activeFilter === "pending" && "All Caught Up!"}
                {activeFilter === "verified" && "No Verified Proofs"}
                {activeFilter === "rejected" && "No Rejected Proofs"}
                {activeFilter === "all" && "No Payment Proofs"}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeFilter === "pending" && "No pending payment proofs to verify at the moment."}
                {activeFilter === "verified" && "No payment proofs have been verified yet."}
                {activeFilter === "rejected" && "No payment proofs have been rejected."}
                {activeFilter === "all" && "No payment proofs uploaded yet."}
              </Text>
            </View>
          </GradientCard>
        ) : (
          paymentProofs.map((proof) => (
            <GradientCard key={proof.id} variant="surface" style={styles.proofCard}>
              <View style={styles.proofHeader}>
                <View style={styles.proofInfo}>
                  <Text style={styles.tenantName}>{proof.tenant_name}</Text>
                  <Text style={styles.unitInfo}>
                    {proof.property_name} - Unit {proof.unit_number}
                  </Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={styles.amount}>{formatCurrency(proof.amount)}</Text>
                  {/* Status Badge */}
                  {proof.verification_status !== "pending" && (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            proof.verification_status === "verified"
                              ? colors.success + "20"
                              : colors.error + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          proof.verification_status === "verified"
                            ? "checkmark-circle"
                            : "close-circle"
                        }
                        size={14}
                        color={
                          proof.verification_status === "verified"
                            ? colors.success
                            : colors.error
                        }
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              proof.verification_status === "verified"
                                ? colors.success
                                : colors.error,
                          },
                        ]}
                      >
                        {proof.verification_status === "verified"
                          ? "Verified"
                          : "Rejected"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.proofDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="calendar" size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {formatDate(proof.uploaded_at)}
                  </Text>
                </View>
                
                {proof.description && (
                  <View style={styles.detailItem}>
                    <Ionicons name="document-text" size={16} color={colors.textSecondary} />
                    <Text style={styles.detailText} numberOfLines={2}>
                      {proof.description}
                    </Text>
                  </View>
                )}
              </View>

              {/* Payment Proof Image Preview */}
              {proof.payment_proof_image_url && (
                <View style={styles.imagePreview}>
                  <Image
                    source={{ uri: proof.payment_proof_image_url }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              <View style={styles.proofActions}>
                {proof.verification_status === "pending" ? (
                  <TouchableOpacity
                    style={styles.viewButton}
                    onPress={() => openVerificationModal(proof)}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    <Text style={styles.viewButtonText}>Review & Verify</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.viewButton, styles.viewButtonSecondary]}
                    onPress={() => openVerificationModal(proof)}
                  >
                    <Ionicons name="eye" size={16} color={colors.textSecondary} />
                    <Text style={[styles.viewButtonText, styles.viewButtonTextSecondary]}>
                      View Details
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </GradientCard>
          ))
        )}

        {/* Info Card */}
        <GradientCard variant="surface" style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={colors.primary} />
            <Text style={styles.infoTitle}>Verification Guidelines</Text>
          </View>
          <Text style={styles.infoText}>
            • Verify payment proofs carefully to ensure accuracy
          </Text>
          <Text style={styles.infoText}>
            • Check that the amount matches the payment proof
          </Text>
          <Text style={styles.infoText}>
            • Verify payment method and date are correct
          </Text>
          <Text style={styles.infoText}>
            • Once verified, a payment record will be automatically created
          </Text>
        </GradientCard>
      </ScrollView>

      {renderVerificationModal()}
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
  refreshButton: {
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
  summaryCard: {
    marginBottom: spacing.lg,
    alignItems: "center",
    padding: spacing.lg,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  summaryTitle: {
    ...typography.h6,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: "600",
  },
  summaryCount: {
    ...typography.h2,
    color: colors.white,
    fontWeight: "bold",
    marginBottom: spacing.xs,
  },
  summarySubtext: {
    ...typography.body2,
    color: colors.white,
    opacity: 0.9,
    textAlign: "center",
  },
  emptyCard: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyContent: {
    alignItems: "center",
  },
  emptyTitle: {
    ...typography.h5,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: "center",
  },
  proofCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  proofHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  proofInfo: {
    flex: 1,
  },
  tenantName: {
    ...typography.h6,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  unitInfo: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    ...typography.h6,
    color: colors.primary,
    fontWeight: "bold",
  },
  proofDetails: {
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  detailText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  imagePreview: {
    marginBottom: spacing.md,
  },
  thumbnailImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  proofActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  viewButtonText: {
    ...typography.body2,
    color: colors.primary,
    marginLeft: spacing.sm,
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
    padding: spacing.lg,
    width: "95%",
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h5,
    color: colors.text,
    fontWeight: "bold",
  },
  closeButton: {
    padding: spacing.sm,
  },
  modalBody: {
    maxHeight: "80%",
  },
  proofDetails: {
    marginBottom: spacing.lg,
  },
  proofTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  proofItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  proofLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  proofValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: "500",
  },
  imageSection: {
    marginBottom: spacing.lg,
  },
  imageTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  proofImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  notesSection: {
    marginBottom: spacing.lg,
  },
  notesTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: "600",
  },
  notesInput: {
    ...typography.body1,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  rejectButton: {
    backgroundColor: colors.error + "20",
  },
  verifyButton: {
    backgroundColor: colors.primary,
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
  // Filter Tabs Styles
  filterContainer: {
    marginBottom: spacing.md,
  },
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    ...shadows.sm,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.body2,
    color: colors.text,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: colors.white,
    fontWeight: "600",
  },
  filterBadge: {
    backgroundColor: colors.warning,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: spacing.xs,
  },
  filterBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: "700",
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: spacing.xs,
  },
  statusBadgeText: {
    ...typography.caption,
    fontWeight: "600",
    fontSize: 11,
  },
  viewButtonSecondary: {
    backgroundColor: colors.borderLight,
  },
  viewButtonTextSecondary: {
    color: colors.textSecondary,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statusBannerText: {
    flex: 1,
  },
  statusBannerTitle: {
    ...typography.h6,
    fontWeight: "600",
    marginBottom: 2,
  },
  statusBannerDate: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  notesReadOnly: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 60,
  },
  notesReadOnlyText: {
    ...typography.body2,
    color: colors.text,
    lineHeight: 20,
  },
  closeModalButton: {
    width: "100%",
  },
});

export default PaymentProofVerificationScreen;
