// src/components/VisitorApprovalModal.js
import React, { useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, ToastAndroid,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Shadow, GradientColors } from '../theme';
import LinearGradient from 'react-native-linear-gradient';
import { EventEmitter } from '../services/events';
export default function VisitorApprovalModal({ visible, visitor, onApprove, onReject, onClose }) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [imageError, setImageError] = useState(null);

  if (!visitor || !visitor.id) {
    if (visible) {
      console.log('⚠️ [VisitorApprovalModal] Modal visible but no valid visitor prop provided');
      console.log('   visitor:', visitor);
      console.log('   visitor?.id:', visitor?.id);
    }
    return null;
  }

  console.log('👁️ [VisitorApprovalModal] Modal visible:', visible);
  console.log('👤 [VisitorApprovalModal] Visitor data:', visitor.name || visitor.visitor_name);
  console.log('📸 [VisitorApprovalModal] Photo URL:', visitor.photo_url);

  const handleApprove = async () => {
    setApproving(true);
    try {
      console.log('👍 [VisitorApprovalModal] Approving visitor:', visitor.id, visitor.name);
      await onApprove(visitor.id);
      
      // Show toast notification
      ToastAndroid.show(`✅ ${visitor.name || 'Visitor'} approved!`, ToastAndroid.LONG);
      
      // Emit event to notify listeners about approval
      EventEmitter.emit('visitor_approved', {
        id: visitor.id,
        name: visitor.name,
        timestamp: new Date(),
      });
      
      console.log('✅ [VisitorApprovalModal] Visitor approved successfully');
      onClose();
    } catch (err) {
      console.error('❌ [VisitorApprovalModal] Approval error:', err.message);
      ToastAndroid.show('❌ Failed to approve. Try again.', ToastAndroid.LONG);
      Alert.alert('Error', err.response?.data?.error || 'Approval failed');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = () => {
    Alert.prompt(
      'Reject Visitor',
      'Enter reason for rejection (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            setRejecting(true);
            try {
              console.log('👎 [VisitorApprovalModal] Rejecting visitor:', visitor.id);
              await onReject(visitor.id, reason || '');
              
              // Show toast notification
              ToastAndroid.show(`❌ ${visitor.name || 'Visitor'} rejected`, ToastAndroid.LONG);
              
              // Emit event to notify listeners about rejection
              EventEmitter.emit('visitor_rejected', {
                id: visitor.id,
                name: visitor.name,
                reason: reason || '',
                timestamp: new Date(),
              });
              
              console.log('✅ [VisitorApprovalModal] Visitor rejected successfully');
              onClose();
            } catch (err) {
              console.error('❌ [VisitorApprovalModal] Rejection error:', err.message);
              ToastAndroid.show('❌ Failed to reject. Try again.', ToastAndroid.LONG);
              Alert.alert('Error', err.response?.data?.error || 'Rejection failed');
            } finally {
              setRejecting(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  // Determine action button visibility - check multiple status formats
  const shouldShowActions = () => {
    if (!visitor.status) return false;
    const status = visitor.status.toLowerCase().trim();
    return status === 'pending' || status === 'p' || status === 'awaiting_approval';
  };

  // Use photo_url directly from API response (signed S3 URL)
  const photoUrl = visitor.photo_url;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <LinearGradient colors={GradientColors.premiumCardHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Visitor Approval</Text>
            <View style={{ width: 32 }} />
          </LinearGradient>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Visitor Image */}
            {photoUrl ? (
              <Image 
                source={{ uri: photoUrl }} 
                style={styles.visitorImage}
                onLoad={() => {
                  console.log('✅ [VisitorApprovalModal] Image loaded:', photoUrl);
                }}
                onError={(error) => {
                  console.warn('❌ [VisitorApprovalModal] Failed to load image:', photoUrl, error);
                  setImageError(true);
                }}
              />
            ) : (
              <View style={styles.visitorImagePlaceholder}>
                <MaterialCommunityIcons name="walk" size={80} color={Colors.textMid} />
              </View>
            )}

            {/* Details Card */}
            <View style={styles.detailCard}>
              <InfoItem iconName="account-outline" label="Name" value={visitor.name || visitor.visitor_name || 'Unknown'} />
              <Divider />
              <InfoItem iconName="phone-outline" label="Phone" value={visitor.phone || visitor.visitor_phone || 'N/A'} />
              <Divider />
              <InfoItem iconName="target" label="Purpose" value={visitor.purpose || 'Not specified'} />
              <Divider />
              <InfoItem 
                iconName="calendar-clock-outline" 
                label="Pre-Registered On" 
                value={visitor.registered_at ? fmtDateTime(visitor.registered_at) : 'Not registered'} 
              />
              <Divider />
              <InfoItem 
                iconName={visitor.valid_until ? 'clock-outline' : 'close-circle-outline'} 
                label="Valid Until" 
                value={visitor.valid_until ? fmtDateTime(visitor.valid_until) : 'Approval expired'} 
                valueColor={visitor.valid_until ? (new Date(visitor.valid_until) < new Date() ? '#ef4444' : '#22c55e') : '#ef4444'}
              />
              {visitor.id_proof && (
                <>
                  <Divider />
                  <InfoItem iconName="card-account-details-outline" label="ID Proof" value={visitor.id_proof} />
                </>
              )}
              {visitor.remarks && (
                <>
                  <Divider />
                  <InfoItem iconName="text-box-outline" label="Remarks" value={visitor.remarks} />
                </>
              )}
            </View>

            {/* Status Badge */}
            {visitor.status && (
              <View style={[styles.statusBadge, getStatusStyle(visitor.status)]}>
                <Text style={styles.statusText}>Status: {visitor.status.toUpperCase()}</Text>
              </View>
            )}

            {/* Action Buttons - Show for pending status */}
            {shouldShowActions() && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={handleApprove}
                  disabled={approving || rejecting}>
                  {approving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check-circle-outline" size={16} color="#fff" style={styles.btnEmoji} />
                      <Text style={styles.btnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={handleReject}
                  disabled={approving || rejecting}>
                  {rejecting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="close-circle-outline" size={16} color="#fff" style={styles.btnEmoji} />
                      <Text style={styles.btnText}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InfoItem({ iconName, label, value, valueColor }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons style={styles.infoIcon} name={iconName} size={18} color={Colors.textMid} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

const fmtDateTime = (d) => {
  try {
    const date = new Date(d);
    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return '—';
  }
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'approved':
      return { backgroundColor: 'rgba(34, 197, 94, 0.1)', borderColor: '#22c55e' };
    case 'rejected':
      return { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' };
    case 'pending':
      return { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' };
    default:
      return { backgroundColor: 'rgba(156, 163, 175, 0.1)', borderColor: '#9ca3af' };
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 1,
    maxHeight: '90%',
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  visitorImage: {
    width: '100%',
    height: 240,
    borderRadius: Radius.lg,
    marginBottom: 16,
    ...Shadow.card,
  },
  visitorImagePlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Shadow.card,
  },
  detailCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 16,
    ...Shadow.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  infoIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textDark,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 0,
  },
  statusBadge: {
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...Shadow.card,
  },
  approveBtn: {
    backgroundColor: '#22c55e',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  btnEmoji: {},
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
