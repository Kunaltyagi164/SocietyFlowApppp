// src/screens/Visitors/InviteFriendScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
  ToastAndroid, Clipboard, Linking, Share, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateVisitorInvite } from '../../services/api';
import { ScreenBackground } from '../../components';
import { SF, SH, SW } from '../../utils/responsive';

const PRIMARY = '#2563EB';
const BG      = '#F5F5F5';
const WHITE   = '#FFFFFF';
const BORDER  = '#E5E7EB';
const TEXT    = '#1F2937';
const MUTED   = '#6B7280';

const EXPIRES_OPTIONS = [
  { label: '1 day',   value: 1 },
  { label: '3 days',  value: 3 },
  { label: '7 days',  value: 7 },
  { label: '2 weeks', value: 14 },
  { label: '1 month', value: 30 },
];

// Simple date picker using modal
const DatePickerModal = ({ visible, selectedDate, onSelect, onClose }) => {
  const today = new Date();
  const dates = [{ label: 'No specific date', iso: '' },
    ...Array.from({ length: 31 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      return { label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }), iso };
    })
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dp.overlay}>
        <View style={dp.sheet}>
          <View style={dp.header}>
            <Text style={dp.title}>Expected Visit Date</Text>
            <TouchableOpacity onPress={onClose}><Text style={dp.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            {dates.map(d => {
              const isSelected = selectedDate === d.iso;
              return (
                <TouchableOpacity key={d.iso || '__none'} style={[dp.row, isSelected && dp.rowSelected]}
                  onPress={() => { onSelect(d.iso); onClose(); }}>
                  <Text style={[dp.rowText, isSelected && dp.rowTextSelected]}>{d.label}</Text>
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
  sheet:   { backgroundColor: WHITE, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', paddingBottom: 32 },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: BORDER },
  title:   { fontSize: 16, fontWeight: '700', color: TEXT },
  close:   { fontSize: 18, color: MUTED, padding: 4 },
  row:     { paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowSelected:     { backgroundColor: '#EFF6FF' },
  rowText:         { fontSize: 15, color: TEXT },
  rowTextSelected: { color: PRIMARY, fontWeight: '700' },
  check:   { fontSize: 16, color: PRIMARY, fontWeight: '700' },
});

export default function InviteFriendScreen({ navigation }) {
  const [visitDate, setVisitDate]       = useState('');
  const [expiresDays, setExpiresDays]   = useState(7);
  const [notes, setNotes]               = useState('');
  const [flatNo, setFlatNo]             = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [inviteData, setInviteData]     = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [copied, setCopied]             = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user').then(raw => {
      if (!raw) return;
      try {
        const u = JSON.parse(raw);
        setFlatNo(u?.flat_no || u?.apartment || u?.flat || '');
      } catch {}
    });
  }, []);

  const formatDisplayDate = (iso) => {
    if (!iso) return 'No specific date';
    try {
      return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return iso; }
  };

  const handleGenerate = async () => {
    setSubmitting(true);
    try {
      const res = await generateVisitorInvite({
        ...(visitDate ? { visit_date: visitDate } : {}),
        expires_days: expiresDays,
        notes: notes.trim(),
        flat_no: flatNo,
      });
      const data = res.data?.data || res.data;
      setInviteData(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to generate invite';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getShareMessage = () =>
    `Hi! I'm inviting you to visit me at Flat ${flatNo}.\n\nPlease fill in your details here:\n${inviteData?.invite_url}`;

  const handleCopyLink = () => {
    Clipboard.setString(inviteData?.invite_url || '');
    setCopied(true);
    ToastAndroid.show('🔗 Link copied!', ToastAndroid.SHORT);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(getShareMessage());
    Linking.openURL(`https://wa.me/?text=${msg}`).catch(() =>
      Alert.alert('WhatsApp not installed', 'Please copy the link and share manually.')
    );
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('Visit Invite');
    const body = encodeURIComponent(getShareMessage());
    Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() =>
      Alert.alert('Error', 'Could not open mail app.')
    );
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({ message: getShareMessage(), url: inviteData?.invite_url });
    } catch {}
  };

  const handleReset = () => {
    setInviteData(null);
    setCopied(false);
  };

  return (
    <ScreenBackground>
    <SafeAreaView style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Text style={S.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={S.title}>🔗 Invite a Friend</Text>
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {!inviteData ? (
          /* ── Form ── */
          <>
            <Text style={S.subtitle}>Generate a unique invite link to share with your guest. They'll fill in their own details.</Text>

            {/* Expected Visit Date */}
            <View style={S.fieldGroup}>
              <Text style={S.label}>Expected Visit Date (optional)</Text>
              <TouchableOpacity style={S.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                <Text style={visitDate ? S.inputText : S.inputPlaceholder}>
                  {formatDisplayDate(visitDate)}
                </Text>
                <Text style={S.chevron}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Link Expires */}
            <View style={S.fieldGroup}>
              <Text style={S.label}>Link Expires After</Text>
              <View style={S.chipRow}>
                {EXPIRES_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.value}
                    style={[S.chip, expiresDays === o.value && S.chipActive]}
                    onPress={() => setExpiresDays(o.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[S.chipText, expiresDays === o.value && S.chipTextActive]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message for Guest */}
            <View style={S.fieldGroup}>
              <Text style={S.label}>Message for Guest (optional)</Text>
              <TextInput
                style={[S.input, S.inputMultiline]}
                placeholder="e.g. Please arrive by 11 AM"
                placeholderTextColor={MUTED}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[S.submitBtn, submitting && S.submitBtnDisabled]}
              onPress={handleGenerate}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting
                ? <ActivityIndicator color={WHITE} />
                : <Text style={S.submitBtnText}>🔗 Generate Invite Link</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          /* ── Result / Share Sheet ── */
          <>
            <View style={S.successCard}>
              <Text style={S.successEmoji}>✅</Text>
              <Text style={S.successTitle}>Invite Link Ready!</Text>
              <Text style={S.successSubtitle}>Share this with your guest so they can fill in their details before arriving.</Text>
            </View>

            <View style={S.linkBox}>
              <Text style={S.linkText} numberOfLines={2} selectable>{inviteData?.invite_url}</Text>
            </View>

            {inviteData?.expires_at && (
              <Text style={S.expiry}>
                Expires: {new Date(inviteData.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}

            {/* Share Options */}
            <View style={S.shareSection}>
              <Text style={S.shareTitle}>Share via</Text>

              <TouchableOpacity style={S.shareRow} onPress={handleWhatsApp} activeOpacity={0.7}>
                <View style={[S.shareIcon, { backgroundColor: '#dcfce7' }]}>
                  <Text style={S.shareIconText}>📱</Text>
                </View>
                <View style={S.shareInfo}>
                  <Text style={S.shareLabel}>WhatsApp</Text>
                  <Text style={S.shareHint}>Opens WhatsApp with pre-filled message</Text>
                </View>
                <Text style={S.shareArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={S.shareRow} onPress={handleCopyLink} activeOpacity={0.7}>
                <View style={[S.shareIcon, { backgroundColor: '#eff6ff' }]}>
                  <Text style={S.shareIconText}>📋</Text>
                </View>
                <View style={S.shareInfo}>
                  <Text style={S.shareLabel}>Copy Link</Text>
                  <Text style={S.shareHint}>{copied ? '✅ Copied to clipboard!' : 'Copies invite URL to clipboard'}</Text>
                </View>
                <Text style={S.shareArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={S.shareRow} onPress={handleEmail} activeOpacity={0.7}>
                <View style={[S.shareIcon, { backgroundColor: '#fef9c3' }]}>
                  <Text style={S.shareIconText}>✉️</Text>
                </View>
                <View style={S.shareInfo}>
                  <Text style={S.shareLabel}>Email</Text>
                  <Text style={S.shareHint}>Opens mail app with invite link</Text>
                </View>
                <Text style={S.shareArrow}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={S.shareRow} onPress={handleNativeShare} activeOpacity={0.7}>
                <View style={[S.shareIcon, { backgroundColor: '#f3e8ff' }]}>
                  <Text style={S.shareIconText}>📤</Text>
                </View>
                <View style={S.shareInfo}>
                  <Text style={S.shareLabel}>More Options</Text>
                  <Text style={S.shareHint}>Share via any app</Text>
                </View>
                <Text style={S.shareArrow}>›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={S.resetBtn} onPress={handleReset} activeOpacity={0.7}>
              <Text style={S.resetBtnText}>Generate Another Link</Text>
            </TouchableOpacity>
          </>
        )}
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
    backgroundColor: '#2563EB',
    borderBottomWidth: 0,
    borderBottomColor: BORDER,
    gap: SW(12),
  },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 17, color: '#FFFFFF', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: MUTED, lineHeight: 20, marginBottom: 20 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: MUTED, marginBottom: 6 },

  input: {
    backgroundColor: WHITE,
    borderWidth: SW(1),
    borderColor: BORDER,
    borderRadius: SW(10),
    paddingHorizontal: SW(14),
    paddingVertical: SH(12),
    fontSize: SF(15),
    color: TEXT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: { fontSize: 15, color: TEXT, flex: 1 },
  inputPlaceholder: { fontSize: 15, color: MUTED, flex: 1 },
  inputMultiline: { height: 80, paddingTop: 12, flexDirection: undefined, alignItems: undefined, justifyContent: undefined },
  chevron: { fontSize: 20, color: MUTED },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: SW(14),
    paddingVertical: SH(8),
    borderRadius: SW(20),
    borderWidth: SW(1),
    borderColor: BORDER,
    backgroundColor: WHITE,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 13, color: TEXT, fontWeight: '500' },
  chipTextActive: { color: WHITE, fontWeight: '600' },

  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: SW(12),
    paddingVertical: SH(15),
    alignItems: 'center',
    marginTop: SH(8),
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: WHITE },

  // Result
  successCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: SW(14),
    borderWidth: SW(1),
    borderColor: '#bbf7d0',
    padding: SW(20),
    alignItems: 'center',
    marginBottom: SH(16),
  },
  successEmoji: { fontSize: 36, marginBottom: 8 },
  successTitle: { fontSize: 18, fontWeight: '800', color: '#15803d', marginBottom: 4 },
  successSubtitle: { fontSize: 13, color: '#4b7a5c', textAlign: 'center', lineHeight: 18 },

  linkBox: {
    backgroundColor: '#eff6ff',
    borderRadius: SW(10),
    borderWidth: SW(1),
    borderColor: '#bfdbfe',
    padding: SW(14),
    marginBottom: SH(8),
  },
  linkText: { fontSize: 13, color: PRIMARY, fontWeight: '500', lineHeight: 20 },

  expiry: { fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 20 },

  shareSection: {
    backgroundColor: WHITE,
    borderRadius: SW(14),
    borderWidth: SW(1),
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: SH(16),
  },
  shareTitle: { fontSize: 13, fontWeight: '600', color: MUTED, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SW(16),
    paddingVertical: SH(13),
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: SW(14),
  },
  shareIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  shareIconText: { fontSize: 20 },
  shareInfo: { flex: 1 },
  shareLabel: { fontSize: 15, fontWeight: '600', color: TEXT },
  shareHint: { fontSize: 12, color: MUTED, marginTop: 1 },
  shareArrow: { fontSize: 20, color: MUTED },

  resetBtn: {
    borderWidth: SW(1),
    borderColor: PRIMARY,
    borderRadius: SW(12),
    paddingVertical: SH(13),
    alignItems: 'center',
  },
  resetBtnText: { fontSize: 15, fontWeight: '600', color: PRIMARY },
});
