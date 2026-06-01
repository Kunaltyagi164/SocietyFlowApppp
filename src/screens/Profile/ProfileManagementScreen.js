// src/screens/Profile/ProfileManagementScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Fonts, Radius, Shadow } from '../../theme';
import * as api from '../../services/api';
import { ScreenBackground } from '../../components';
import { SF, SH, SW } from '../../utils/responsive';

export default function ProfileManagementScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [updateRequests, setUpdateRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      console.log('📋 [ProfileManagement] Loading profile data...');
      
      console.log('📡 [ProfileManagement] Calling getMe()...');
      const userRes = await api.getMe();
      console.log('✅ [ProfileManagement] getMe() success');
      
      // Extract user from nested data structure
      const userData = userRes.data?.data?.user;
      console.log('✅ [ProfileManagement] User:', userData?.name, userData?.email);
      
      console.log('📡 [ProfileManagement] Calling getProfileUpdateRequests()...');
      const requestsRes = await api.getProfileUpdateRequests();
      console.log('✅ [ProfileManagement] getProfileUpdateRequests() success:', requestsRes.data?.data?.length || 0, 'requests');
      
      setUser(userData);
      setUpdateRequests(requestsRes.data?.data || []);
    } catch (err) {
      console.error('❌ [ProfileManagement] Error loading profile data:', err.message);
      console.error('   Status:', err.response?.status);
      console.error('   Data:', err.response?.data);
      Alert.alert('⚠️ Error', `Failed to load profile: ${err.response?.status || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestChange = async () => {
    try {
      if (!editData.field || !editData.value) {
        Alert.alert('⚠️ Required', 'Please fill in all fields');
        return;
      }

      // Check for pending requests on same field
      const hasPending = updateRequests.some(
        r => r.field_name === editData.field && r.status === 'pending'
      );

      if (hasPending) {
        Alert.alert(
          '⚠️ Pending Request',
          `You already have a pending request to change your ${editData.field}. Please wait for admin approval.`
        );
        return;
      }

      // Validate email
      if (editData.field === 'email' && !isValidEmail(editData.value)) {
        Alert.alert('⚠️ Invalid Email', 'Please enter a valid email address');
        return;
      }

      // Validate phone
      if (editData.field === 'phone') {
        const cleanPhone = editData.value.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          Alert.alert('⚠️ Invalid Phone', 'Please enter a valid phone number (at least 10 digits)');
          return;
        }
      }

      // Submit request with correct field name
      const response = await api.createProfileUpdateRequest({
        field_name: editData.field,
        new_value: editData.value,
      });

      Alert.alert(
        '✅ Request Submitted',
        'Your request has been sent to admin for review. You will be notified once it\'s approved.'
      );
      setEditData({});
      setShowEditForm(false);
      loadProfileData();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      Alert.alert('❌ Error', errorMsg);
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return Colors.blue;
      case 'approved':
        return Colors.success;
      case 'rejected':
        return Colors.danger;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'approved':
        return 'check-circle-outline';
      case 'rejected':
        return 'close-circle-outline';
      default:
        return 'circle-outline';
    }
  };

  if (loading) {
    return (
      <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.teal} style={{ marginTop: 40 }} />
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrap}>
            <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.teal} />
            <Text style={styles.backBtn}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile Management</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Current Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Information</Text>
          <View style={[styles.card, styles.profileCard]}>
            <View style={styles.profileField}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.value}>{user?.name || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.profileField}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user?.email || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.profileField}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{user?.phone || 'N/A'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.profileField}>
              <Text style={styles.label}>Flat Number</Text>
              <Text style={styles.value}>{user?.flat_no || 'N/A'}</Text>
            </View>
            {user?.role && (
              <>
                <View style={styles.divider} />
                <View style={styles.profileField}>
                  <Text style={styles.label}>Role</Text>
                  <Text style={styles.value}>{user.role.toUpperCase()}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Request Change Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.requestBtn}
            onPress={() => setShowEditForm(!showEditForm)}
          >
            <View style={styles.requestBtnRow}>
              <MaterialCommunityIcons name="file-edit-outline" size={18} color={Colors.bgWhite} />
              <Text style={styles.requestBtnText}>Request Profile Change</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Edit Form */}
        {showEditForm && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Change</Text>
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>What do you want to change? *</Text>
              <View style={styles.fieldSelector}>
                {[
                  { field: 'email', label: 'Email', icon: 'email-outline', current: user?.email },
                  { field: 'phone', label: 'Phone', icon: 'phone-outline', current: user?.phone },
                ].map(({ field, label, icon, current }) => {
                  const hasPending = updateRequests.some(r => r.field_name === field && r.status === 'pending');
                  return (
                    <TouchableOpacity
                      key={field}
                      style={[
                        styles.fieldOption,
                        editData.field === field && styles.fieldOption_Selected,
                        hasPending && styles.fieldOption_Disabled,
                      ]}
                      onPress={() => !hasPending && setEditData({ ...editData, field })}
                      disabled={hasPending}
                    >
                      <Text
                        style={[
                          styles.fieldOptionText,
                          editData.field === field && styles.fieldOptionText_Selected,
                        ]}
                      >
                        {label}
                      </Text>
                      <MaterialCommunityIcons name={icon} size={16} color={editData.field === field ? Colors.teal : Colors.textSecondary} />
                      <Text style={styles.fieldOptionCurrent}>{current}</Text>
                      {hasPending && (
                        <View style={styles.pendingRow}>
                          <MaterialCommunityIcons name="clock-outline" size={12} color="#f59e0b" />
                          <Text style={styles.fieldOptionPending}>Pending</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {editData.field && (
                <>
                  <Text style={styles.formLabel}>New Value *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={`Enter new ${editData.field}`}
                    value={editData.value || ''}
                    onChangeText={(text) => setEditData({ ...editData, value: text })}
                    keyboardType={editData.field === 'phone' ? 'phone-pad' : editData.field === 'email' ? 'email-address' : 'default'}
                  />

                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleRequestChange}
                  >
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setShowEditForm(false);
                      setEditData({});
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Update Requests History */}
        {updateRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request History</Text>
            {updateRequests.map((req, idx) => (
              <View key={idx} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestField}>
                      {req.field_name?.toUpperCase()}
                    </Text>
                    <MaterialCommunityIcons
                      name={req.field_name === 'email' ? 'email-outline' : 'phone-outline'}
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.requestValue}>
                      {req.old_value} → {req.new_value}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(req.status) + '20' },
                    ]}
                  >
                    <Text style={{ color: getStatusColor(req.status), fontWeight: '700', fontSize: 12 }}>
                      {req.status}
                    </Text>
                    <MaterialCommunityIcons name={getStatusIcon(req.status)} size={14} color={getStatusColor(req.status)} />
                  </View>
                </View>
                <View style={styles.requestMeta}>
                  <View style={styles.metaRow}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={13} color={Colors.textSecondary} />
                    <Text style={styles.metaText}>{req.requested_at?.split('T')[0]}</Text>
                  </View>
                  {req.admin_note && (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="message-text-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.adminNotes}>{req.admin_note}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {updateRequests.length === 0 && !showEditForm && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={44} color={Colors.textSecondary} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No change requests yet</Text>
            <Text style={styles.emptySubtext}>Submit a request to update your profile</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    backgroundColor: Colors.bgWhite,
    ...Shadow.soft,
  },
  backBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  backBtn: {
    fontSize: SF(16),
    color: Colors.teal,
    fontWeight: '600',
  },
  title: {
    fontSize: SF(20),
    fontWeight: 'bold',
    color: Colors.textDark,
  },
  section: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  sectionTitle: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(12),
  },
  card: {
    backgroundColor: Colors.bgWhite,
    borderRadius: SW(12),
    padding: SW(16),
    ...Shadow.soft,
  },
  profileCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.teal,
  },
  profileField: {
    paddingVertical: SH(8),
  },
  divider: {
    height: SH(1),
    backgroundColor: Colors.primaryLight,
    marginVertical: SH(8),
  },
  label: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: SH(4),
  },
  value: {
    fontSize: SF(16),
    color: Colors.textDark,
    fontWeight: '500',
  },
  buttonContainer: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  requestBtn: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.lg,
    paddingVertical: SH(12),
    paddingHorizontal: SW(16),
    alignItems: 'center',
    ...Shadow.soft,
  },
  requestBtnText: {
    color: Colors.bgWhite,
    fontSize: SF(16),
    fontWeight: '700',
  },
  requestBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(8),
  },
  formCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: SW(16),
    ...Shadow.soft,
  },
  formLabel: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(8),
    marginTop: SH(12),
  },
  fieldSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SW(8),
  },
  fieldOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: SH(12),
    paddingHorizontal: SW(10),
    alignItems: 'center',
    borderWidth: SW(2),
    borderColor: Colors.primaryLight,
  },
  fieldOption_Selected: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.teal,
  },
  fieldOption_Disabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  fieldOptionText: {
    fontSize: SF(14),
    color: Colors.textDark,
    fontWeight: '600',
  },
  fieldOptionText_Selected: {
    color: Colors.teal,
    fontWeight: '700',
  },
  fieldOptionCurrent: {
    fontSize: SF(11),
    color: Colors.textSecondary,
    marginTop: SH(4),
    fontWeight: '400',
  },
  fieldOptionPending: {
    fontSize: SF(10),
    color: '#f59e0b',
    fontWeight: '600',
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(4),
    marginTop: SH(4),
  },
  input: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    fontSize: SF(14),
    color: Colors.textDark,
    borderWidth: SW(1),
    borderColor: Colors.primaryLight,
    marginBottom: SH(8),
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: SH(80),
  },
  submitBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingVertical: SH(12),
    alignItems: 'center',
    marginTop: SH(12),
  },
  submitBtnText: {
    color: Colors.bgWhite,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: SH(12),
    alignItems: 'center',
    marginTop: SH(8),
  },
  cancelBtnText: {
    color: Colors.textDark,
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    marginBottom: SH(10),
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  requestField: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(4),
  },
  requestValue: {
    fontSize: SF(12),
    color: Colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(4),
    paddingHorizontal: SW(8),
    paddingVertical: SH(6),
    borderRadius: Radius.md,
  },
  requestMeta: {
    marginTop: SH(10),
    paddingTop: SH(10),
    borderTopWidth: 1,
    borderTopColor: Colors.primaryLight,
  },
  metaText: {
    fontSize: SF(12),
    color: Colors.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
    marginBottom: SH(6),
  },
  adminNotes: {
    fontSize: SF(12),
    color: Colors.textDark,
    fontStyle: 'italic',
  },
  emptyState: {
    marginVertical: SH(40),
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: SF(48),
    marginBottom: SH(12),
  },
  emptyText: {
    fontSize: SF(16),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(4),
  },
  emptySubtext: {
    fontSize: SF(14),
    color: Colors.textSecondary,
  },
});
