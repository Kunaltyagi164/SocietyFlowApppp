// src/screens/Visitors/GateVisitorRegistrationScreen.js
// Gate Self-Registration — Visitor registers themselves at the gate without login
// No Authorization header needed for this endpoint

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Picker,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../theme';
import * as api from '../../services/api';
import { SF, SH, SW } from '../../utils/responsive';

export default function GateVisitorRegistrationScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: Select society, 2: Fill form, 3: Waiting for approval
  const [societies, setSocieties] = useState([]);
  const [selectedSociety, setSelectedSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState('Pending');
  const [pollIntervalId, setPollIntervalId] = useState(null);

  // Form fields
  const [form, setForm] = useState({
    name: '',
    phone: '',
    visiting_flat: '',
    host_name: '',
    purpose: '',
    visitor_type: 'guest', // guest, delivery, service
    vehicle_no: '',
    stay_hours: '1',
  });

  useEffect(() => {
    loadSocieties();
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, []);

  const loadSocieties = async () => {
    try {
      setLoading(true);
      console.log('🏘️ [GateRegistry] Loading societies...');
      const res = await api.getGateSocieties();
      const societyList = res.data?.data || [];
      console.log(`✅ [GateRegistry] Loaded ${societyList.length} societies`);
      setSocieties(societyList);
    } catch (err) {
      console.error('❌ [GateRegistry] Error loading societies:', err.message);
      Alert.alert('Error', 'Could not load societies. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedSociety) {
      Alert.alert('Error', 'Please select a society');
      return;
    }
    setStep(2);
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!form.phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    if (!form.visiting_flat.trim()) {
      Alert.alert('Error', 'Please enter which flat you are visiting');
      return false;
    }
    if (!form.purpose.trim()) {
      Alert.alert('Error', 'Please enter the purpose of your visit');
      return false;
    }
    return true;
  };

  const handleSubmitRegistration = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      console.log('📝 [GateRegistry] Submitting visitor registration...');
      console.log('   Visitor Name:', form.name);
      console.log('   Visiting Flat:', form.visiting_flat);
      console.log('   Society ID:', selectedSociety.id);

      const registrationData = {
        society_id: selectedSociety.id,
        name: form.name,
        phone: form.phone,
        visiting_flat: form.visiting_flat,
        host_name: form.host_name || undefined,
        purpose: form.purpose,
        visitor_type: form.visitor_type,
        vehicle_no: form.vehicle_no || undefined,
        stay_hours: parseInt(form.stay_hours) || 1,
      };

      const res = await api.registerVisitorAtGate(registrationData);
      const data = res.data?.data || {};

      console.log('✅ [GateRegistry] Registration submitted successfully');
      console.log('   Registration ID:', data.registration_id);
      console.log('   Status:', data.status);

      setRegistrationId(data.registration_id);
      setApprovalStatus(data.status || 'Pending');
      setStep(3);

      // Poll for approval status every 5 seconds
      const interval = setInterval(() => checkApprovalStatus(selectedSociety.id, data.registration_id), 5000);
      setPollIntervalId(interval);

      Alert.alert('✅ Registration Submitted', 'Your registration has been submitted. Waiting for host approval...');
    } catch (err) {
      console.error('❌ [GateRegistry] Submission error:', err.message);
      console.error('   Status:', err.response?.status);
      console.error('   Data:', err.response?.data);
      Alert.alert('Error', 'Failed to submit registration: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const checkApprovalStatus = async (societyId, regId) => {
    try {
      const res = await api.checkGateRegistrationStatus(societyId, regId);
      const data = res.data?.data || {};
      const status = data.status || 'Pending';

      console.log(`📊 [GateRegistry] Status check - Registration ${regId}: ${status}`);

      setApprovalStatus(status);

      if (status === 'Approved') {
        if (pollIntervalId) clearInterval(pollIntervalId);
        Alert.alert('✅ Approved!', 'Your registration has been approved. You can now enter the society.', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else if (status === 'Rejected') {
        if (pollIntervalId) clearInterval(pollIntervalId);
        Alert.alert('❌ Rejected', 'Your registration has been rejected. Please contact the host.', [
          {
            text: 'OK',
            onPress: () => {
              setStep(1);
              setForm({
                name: '',
                phone: '',
                visiting_flat: '',
                host_name: '',
                purpose: '',
                visitor_type: 'guest',
                vehicle_no: '',
                stay_hours: '1',
              });
            },
          },
        ]);
      }
    } catch (err) {
      console.warn('⚠️ [GateRegistry] Status check failed:', err.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Step 1: Select Society */}
      {step === 1 && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>🏘️ Welcome to SocietyFlow</Text>
            <Text style={styles.subtitle}>Select your society to register as a visitor</Text>
          </View>

          {societies.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No societies found</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadSocieties}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {societies.map(society => (
                <TouchableOpacity
                  key={society.id}
                  style={[
                    styles.societyCard,
                    selectedSociety?.id === society.id && styles.societyCardSelected,
                  ]}
                  onPress={() => setSelectedSociety(society)}
                >
                  <View style={styles.societyCheckbox}>
                    {selectedSociety?.id === society.id && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.societyName}>{society.name}</Text>
                    {society.address && <Text style={styles.societyAddress}>{society.address}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, !selectedSociety && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={!selectedSociety}
          >
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 2: Fill Registration Form */}
      {step === 2 && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setStep(1)}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>📝 Your Information</Text>
            <Text style={styles.subtitle}>{selectedSociety?.name}</Text>
          </View>

          {/* Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={form.name}
              onChangeText={v => updateForm('name', v)}
              placeholderTextColor={Colors.textLight}
            />
          </View>

          {/* Phone */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your phone number"
              value={form.phone}
              onChangeText={v => updateForm('phone', v)}
              keyboardType="phone-pad"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          {/* Visiting Flat */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Visiting Flat/Unit *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., A-101"
              value={form.visiting_flat}
              onChangeText={v => updateForm('visiting_flat', v)}
              placeholderTextColor={Colors.textLight}
            />
          </View>

          {/* Host Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Host Name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Name of person you're visiting"
              value={form.host_name}
              onChangeText={v => updateForm('host_name', v)}
              placeholderTextColor={Colors.textLight}
            />
          </View>

          {/* Purpose */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Purpose of Visit *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Personal visit, delivery"
              value={form.purpose}
              onChangeText={v => updateForm('purpose', v)}
              placeholderTextColor={Colors.textLight}
            />
          </View>

          {/* Visitor Type */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Visitor Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.visitor_type}
                onValueChange={v => updateForm('visitor_type', v)}
                style={styles.picker}
              >
                <Picker.Item label="Guest" value="guest" />
                <Picker.Item label="Delivery" value="delivery" />
                <Picker.Item label="Service" value="service" />
              </Picker>
            </View>
          </View>

          {/* Vehicle No */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Number (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., MH01AB1234"
              value={form.vehicle_no}
              onChangeText={v => updateForm('vehicle_no', v)}
              placeholderTextColor={Colors.textLight}
            />
          </View>

          {/* Stay Hours */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Expected Stay (hours)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={form.stay_hours}
                onValueChange={v => updateForm('stay_hours', v)}
                style={styles.picker}
              >
                {[1, 2, 3, 4, 5, 6, 8, 12, 24].map(h => (
                  <Picker.Item key={h} label={`${h}h`} value={String(h)} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, submitting && styles.btnDisabled]}
            onPress={handleSubmitRegistration}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnText}>Submit Registration</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Step 3: Waiting for Approval */}
      {step === 3 && (
        <View style={styles.approvalWaitingContainer}>
          <View style={styles.approvalContent}>
            <Text style={styles.approvalEmoji}>📋</Text>
            <Text style={styles.approvalTitle}>Registration Submitted</Text>
            <Text style={styles.approvalMessage}>Registration ID: {registrationId}</Text>

            <View style={styles.statusBox}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text
                style={[
                  styles.statusValue,
                  approvalStatus === 'Approved' && styles.statusApproved,
                  approvalStatus === 'Rejected' && styles.statusRejected,
                  approvalStatus === 'Pending' && styles.statusPending,
                ]}
              >
                {approvalStatus === 'Approved' && '✅ Approved'}
                {approvalStatus === 'Rejected' && '❌ Rejected'}
                {approvalStatus === 'Pending' && '⏳ Awaiting Approval'}
              </Text>
            </View>

            {approvalStatus === 'Pending' && (
              <View style={styles.waitingMessage}>
                <Text style={styles.waitingText}>
                  Your registration has been sent to the flat owner.{'\n'}
                  Please wait while they review your request.
                </Text>
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 16 }} />
              </View>
            )}

            {approvalStatus === 'Pending' && (
              <TouchableOpacity style={styles.backToDashboardBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backToDashboardBtnText}>← Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
  },
  content: {
    padding: SW(20),
    paddingBottom: SH(100),
  },
  header: {
    marginBottom: SH(24),
  },
  title: {
    fontSize: SF(24),
    fontWeight: '800',
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: SF(13),
    color: Colors.textLight,
    marginTop: SH(4),
  },
  backBtn: {
    color: Colors.primary,
    fontSize: SF(14),
    fontWeight: '600',
    marginBottom: SH(12),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH(60),
  },
  emptyText: {
    fontSize: SF(14),
    color: Colors.textLight,
    marginBottom: SH(16),
  },
  retryBtn: {
    paddingHorizontal: SW(20),
    paddingVertical: SH(10),
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: SF(14),
  },
  societyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: SW(14),
    marginBottom: SH(10),
    borderWidth: SW(2),
    borderColor: 'transparent',
  },
  societyCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.bgLight,
  },
  societyCheckbox: {
    width: SW(24),
    height: SH(24),
    borderRadius: SW(6),
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SW(12),
    borderWidth: SW(2),
    borderColor: Colors.textLight,
  },
  checkmark: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: SF(14),
  },
  societyName: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
  },
  societyAddress: {
    fontSize: SF(12),
    color: Colors.textLight,
    marginTop: SH(4),
  },
  formGroup: {
    marginBottom: SH(18),
  },
  label: {
    fontSize: SF(13),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(8),
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: Colors.border,
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    fontSize: SF(13),
    color: Colors.textDark,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  picker: {
    height: SH(44),
  },
  btn: {
    paddingVertical: SH(14),
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SH(24),
    backgroundColor: Colors.accentLight,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: SF(15),
  },
  approvalWaitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SW(20),
  },
  approvalContent: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: SW(24),
    alignItems: 'center',
    ...Shadow.card,
  },
  approvalEmoji: {
    fontSize: SF(64),
    marginBottom: SH(16),
  },
  approvalTitle: {
    fontSize: SF(18),
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: SH(8),
  },
  approvalMessage: {
    fontSize: SF(12),
    color: Colors.textLight,
    marginBottom: SH(20),
  },
  statusBox: {
    width: '100%',
    backgroundColor: Colors.bgLight,
    borderRadius: Radius.md,
    paddingHorizontal: SW(16),
    paddingVertical: SH(14),
    marginBottom: SH(20),
  },
  statusLabel: {
    fontSize: SF(11),
    color: Colors.textLight,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: SF(16),
    fontWeight: '700',
    marginTop: SH(6),
  },
  statusPending: {
    color: '#f59e0b',
  },
  statusApproved: {
    color: '#10b981',
  },
  statusRejected: {
    color: '#ef4444',
  },
  waitingMessage: {
    width: '100%',
    alignItems: 'center',
  },
  waitingText: {
    fontSize: SF(13),
    color: Colors.textMid,
    textAlign: 'center',
    lineHeight: SH(18),
  },
  backToDashboardBtn: {
    marginTop: SH(24),
    paddingVertical: SH(10),
    paddingHorizontal: SW(20),
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.md,
  },
  backToDashboardBtnText: {
    color: Colors.accent,
    fontWeight: '600',
    fontSize: SF(13),
  },
});
