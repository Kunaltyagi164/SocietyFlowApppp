// src/screens/Vendors/VendorsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, Alert, Linking } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getVendorsWithCache } from '../../services/api';
import { EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

const VENDOR_ICON = (category = '') => {
  const c = category.toLowerCase();
  if (c.includes('electric')) return 'flash';
  if (c.includes('plumb')) return 'water-pump';
  if (c.includes('paint')) return 'brush-variant';
  if (c.includes('carpen')) return 'hammer';
  if (c.includes('clean')) return 'broom';
  if (c.includes('maid')) return 'account-hard-hat';
  if (c.includes('repair')) return 'wrench';
  if (c.includes('secur')) return 'shield-lock-outline';
  if (c.includes('medical') || c.includes('doctor')) return 'medical-bag';
  if (c.includes('food')) return 'silverware-fork-knife';
  if (c.includes('gym')) return 'dumbbell';
  return 'account-cog-outline';
};

const STARS = (rating) => {
  if (!rating || rating <= 0) return null;
  const full = Math.floor(rating);
  return Array.from({ length: 5 }).map((_, idx) => idx < full);
};

export default function VendorsScreen({ navigation }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (quiet = false, forceRefresh = false) => {
    if (!quiet) setLoading(true);
    try {
      const r = await getVendorsWithCache(forceRefresh);
      setVendors(r.data?.data || []);
      console.log('👥 [Vendors] Loaded:', r.data?.data?.length || 0, 'vendors');
    } catch (err) {
      console.error('❌ [Vendors] Load error:', err.message);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => load(true));
    return unsub;
  }, [navigation]);

  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert('No phone', 'Phone number not available');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Cannot make call'));
  };

  const handleMap = (address) => {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open maps'));
  };

  if (loading) return <ScreenLoader />;

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <Text style={styles.title}>Society Vendors</Text>
      </View>

      {vendors.length === 0 ? (
        <EmptyState iconName="storefront-outline" title="No vendors" subtitle="Check back later for approved vendors" />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.accent} onRefresh={() => { setRefreshing(true); load(true, true); }} />}
        >
          {vendors.map(vendor => (
            <View key={vendor.id} style={styles.vendorCard}>
              <View style={styles.vendorIcon}>
                <MaterialCommunityIcons
                  name={VENDOR_ICON(vendor.service_type || vendor.category)}
                  size={24}
                  color={Colors.royalBlue}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  {vendor.is_active && (
                    <View style={styles.trustedBadge}>
                      <Text style={styles.trustedText}>✓ Society Trusted</Text>
                    </View>
                  )}
                </View>
                {(vendor.service_type || vendor.category) && <Text style={styles.vendorCategory}>{vendor.service_type || vendor.category}</Text>}
                {vendor.rating > 0 && (
                  <View style={styles.ratingRow}>
                    <View style={styles.ratingStarsWrap}>
                      {STARS(vendor.rating).map((filled, idx) => (
                        <MaterialCommunityIcons
                          key={`${vendor.id}-star-${idx}`}
                          name={filled ? 'star' : 'star-outline'}
                          size={13}
                          color="#F59E0B"
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingNum}>{Number(vendor.rating).toFixed(1)}</Text>
                  </View>
                )}
                {vendor.phone && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="phone-outline" size={13} color={Colors.textMid} />
                    <Text style={styles.vendorPhone}>{vendor.phone}</Text>
                  </View>
                )}
                {vendor.email && (
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="email-outline" size={13} color={Colors.textLight} />
                    <Text style={styles.vendorEmail}>{vendor.email}</Text>
                  </View>
                )}
                {vendor.address && (
                  <TouchableOpacity onPress={() => handleMap(vendor.address)} activeOpacity={0.7}>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.appBlue} />
                      <Text style={styles.vendorAddress}>{vendor.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {vendor.notes ? <Text style={styles.vendorNotes}>{vendor.notes}</Text> : null}
              </View>

              <View style={styles.actionBtns}>
                {vendor.phone && (
                  <TouchableOpacity
                    style={styles.callBtn}
                    onPress={() => handleCall(vendor.phone)}
                  >
                    <MaterialCommunityIcons name="phone" size={18} color={Colors.success} />
                  </TouchableOpacity>
                )}
                {vendor.address && (
                  <TouchableOpacity
                    style={styles.mapBtn}
                    onPress={() => handleMap(vendor.address)}
                  >
                    <MaterialCommunityIcons name="map-search-outline" size={18} color={Colors.appBlue} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#2563EB' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  vendorCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(14),
    marginBottom: SH(12),
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.card,
  },
  vendorIcon: {
    width: SW(46),
    height: SH(46),
    backgroundColor: Colors.primaryLight,
    borderRadius: SW(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorName: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  trustedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: SW(6),
    paddingHorizontal: SW(6),
    paddingVertical: SH(2),
  },
  trustedText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  ratingStarsWrap: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  ratingNum: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  vendorCategory: { fontSize: 12, color: '#2563EB', fontWeight: '600', marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 5 },
  vendorPhone: { fontSize: 12, color: Colors.textMid },
  vendorEmail: { fontSize: 11, color: Colors.textLight },
  vendorAddress: { fontSize: 12, color: '#2563EB', textDecorationLine: 'underline', flex: 1 },
  vendorNotes: { fontSize: 11, color: Colors.textLight, marginTop: 3, fontStyle: 'italic' },
  actionBtns: { alignItems: 'center', gap: 6, marginLeft: 8 },
  callBtn: {
    width: SW(42),
    height: SH(42),
    backgroundColor: Colors.successLight,
    borderRadius: SW(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBtn: {
    width: SW(42),
    height: SH(42),
    backgroundColor: Colors.primaryLight,
    borderRadius: SW(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
