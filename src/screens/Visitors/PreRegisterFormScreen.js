// src/screens/Visitors/PreRegisterFormScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  ToastAndroid, Platform, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { preRegisterVisitor } from '../../services/api';
import { ScreenBackground, SocietyFooter } from '../../components';
import { Colors, Fonts } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

const formatDisplayDate = (isoDate) => {
  const [yyyy, mm, dd] = isoDate.split('-');
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const VISITOR_TYPES = [
  { key: 'friend',   label: 'Friend',   iconName: 'human-greeting' },
  { key: 'family',   label: 'Family',   iconName: 'home-heart' },
  { key: 'guest',    label: 'Guest',    iconName: 'account-tie' },
  { key: 'delivery', label: 'Delivery', iconName: 'package' },
  { key: 'service',  label: 'Service',  iconName: 'wrench' },
  { key: 'other',    label: 'Other',    iconName: 'dots-horizontal' },
];

// Simple date picker using modal
const DatePickerModal = ({ visible, selectedDate, onSelect, onClose }) => {
  const today = new Date();
  const dates = Array.from({ length: 31 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dp.overlay}>
        <View style={dp.sheet}>
          <View style={dp.header}>
            <Text style={dp.title}>Select Visit Date</Text>
            <TouchableOpacity onPress={onClose}><Text style={dp.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {dates.map(d => {
              const iso = d.toISOString().slice(0, 10);
              const isSelected = selectedDate === iso;
              const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
              return (
                <TouchableOpacity key={iso} style={[dp.row, isSelected && dp.rowSelected]} onPress={() => { onSelect(iso); onClose(); }}>
                  <Text style={[dp.rowText, isSelected && dp.rowTextSelected]}>{label}</Text>
                  {isSelected && <Text style={dp.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const dp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:   { backgroundColor: Colors.bgWhite, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', paddingBottom: 32 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title:   { fontSize: 16, fontWeight: '700', color: Colors.textDark },
  close:   { fontSize: 18, color: Colors.textSecondary, padding: 4 },
  row:     { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowSelected:     { backgroundColor: Colors.primaryLight },
  rowText:         { fontSize: 15, color: Colors.textDark },
  rowTextSelected: { color: Colors.appBlue, fontWeight: '700' },
  check:   { fontSize: 16, color: Colors.appBlue, fontWeight: '700' },
});

export default function PreRegisterFormScreen({ navigation, route }) {
  const isDelivery = route?.params?.type === 'delivery';

  const [visitorName, setVisitorName]   = useState('');
  const [phone, setPhone]               = useState('');
  const [visitDate, setVisitDate]       = useState(new Date().toISOString().slice(0, 10));
  const [numVisitors, setNumVisitors]   = useState('1');
  const [visitorType, setVisitorType]   = useState(isDelivery ? 'delivery' : 'friend');
  const [vehicleNo, setVehicleNo]       = useState('');
  const [email, setEmail]               = useState('');
  const [notes, setNotes]               = useState('');
  const [flatNo, setFlatNo]             = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user').then(raw => {
      if (!raw) return;
      try {
        const u = JSON.parse(raw);
        const flat = u?.flat_no || u?.apartment || u?.flat || '';
        setFlatNo(flat);
      } catch {}
    });
  }, []);

  const formatDisplayDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const handleSubmit = async () => {
    if (!visitorName.trim()) {
      Alert.alert('Required', 'Please enter visitor name.');
      return;
    }
    if (!visitDate) {
      Alert.alert('Required', 'Please select a visit date.');
      return;
    }

    setSubmitting(true);
    try {
      await preRegisterVisitor({
        visitor_name: visitorName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        visitor_type: visitorType,
        vehicle_no: vehicleNo.trim(),
        num_visitors: parseInt(numVisitors, 10) || 1,
        notes: notes.trim(),
        visit_date: visitDate,
        flat_no: flatNo,
      });

      ToastAndroid.show('✅ Visitor pre-registered!', ToastAndroid.LONG);
      navigation.goBack();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to pre-register';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenBackground>
    <SafeAreaView style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={S.backBtn}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={Colors.textWhite} />
          <Text style={S.backText}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name={isDelivery ? 'package-variant' : 'clipboard-list-outline'} size={24} color={Colors.textWhite} />
          <Text style={S.title}>{isDelivery ? 'Register Delivery' : 'Pre-Register Visitor'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        {/* Flat No (read-only) */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Your Flat Number</Text>
          <View style={[S.input, S.inputDisabled]}>
            <Text style={S.inputDisabledText}>{flatNo || 'Loading...'}</Text>
          </View>
        </View>

        {/* Visitor Name */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Visitor Full Name <Text style={S.required}>*</Text></Text>
          <TextInput
            style={S.input}
            placeholder="e.g. Amit Kumar"
            placeholderTextColor={MUTED}
            value={visitorName}
            onChangeText={setVisitorName}
            autoCapitalize="words"
          />
        </View>

        {/* Phone */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Phone Number</Text>
          <TextInput
            style={S.input}
            placeholder="e.g. 9876543210"
            placeholderTextColor={MUTED}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </View>

        {/* Visit Date */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Visit Date <Text style={S.required}>*</Text></Text>
          <TouchableOpacity style={S.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
            <Text style={visitDate ? S.inputText : S.inputPlaceholder}>
              {visitDate ? formatDisplayDate(visitDate) : 'Select date'}
            </Text>
            <Text style={S.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Number of Visitors */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Number of Visitors</Text>
          <View style={S.stepper}>
            <TouchableOpacity
              style={S.stepBtn}
              onPress={() => setNumVisitors(v => String(Math.max(1, parseInt(v,10) - 1)))}
            >
              <Text style={S.stepBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={S.stepValue}>{numVisitors}</Text>
            <TouchableOpacity
              style={S.stepBtn}
              onPress={() => setNumVisitors(v => String(Math.min(20, parseInt(v,10) + 1)))}
            >
              <Text style={S.stepBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Visitor Type */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Visitor Type</Text>
          <View style={S.chipRow}>
            {VISITOR_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[S.chip, visitorType === t.key && S.chipActive]}
                onPress={() => setVisitorType(t.key)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name={t.iconName} 
                  size={16} 
                  color={visitorType === t.key ? Colors.textWhite : Colors.textDark}
                  style={{ marginRight: 6 }}
                />
                <Text style={[S.chipText, visitorType === t.key && S.chipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vehicle Number */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Vehicle Number</Text>
          <TextInput
            style={S.input}
            placeholder="e.g. MH01AB1234"
            placeholderTextColor={MUTED}
            value={vehicleNo}
            onChangeText={setVehicleNo}
            autoCapitalize="characters"
          />
        </View>

        {/* Email */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Email</Text>
          <TextInput
            style={S.input}
            placeholder="visitor@email.com"
            placeholderTextColor={MUTED}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Notes */}
        <View style={S.fieldGroup}>
          <Text style={S.label}>Notes</Text>
          <TextInput
            style={[S.input, S.inputMultiline]}
            placeholder="e.g. Ring the bell twice"
            placeholderTextColor={MUTED}
            value={notes}
            onChangeText={t => setNotes(t.slice(0, 500))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <Text style={S.charCount}>{notes.length}/500</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[S.submitBtn, submitting && S.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting
            ? <ActivityIndicator color={Colors.textWhite} />
            : <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <MaterialCommunityIcons name={isDelivery ? 'package-check' : 'check-circle-outline'} size={18} color={Colors.textWhite} />
                <Text style={S.submitBtnText}>{isDelivery ? 'Register Delivery' : 'Pre-Register Visitor'}</Text>
              </View>
          }
        </TouchableOpacity>

        <SocietyFooter
          societyName={flatNo ? `SocietyFlow Resident • Flat ${flatNo}` : 'SocietyFlow Resident'}
          emergencyPhone="+91-1122334455"
          adminEmail="support@societyflow.in"
          onHelp={() => navigation.navigate('Emergency')}
          onSettings={() => navigation.navigate('ProfileManagement')}
          onPrivacy={() => Alert.alert('Privacy Policy', 'Privacy policy will be available here soon.')}
          onTerms={() => Alert.alert('Terms & Conditions', 'Terms & conditions will be available here soon.')}
        />
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        selectedDate={visitDate}
        onSelect={setVisitDate}
        onClose={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
    </ScreenBackground>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    backgroundColor: Colors.royalBlue,
    gap: SW(12),
    borderBottomLeftRadius: SW(24),
    borderBottomRightRadius: SW(24),
  },
  backBtn: {
    paddingHorizontal: SW(8),
    paddingVertical: SH(6),
    borderRadius: SW(14),
    backgroundColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: SF(14),
    color: Colors.textWhite,
    fontWeight: '700',
    marginLeft: SW(2),
    fontFamily: Fonts.Poppins_Bold,
  },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textWhite, flex: 1, fontFamily: Fonts.Poppins_Bold },
  scroll: { padding: 16, paddingBottom: 40 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, fontFamily: Fonts.Poppins_Medium },
  required: { color: Colors.danger },

  input: {
    backgroundColor: Colors.bgWhite,
    borderWidth: SW(1),
    borderColor: Colors.border,
    borderRadius: SW(12),
    paddingHorizontal: SW(14),
    paddingVertical: SH(12),
    fontSize: SF(15),
    color: Colors.textDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: Fonts.Poppins_Regular,
  },
  inputText: { fontSize: 15, color: Colors.textDark, flex: 1, fontFamily: Fonts.Poppins_Regular },
  inputPlaceholder: { fontSize: 15, color: Colors.textSecondary, flex: 1, fontFamily: Fonts.Poppins_Regular },
  inputDisabled: { backgroundColor: Colors.primaryLight },
  inputDisabledText: { fontSize: 15, color: Colors.textSecondary, fontFamily: Fonts.Poppins_Regular },
  inputMultiline: { height: 80, paddingTop: 12, flexDirection: undefined, alignItems: undefined, justifyContent: undefined },
  chevron: { fontSize: 20, color: Colors.textSecondary },
  charCount: { fontSize: 11, color: Colors.textSecondary, textAlign: 'right', marginTop: 4, fontFamily: Fonts.Poppins_Regular },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgWhite,
    borderWidth: SW(1),
    borderColor: Colors.border,
    borderRadius: SW(12),
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  stepBtn: { paddingHorizontal: 18, paddingVertical: 12 },
  stepBtnText: { fontSize: 20, color: Colors.appBlue, fontWeight: '700', fontFamily: Fonts.Poppins_Bold },
  stepValue: { fontSize: 16, fontWeight: '700', color: Colors.textDark, minWidth: 36, textAlign: 'center', fontFamily: Fonts.Poppins_Bold },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: SW(14),
    paddingVertical: SH(8),
    borderRadius: SW(20),
    borderWidth: SW(1),
    borderColor: Colors.border,
    backgroundColor: Colors.bgWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.appBlue, borderColor: Colors.appBlue },
  chipText: { fontSize: 13, color: Colors.textDark, fontWeight: '500', fontFamily: Fonts.Poppins_Medium },
  chipTextActive: { color: Colors.textWhite, fontWeight: '600', fontFamily: Fonts.Poppins_Bold },

  submitBtn: {
    backgroundColor: Colors.appBlue,
    borderRadius: SW(16),
    paddingVertical: SH(15),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SH(8),
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.textWhite, fontFamily: Fonts.Poppins_Bold },
});
