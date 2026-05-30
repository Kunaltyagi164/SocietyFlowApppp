// src/screens/Profile/FamilyMembersScreen.js
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
  Modal,
  Switch,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Fonts, Radius, Shadow } from '../../theme';
import * as api from '../../services/api';
import { ScreenBackground } from '../../components';
import { SF, SH, SW } from '../../utils/responsive';

const RELATIONS = ['Spouse', 'Child', 'Parent', 'Sibling', 'Other'];

export default function FamilyMembersScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      console.log('👨‍👩‍👧 [FamilyMembers] Loading family data via /me/family...');
      // Use /me/family — backend resolves resident from auth token automatically
      const familyRes = await api.getMyFamilyMembers();
      console.log('✅ [FamilyMembers] Success:', familyRes.data?.data?.length || 0, 'members');
      setFamilies(familyRes.data?.data || []);
    } catch (err) {
      console.error('❌ [FamilyMembers] Error loading family data:', err.message);
      Alert.alert('⚠️ Error', `Failed to load family members: ${err.response?.status || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async () => {
    try {
      if (!formData.name || !formData.relation) {
        Alert.alert('⚠️ Required', 'Please fill in name and relation');
        return;
      }

      if (formData.age && (isNaN(formData.age) || formData.age < 0 || formData.age > 120)) {
        Alert.alert('⚠️ Invalid Age', 'Please enter a valid age (0-120)');
        return;
      }

      if (formData.phone && formData.phone.length < 10) {
        Alert.alert('⚠️ Invalid Phone', 'Please enter a valid phone number');
        return;
      }

      const payload = {
        name: formData.name,
        relation: formData.relation,
        age: formData.age ? parseInt(formData.age) : undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        notif_visitor: formData.notif_visitor !== undefined ? formData.notif_visitor : true,
        notif_emergency: formData.notif_emergency !== undefined ? formData.notif_emergency : true,
        notif_bill: formData.notif_bill !== undefined ? formData.notif_bill : true,
        notif_community: formData.notif_community !== undefined ? formData.notif_community : true,
      };

      if (editingId) {
        console.log('📡 [FamilyMembers] Updating family member:', editingId);
        await api.updateFamilyMember(editingId, payload);
        console.log('✅ [FamilyMembers] Family member updated successfully');
        Alert.alert('✅ Updated', 'Family member updated successfully');
      } else {
        // POST /api/residents/me/family — no resident ID needed
        console.log('📡 [FamilyMembers] Adding family member via /me/family...');
        await api.addMyFamilyMember(payload);
        console.log('✅ [FamilyMembers] Family member added successfully');
        Alert.alert('✅ Added', 'Family member added successfully');
      }

      setFormData({});
      setEditingId(null);
      setShowAddForm(false);
      loadFamilyData();
    } catch (err) {
      console.error('❌ [FamilyMembers] Error saving family member:', err.message);
      const errMsg = err.response?.data?.error || err.response?.data?.message || `Failed to save family member: ${err.response?.status || err.message}`;
      Alert.alert('❌ Error', errMsg);
    }
  };

  const handleEdit = (member) => {
    setEditingId(member.id);
    setFormData({
      name: member.name,
      relation: member.relation,
      age: member.age ? member.age.toString() : '',
      phone: member.phone || '',
      email: member.email || '',
      notif_visitor: member.notif_visitor !== false,
      notif_emergency: member.notif_emergency !== false,
      notif_bill: member.notif_bill !== false,
      notif_community: member.notif_community !== false,
    });
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    Alert.alert(
      '⚠️ Confirm Delete',
      'Are you sure you want to remove this family member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteFamilyMember(id);
              Alert.alert('✅ Deleted', 'Family member removed');
              loadFamilyData();
            } catch (err) {
              Alert.alert('❌ Error', 'Failed to delete family member');
            }
          },
        },
      ]
    );
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
          <Text style={styles.title}>Family Members</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Add Member Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingId(null);
              setFormData({});
              setShowAddForm(true);
            }}
          >
            <View style={styles.addBtnRow}>
              <MaterialCommunityIcons name="account-plus" size={18} color={Colors.bgWhite} />
              <Text style={styles.addBtnText}>Add Family Member</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Add/Edit Form */}
        {showAddForm && (
          <View style={[styles.section, styles.formCard]}>
            <Text style={styles.sectionTitle}>
              {editingId ? 'Edit Member' : 'New Member'}
            </Text>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor={Colors.textDark}
              value={formData.name || ''}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />

            <Text style={styles.label}>Relation *</Text>
            <View style={styles.relationSelector}>
              {RELATIONS.map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[
                    styles.relationBtn,
                    formData.relation === rel && styles.relationBtn_Active,
                  ]}
                  onPress={() => setFormData({ ...formData, relation: rel })}
                >
                  <Text
                    style={[
                      styles.relationText,
                      formData.relation === rel && styles.relationText_Active,
                    ]}
                  >
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Age (optional)"
              placeholderTextColor={Colors.textDark}
              keyboardType="numeric"
              value={formData.age || ''}
              onChangeText={(text) => setFormData({ ...formData, age: text })}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number (optional)"
              placeholderTextColor={Colors.textDark}
              keyboardType="phone-pad"
              value={formData.phone || ''}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address (optional)"
              placeholderTextColor={Colors.textDark}
              keyboardType="email-address"
              value={formData.email || ''}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
            />

            {/* Notification Preferences */}
            <View style={styles.inlineTitleRow}>
              <MaterialCommunityIcons name="bell-outline" size={16} color={Colors.teal} />
              <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Notifications</Text>
            </View>

            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>Visitor Alerts</Text>
              <Switch
                value={formData.notif_visitor !== false}
                onValueChange={(val) => setFormData({ ...formData, notif_visitor: val })}
                trackColor={{ false: Colors.primaryLight, true: Colors.tealLight }}
                thumbColor={formData.notif_visitor !== false ? Colors.teal : Colors.textSecondary}
              />
            </View>

            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>Emergency Alerts</Text>
              <Switch
                value={formData.notif_emergency !== false}
                onValueChange={(val) => setFormData({ ...formData, notif_emergency: val })}
                trackColor={{ false: Colors.primaryLight, true: Colors.tealLight }}
                thumbColor={formData.notif_emergency !== false ? Colors.teal : Colors.textSecondary}
              />
            </View>

            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>Bill Reminders</Text>
              <Switch
                value={formData.notif_bill !== false}
                onValueChange={(val) => setFormData({ ...formData, notif_bill: val })}
                trackColor={{ false: Colors.primaryLight, true: Colors.tealLight }}
                thumbColor={formData.notif_bill !== false ? Colors.teal : Colors.textSecondary}
              />
            </View>

            <View style={styles.notifRow}>
              <Text style={styles.notifLabel}>Community Updates</Text>
              <Switch
                value={formData.notif_community !== false}
                onValueChange={(val) => setFormData({ ...formData, notif_community: val })}
                trackColor={{ false: Colors.primaryLight, true: Colors.tealLight }}
                thumbColor={formData.notif_community !== false ? Colors.teal : Colors.textSecondary}
              />
            </View>

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.btn, styles.saveBtn]}
              onPress={handleAddOrUpdate}
            >
              <View style={styles.btnIconRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={16} color={Colors.bgWhite} />
                <Text style={styles.saveBtnText}>Save</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={() => {
                setShowAddForm(false);
                setEditingId(null);
                setFormData({});
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Family Members List */}
        <View style={styles.section}>
          {families.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Members ({families.length})</Text>
              {families.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <MaterialCommunityIcons name="account-circle-outline" size={16} color={Colors.teal} />
                      <Text style={styles.memberName}>{member.name}</Text>
                    </View>
                    <Text style={styles.memberDetail}>
                      {member.relation}
                      {member.age ? ` • ${member.age} years` : ''}
                    </Text>
                    {member.phone && (
                      <View style={styles.memberDetailRow}>
                        <MaterialCommunityIcons name="phone-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.memberDetail}>{member.phone}</Text>
                      </View>
                    )}
                    {member.email && (
                      <View style={styles.memberDetailRow}>
                        <MaterialCommunityIcons name="email-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.memberDetail}>{member.email}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      style={styles.actionBtn_Edit}
                      onPress={() => handleEdit(member)}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={16} color={Colors.teal} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn_Delete}
                      onPress={() => handleDelete(member.id)}
                    >
                      <MaterialCommunityIcons name="delete-outline" size={16} color={Colors.vibrantRed} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-group-outline" size={44} color={Colors.textSecondary} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No family members added</Text>
              <Text style={styles.emptySubtext}>Tap "Add Family Member" to get started</Text>
            </View>
          )}
        </View>
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
  buttonContainer: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  addBtn: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.lg,
    paddingVertical: SH(12),
    paddingHorizontal: SW(16),
    alignItems: 'center',
    ...Shadow.soft,
  },
  addBtnText: {
    color: Colors.bgWhite,
    fontSize: SF(16),
    fontWeight: '700',
  },
  addBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(8),
  },
  inlineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  btnIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  formCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: SW(16),
    ...Shadow.soft,
  },
  label: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(8),
    marginTop: SH(12),
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
  relationSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SW(8),
    marginBottom: SH(8),
  },
  relationBtn: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingVertical: SH(10),
    alignItems: 'center',
    borderWidth: SW(2),
    borderColor: Colors.primaryLight,
  },
  relationBtn_Active: {
    backgroundColor: Colors.tealLight,
    borderColor: Colors.teal,
  },
  relationText: {
    fontSize: SF(13),
    color: Colors.textDark,
    fontWeight: '500',
  },
  relationText_Active: {
    color: Colors.teal,
    fontWeight: '700',
  },
  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SH(12),
    paddingHorizontal: SW(12),
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    marginBottom: SH(8),
  },
  notifLabel: {
    fontSize: SF(14),
    color: Colors.textDark,
    fontWeight: '500',
  },
  btn: {
    borderRadius: Radius.md,
    paddingVertical: SH(12),
    alignItems: 'center',
    marginTop: SH(12),
  },
  saveBtn: {
    backgroundColor: Colors.success,
  },
  saveBtnText: {
    color: Colors.bgWhite,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: Colors.primaryLight,
  },
  cancelBtnText: {
    color: Colors.textDark,
    fontWeight: '600',
  },
  memberCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    marginBottom: SH(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: SF(15),
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: SH(4),
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  memberDetail: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    marginBottom: SH(2),
  },
  memberDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  memberActions: {
    flexDirection: 'row',
    gap: SW(8),
  },
  actionBtn_Edit: {
    backgroundColor: Colors.blueLight,
    borderRadius: Radius.md,
    padding: SW(8),
  },
  actionBtn_Delete: {
    backgroundColor: '#FEE2E2',
    borderRadius: Radius.md,
    padding: SW(8),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SH(40),
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
