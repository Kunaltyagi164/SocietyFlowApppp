// src/screens/Visitors/UpcomingPreRegistrationsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, FlatList, Alert, ActivityIndicator,
  ToastAndroid, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getPreRegistrations, cancelPreRegistration } from '../../services/api';
import { ScreenBackground } from '../../components';
import { Colors, Fonts, Radius } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

// ── Status config ──────────────────────────────────────────
const STATUS_CONFIG = {
  PRE_REGISTERED:        { label: 'Confirmed',    iconName: 'check-circle',         color: Colors.freshGreen },
  PRE_REGISTERED_INVITE: { label: 'Confirmed',    iconName: 'check-circle',         color: Colors.freshGreen },
  AUTO_APPROVED:         { label: 'Confirmed',    iconName: 'check-decagram',       color: Colors.freshGreen },
  PENDING_INVITE:        { label: 'Link Shared',  iconName: 'link-variant',         color: '#f59e0b' },
  PENDING:               { label: 'Pending',      iconName: 'clock-outline',        color: Colors.textSecondary },
  CANCELLED:             { label: 'Cancelled',    iconName: 'close-circle-outline', color: Colors.danger },
};

const TYPE_ICONS = {
  friend:   'human-greeting',
  family:   'home-heart',
  guest:    'account-tie',
  delivery: 'package',
  service:  'wrench',
  other:    'dots-horizontal-circle-outline',
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
};

const getRegistrationMethod = (item) => {
  if (
    item.status === 'PENDING_INVITE' ||
    item.status === 'PRE_REGISTERED_INVITE' ||
    item.invite_token ||
    item.invite_link
  ) {
    return { label: 'Link Shared', iconName: 'link-variant', color: Colors.cyanTeal };
  }
  return { label: 'Registered Manually', iconName: 'account-edit-outline', color: Colors.appBlue };
};

