// src/screens/Complaints/NewComplaintScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { createComplaint } from '../../services/api';
import { SFButton, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

const CATEGORIES = ['General', 'Plumbing', 'Electrical', 'Lift', 'Parking', 'Security', 'Cleaning', 'Noise', 'Internet', 'Other'];
const PRIORITIES = [
  { value: 'Low',    label: 'Low',    emoji: '🟢' },
  { value: 'Medium', label: 'Medium', emoji: '🟡' },
  { value: 'High',   label: 'High',   emoji: '🟠' },
  { value: 'Urgent', label: 'Urgent', emoji: '🔴' },
];

export default function NewComplaintScreen({ navigation }) {
  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Medium');
  const [loading,  setLoading]  = useState(false);

  const submit = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title for the complaint'); return; }
    setLoading(true);
    try {
      // Backend auto-fills flat_no and resident_name from token
      await createComplaint({
        title: title.trim(),
        description: desc.trim(),
        category,
        priority,
      });
      Alert.alert('✅ Submitted', 'Your complaint has been raised successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to submit. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Raise an Issue</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Category */}
        <Text style={styles.label}>CATEGORY</Text>
        <View style={styles.chips}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}>
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 20 }]}>TITLE *</Text>
        <TextInput style={styles.input} placeholder="e.g. Water leakage in bathroom"
          placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle}
          returnKeyType="next" />

        <Text style={[styles.label, { marginTop: 4 }]}>DESCRIPTION</Text>
        <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Describe the issue in detail..."
          placeholderTextColor={Colors.textLight}
          value={desc} onChangeText={setDesc} multiline />

        <Text style={[styles.label, { marginTop: 4 }]}>PRIORITY</Text>
        <View style={styles.priorities}>
          {PRIORITIES.map(p => (
            <TouchableOpacity key={p.value}
              style={[styles.prioBtn, priority === p.value && styles.prioBtnActive]}
              onPress={() => setPriority(p.value)}>
              <Text style={{ fontSize: 18 }}>{p.emoji}</Text>
              <Text style={[styles.prioText, priority === p.value && { color: Colors.accent, fontWeight: '700' }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <SFButton label="Submit Issue" onPress={submit} loading={loading} style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#2563EB' },
  closeBtn:  { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 16, color: '#FFFFFF' },
  title:     { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  body:      { padding: 20, paddingBottom: 60 },
  label:     { fontSize: 11, fontWeight: '700', color: Colors.textLight, letterSpacing: 0.8, marginBottom: 10 },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.inputFill, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  chipActive:     { backgroundColor: Colors.accent + '15', borderColor: Colors.accent },
  chipText:       { fontSize: 13, fontWeight: '600', color: Colors.textMid },
  chipTextActive: { color: Colors.accent },
  input: {
    backgroundColor: Colors.inputFill, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 14, color: Colors.textDark, marginBottom: 14,
  },
  priorities: { flexDirection: 'row', gap: 8 },
  prioBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    backgroundColor: Colors.inputFill, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  prioBtnActive: { backgroundColor: Colors.accentLight, borderColor: Colors.accent },
  prioText:      { fontSize: 11, fontWeight: '600', color: Colors.textMid },
});
