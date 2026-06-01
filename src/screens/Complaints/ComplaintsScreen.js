// src/screens/Complaints/ComplaintsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getComplaints } from '../../services/api';
import { StatusBadge, EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow, Spacing, Fonts } from '../../theme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SF, SH, SW } from '../../utils/responsive';

const CAT_EMOJI = (c = '') => {
  const t = c.toLowerCase();
  if (t.includes('plumb'))   return 'pipe';
  if (t.includes('elect'))   return 'lightning-bolt-outline';
  if (t.includes('secur'))   return 'shield-lock-outline';
  if (t.includes('clean'))   return 'broom';
  if (t.includes('park'))    return 'parking';
  if (t.includes('lift') || t.includes('elevator')) return 'elevator-passenger';
  if (t.includes('noise'))   return 'volume-high';
  if (t.includes('internet') || t.includes('wifi')) return 'wifi-off';
  if (t.includes('water'))   return 'water-pump';
  if (t.includes('gas'))     return 'gas-cylinder';
  if (t.includes('pest'))    return 'bug-outline';
  if (t.includes('light'))   return 'lightbulb-outline';
  if (t.includes('road') || t.includes('path')) return 'road';
  if (t.includes('gate'))    return 'gate';
  if (t.includes('garden') || t.includes('tree')) return 'tree-outline';
  return 'clipboard-list-outline';
};

export default function ComplaintsScreen({ navigation }) {
  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const user = await AsyncStorage.getItem('user');
      const userObj = user ? JSON.parse(user) : null;
      const residentId = userObj?.id;
      
      console.log('\n💬 [ComplaintsScreen] Loading complaints for resident...');
      console.log(`   👤 Resident ID: ${residentId}`);
      console.log(`   👤 Name: ${userObj?.name || 'N/A'}`);
      
      const r = await getComplaints();
      const complaintsData = r.data?.data || [];
      setData(complaintsData);
      
      console.log(`   ✅ Loaded ${complaintsData.length} complaints (resident-specific via JWT token)`);
      if (complaintsData.length > 0) {
        const openCount = complaintsData.filter(c => c.status !== 'resolved').length;
        const resolvedCount = complaintsData.filter(c => c.status === 'resolved').length;
        console.log(`   📊 Open: ${openCount}, Resolved: ${resolvedCount}`);
      }
      console.log('✅ [ComplaintsScreen] Complaints fetched successfully\n');
    }
    catch (err) {
      console.error('❌ [ComplaintsScreen] Error loading complaints:', err.message);
    }
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [navigation]);

  // Auto-refresh every 20 seconds
  useAutoRefresh(() => load(true), true, 20000);

  if (loading) return <ScreenLoader />;

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <Text style={styles.title}>Issues</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewComplaint')}>
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {data.length === 0 ? (
        <EmptyState emoji="📋" title="No issues raised"
          subtitle="Tap New to raise a complaint"
          buttonLabel="Raise Issue" onButton={() => navigation.navigate('NewComplaint')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.teal}
            onRefresh={() => { setRefreshing(true); load(true); }} />}>
          {data.map(c => <ComplaintCard key={c.id} c={c} onPress={() => navigation.navigate('DetailedComplaint', { complaint: c })} />)}
        </ScrollView>
      )}
    </SafeAreaView>
    </ScreenBackground>
  );
}

function ComplaintCard({ c, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHead}>
        <View style={styles.catIcon}>
          <MaterialCommunityIcons name={CAT_EMOJI(c.category)} size={24} color={Colors.teal} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.subject} numberOfLines={1}>{c.title}</Text>
          <Text style={styles.cat}>{c.category || 'General'}</Text>
        </View>
        <StatusBadge status={c.status || 'open'} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: '#2563EB',
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
  },
  title: {
    flex: 1,
    fontSize: SF(32),
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    letterSpacing: SW(-0.5),
  },
  addBtn: {
    backgroundColor: Colors.vibrantRed,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtnText: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: SW(1),
    borderColor: `${Colors.grayGreen}4D`, // 30% opacity
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.md,
    ...Shadow.soft,
  },
  cardHead:    { flexDirection: 'row', alignItems: 'center' },
  catIcon: {
    width: SW(48),
    height: SH(48),
    backgroundColor: `${Colors.grayGreen}20`, // 12% opacity
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: `${Colors.grayGreen}40`, // 25% opacity
    alignItems: 'center',
    justifyContent: 'center',
  },
  subject: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.charcoal,
    fontFamily: Fonts.bold,
  },
  cat: {
    fontSize: SF(12),
    color: Colors.grayGreen,
    marginTop: Spacing.xs,
    fontFamily: Fonts.regular,
  },
});
