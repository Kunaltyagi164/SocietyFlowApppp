// src/screens/Visitors/NewVisitorScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createVisitorRegistration } from '../../services/api';
import { SFButton, ScreenBackground } from '../../components';
import { Colors, Radius, Fonts } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

export default function NewVisitorScreen({ navigation }) {
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [purpose, setPurpose] = useState('');
  const [date,    setDate]    = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) { Alert.alert('Required', 'Name and phone are required'); return; }
    setLoading(true);
    try {
      await createVisitorRegistration({ visitor_name: name.trim(), visitor_phone: phone.trim(), purpose: purpose.trim(), expected_date: date.trim() });
      Alert.alert('✅ Registered', 'Visitor pre-registered successfully!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={20} color={Colors.textWhite} />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name="clipboard-list-outline" size={22} color={Colors.textWhite} />
          <Text style={styles.title}>Pre-register Visitor</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBanner}>
          <MaterialCommunityIcons name="information-outline" size={18} color={Colors.teal} style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>Pre-registered visitors get fast gate entry without a call.</Text>
        </View>

        <Text style={styles.label}>VISITOR NAME *</Text>
        <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={Colors.textDark}
          value={name} onChangeText={setName} returnKeyType="next" />

        <Text style={styles.label}>MOBILE NUMBER *</Text>
        <TextInput style={styles.input} placeholder="10-digit number" placeholderTextColor={Colors.textDark}
          value={phone} onChangeText={setPhone} keyboardType="phone-pad" returnKeyType="next" />

        <Text style={styles.label}>PURPOSE</Text>
        <TextInput style={styles.input} placeholder="e.g. Family visit, Delivery, Repair"
          placeholderTextColor={Colors.textDark} value={purpose} onChangeText={setPurpose} returnKeyType="next" />

        <Text style={styles.label}>EXPECTED DATE (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} placeholder="e.g. 2025-12-25"
          placeholderTextColor={Colors.textDark} value={date} onChangeText={setDate} />

        <SFButton label="Pre-register Visitor" onPress={submit} loading={loading} style={{ marginTop: 12 }} />
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: Colors.royalBlue, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  closeBtn:  { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { fontSize: 16, color: Colors.textWhite },
  title:     { fontSize: 18, fontWeight: '800', color: Colors.textWhite, fontFamily: Fonts.Poppins_Bold },
  body:      { padding: 16, paddingBottom: 40 },
  infoBanner:{ backgroundColor: Colors.tealLight, borderRadius: Radius.lg, padding: 14, marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start' },
  infoText:  { fontSize: 13, color: Colors.textDark, lineHeight: 19, flex: 1, fontFamily: Fonts.Poppins_Regular },
  label:     { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 8, fontFamily: Fonts.Poppins_Medium },
  input: {
    backgroundColor: Colors.bgWhite, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: Colors.textDark, marginBottom: 14,
    fontFamily: Fonts.Poppins_Regular,
  },
});