function RegistrationCard({ item, onCancel }) {
  const cfg      = STATUS_CONFIG[item.status] || { label: item.status, iconName: 'help-circle-outline', color: Colors.textSecondary };
  const method   = getRegistrationMethod(item);
  const typeIcon = TYPE_ICONS[item.visitor_type] || 'account-outline';
  const isCancellable = ['PRE_REGISTERED', 'PENDING_INVITE', 'PRE_REGISTERED_INVITE', 'PENDING'].includes(item.status);

  return (
    <View style={S.card}>
      <View style={S.cardTop}>
        <View style={S.avatarCircle}>
          <MaterialCommunityIcons name={typeIcon} size={22} color={Colors.appBlue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.visitorName}>{item.visitor_name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <MaterialCommunityIcons name={typeIcon} size={12} color={Colors.textSecondary} />
            <Text style={S.visitorType}>
              {item.visitor_type
                ? item.visitor_type.charAt(0).toUpperCase() + item.visitor_type.slice(1)
                : 'Visitor'}
              {item.num_visitors > 1 ? `  ·  ${item.num_visitors} people` : ''}
            </Text>
          </View>
        </View>
        <View style={[S.badge, { backgroundColor: cfg.color + '1A' }]}>
          <MaterialCommunityIcons name={cfg.iconName} size={12} color={cfg.color} />
          <Text style={[S.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={S.detailsBlock}>
        {!!item.visit_date && (
          <View style={S.detailRow}>
            <MaterialCommunityIcons name="calendar" size={14} color={Colors.royalBlue} />
            <Text style={S.detailText}>{fmtDate(item.visit_date)}</Text>
          </View>
        )}
        {!!item.phone && (
          <View style={S.detailRow}>
            <MaterialCommunityIcons name="phone-outline" size={14} color={Colors.textSecondary} />
            <Text style={S.detailText}>{item.phone}</Text>
          </View>
        )}
        {!!item.vehicle_no && (
          <View style={S.detailRow}>
            <MaterialCommunityIcons name="car-outline" size={14} color={Colors.textSecondary} />
            <Text style={S.detailText}>{item.vehicle_no}</Text>
          </View>
        )}
        {!!item.notes && (
          <View style={S.detailRow}>
            <MaterialCommunityIcons name="note-text-outline" size={14} color={Colors.textSecondary} />
            <Text style={[S.detailText, { fontStyle: 'italic' }]}>{item.notes}</Text>
          </View>
        )}
      </View>

      <View style={S.methodRow}>
        <MaterialCommunityIcons name={method.iconName} size={13} color={method.color} />
        <Text style={[S.methodText, { color: method.color }]}>{method.label}</Text>
      </View>

      {isCancellable && (
        <TouchableOpacity style={S.cancelBtn} onPress={() => onCancel(item)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="cancel" size={15} color={Colors.danger} />
          <Text style={S.cancelBtnText}>Cancel Pre-Registration</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function UpcomingPreRegistrationsScreen({ navigation }) {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myFlatNo, setMyFlatNo]     = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user').then(raw => {
      if (!raw) return;
      try {
        const u = JSON.parse(raw);
        const flat = (u?.flat_no || u?.apartment || u?.flat || '').toUpperCase();
        setMyFlatNo(flat);
      } catch {}
    });
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getPreRegistrations();
      const raw = res.data?.data || res.data || [];
      const data = Array.isArray(raw) ? raw : [];

      const flat = myFlatNo || '';
      const myItems = flat
        ? data.filter(r => (r.flat_no || r.flat || r.apartment || '').toUpperCase() === flat)
        : data;

      myItems.sort((a, b) => {
        const da = a.visit_date ? new Date(a.visit_date) : new Date(0);
        const db = b.visit_date ? new Date(b.visit_date) : new Date(0);
        return da - db;
      });

      console.log(`[PreReg] Loaded ${myItems.length} pre-registrations for flat "${flat}"`);
      setItems(myItems);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not load pre-registrations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myFlatNo]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (myFlatNo) load(); }, [myFlatNo]);

  const handleCancel = (item) => {
    Alert.alert(
      'Cancel Pre-Registration',
      `Cancel pre-registration for ${item.visitor_name}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel It',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelPreRegistration(item.id);
              ToastAndroid.show('Pre-registration cancelled', ToastAndroid.SHORT);
              load(true);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Could not cancel.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={S.container}>
          <View style={S.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
              <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textWhite} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="clipboard-list-outline" size={22} color={Colors.textWhite} />
            <Text style={S.title}>My Pre-Registrations</Text>
          </View>
          <View style={S.center}>
            <ActivityIndicator size="large" color={Colors.appBlue} />
          </View>
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={S.container}>
        <View style={S.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.textWhite} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="clipboard-list-outline" size={22} color={Colors.textWhite} />
          <Text style={S.title}>My Pre-Registrations</Text>
          {!!myFlatNo && <Text style={S.flatTag}>Flat {myFlatNo}</Text>}
        </View>

        {items.length === 0 ? (
          <View style={S.center}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={56} color={Colors.border} style={{ marginBottom: 16 }} />
            <Text style={S.emptyTitle}>No pre-registrations yet</Text>
            <Text style={S.emptySubtitle}>Pre-register visitors so they can enter without approval delays.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.appBlue} />}
            ListHeaderComponent={
              <Text style={S.listHeader}>{items.length} visitor{items.length !== 1 ? 's' : ''} pre-registered</Text>
            }
            renderItem={({ item }) => <RegistrationCard item={item} onCancel={handleCancel} />}
          />
        )}
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
    gap: SW(10),
    borderBottomLeftRadius: SW(24),
    borderBottomRightRadius: SW(24),
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textWhite, flex: 1, fontFamily: Fonts.Poppins_Bold },
  flatTag: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.Poppins_Medium, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.textDark, marginBottom: 6, textAlign: 'center', fontFamily: Fonts.Poppins_Bold },
  emptySubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, fontFamily: Fonts.Poppins_Regular },

  listHeader: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12, fontFamily: Fonts.Poppins_Medium },

  card: {
    backgroundColor: Colors.cardGlass,
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(14),
    marginBottom: SH(12),
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  avatarCircle: {
    width: 44, height: 44,
    borderRadius: SW(22),
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  visitorName: { fontSize: 16, fontWeight: '700', color: Colors.textDark, fontFamily: Fonts.Poppins_Bold },
  visitorType: { fontSize: 12, color: Colors.textSecondary, fontFamily: Fonts.Poppins_Regular },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700', fontFamily: Fonts.Poppins_Bold },

  detailsBlock: { gap: 5, marginBottom: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: Colors.textSecondary, flex: 1, fontFamily: Fonts.Poppins_Regular },

  methodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border,
    marginBottom: SH(2),
  },
  methodText: { fontSize: 12, fontWeight: '600', fontFamily: Fonts.Poppins_Medium },

  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: SH(10),
  },
  cancelBtnText: { fontSize: 14, color: Colors.danger, fontWeight: '600', fontFamily: Fonts.Poppins_Bold },
});
