// src/components/VisitorArrivalAlert.js
import React, { useState } from 'react';
import {
  Modal, View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Shadow } from '../theme';
import { approveRegistration, rejectRegistration } from '../services/api';

/**
 * Visitor Arrival Alert Modal
 * Shows visitor details with quick approve/reject buttons
 * Displays photo, name, phone, purpose for fast decision-making
 */
export default function VisitorArrivalAlert({
  visible,
  visitorData,
  onClose,
}) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  if (!visitorData) return null;

  // Extract visitor info from notification data
  const visitorName = visitorData.visitor_name || visitorData.name || 'Unknown Visitor';
  const visitorPhone = visitorData.visitor_phone || visitorData.phone || 'N/A';
  const visitorPurpose = visitorData.purpose || 'Not specified';
  const visitingFlat = visitorData.visiting_flat || 'N/A';
  const registrationId = visitorData.registration_id || visitorData.id;
  // Use photo_url directly from API response (signed S3 URL)
  const photoUrl = visitorData.photo_url;

  const handleApprove = async () => {
    if (!registrationId) {
      console.error('❌ [VisitorArrivalAlert] No registration ID');
      onClose();
      return;
    }

    setApproving(true);
    try {
      console.log('✅ [VisitorArrivalAlert] Approving visitor registration:', registrationId);
      await approveRegistration(registrationId, { status: 'approved' });
      console.log('✅ [VisitorArrivalAlert] Visitor approved successfully');
      onClose({
        action: 'approved',
        visitorName,
        registrationId,
      });
    } catch (err) {
      console.error('❌ [VisitorArrivalAlert] Approval error:', err.message);
      const errorMsg = err.response?.data?.error || 'Approval failed';
      console.error('   Details:', errorMsg);
      onClose({
        action: 'error',
        error: errorMsg,
      });
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!registrationId) {
      console.error('❌ [VisitorArrivalAlert] No registration ID');
      onClose();
      return;
    }

    setRejecting(true);
    try {
      console.log('❌ [VisitorArrivalAlert] Rejecting visitor registration:', registrationId);
      await rejectRegistration(registrationId, { reason: 'Rejected from home screen' });
      console.log('✅ [VisitorArrivalAlert] Visitor rejected successfully');
      onClose({
        action: 'rejected',
        visitorName,
        registrationId,
      });
    } catch (err) {
      console.error('❌ [VisitorArrivalAlert] Rejection error:', err.message);
      const errorMsg = err.response?.data?.error || 'Rejection failed';
      console.error('   Details:', errorMsg);
      onClose({
        action: 'error',
        error: errorMsg,
      });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fadeIn" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.container}>
            {/* Close indicator */}
            <View style={styles.topBar}>
              <Text style={styles.dragBar}>─────────</Text>
            </View>

            {/* Header */}
            <View style={styles.headerSection}>
              <MaterialCommunityIcons name="door-open" size={48} color={Colors.textDark} style={styles.headerEmoji} />
              <Text style={styles.headerTitle}>Visitor Arrived</Text>
              <Text style={styles.headerSubtitle}>Quick Approval Needed</Text>
            </View>

            {/* Photo */}
            {photoUrl ? (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.visitorPhoto}
                  resizeMode="cover"
                  onError={(err) => {
                    console.warn('[VisitorArrivalAlert] Failed to load photo:', photoUrl);
                  }}
                />
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="account-outline" size={48} color={Colors.textSecondary} style={styles.placeholderEmoji} />
              </View>
            )}

            {/* Visitor Details */}
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons style={styles.detailIcon} name="account-outline" size={20} color={Colors.textDark} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{visitorName}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <MaterialCommunityIcons style={styles.detailIcon} name="phone-outline" size={20} color={Colors.textDark} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{visitorPhone}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <MaterialCommunityIcons style={styles.detailIcon} name="home-outline" size={20} color={Colors.textDark} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Visiting Unit</Text>
                  <Text style={styles.detailValue}>{visitingFlat}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <MaterialCommunityIcons style={styles.detailIcon} name="target" size={20} color={Colors.textDark} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Purpose</Text>
                  <Text style={styles.detailValue}>{visitorPurpose}</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtnStyle]}
                onPress={handleApprove}
                disabled={approving || rejecting}
              >
                {approving ? (
                  <ActivityIndicator size="small" color={Colors.textWhite} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.textWhite} style={styles.actionBtnEmoji} />
                    <Text style={styles.actionBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtnStyle]}
                onPress={handleReject}
                disabled={approving || rejecting}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color={Colors.textWhite} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle-outline" size={16} color={Colors.textWhite} style={styles.actionBtnEmoji} />
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Dismiss hint */}
            <Text style={styles.dismissHint}>Swipe down to close</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.bgWhite,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
    ...Shadow.card,
  },
  topBar: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragBar: {
    fontSize: 20,
    color: Colors.border,
    letterSpacing: 2,
  },
  headerSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  headerEmoji: { marginBottom: 8 },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  visitorPhoto: {
    width: 120,
    height: 160,
    borderRadius: Radius.lg,
    ...Shadow.soft,
  },
  photoPlaceholder: {
    width: 120,
    height: 160,
    borderRadius: Radius.lg,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.soft,
    alignSelf: 'center',
    marginVertical: 16,
  },
  placeholderEmoji: {},
  detailsCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: 12,
    marginVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    gap: 8,
    ...Shadow.soft,
  },
  approveBtnStyle: {
    backgroundColor: Colors.success,
  },
  rejectBtnStyle: {
    backgroundColor: Colors.danger,
  },
  actionBtnEmoji: {
    fontSize: 18,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  dismissHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
