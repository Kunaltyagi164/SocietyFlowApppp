// src/screens/Notices/NoticesScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, SafeAreaView, LayoutAnimation } from 'react-native';
import { getNotices } from '../../services/api';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow, Spacing, Fonts } from '../../theme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { SF, SH, SW } from '../../utils/responsive';

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); } catch { return ''; } };
const CAT_LABEL = (c = '') => {
  const m = { general:'📌 General', maintenance:'🔧 Maintenance', event:'🎉 Event', finance:'💰 Finance', emergency:'🚨 Emergency' };
  return m[c.toLowerCase()] || `📌 ${c || 'General'}`;
};
const PRIORITY_COLOR = (p = '') => {
  if (p === 'urgent') return Colors.danger;
  if (p === 'high')   return Colors.warning;
  return Colors.teal;
};

export default function NoticesScreen() {
  const [data,       setData]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded,   setExpanded]   = useState(null);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { const r = await getNotices(); setData(r.data?.data || []); }
    catch (_) {}
    setLoading(false); setRefreshing(false);
  };

  useEffect(() => { 
    load();
  }, []);

  // Auto-refresh every 20 seconds
  useAutoRefresh(() => load(true), true, 20000);

  const toggle = (id) => {
    setExpanded(prev => prev === id ? null : id);
    console.log(`📢 [NoticesScreen] Toggled notice ${id}, expanded: ${expanded !== id}`);
  };

  if (loading) return <ScreenLoader />;

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <Text style={styles.title}>Notices</Text>
      </View>
      {data.length === 0 ? (
        <EmptyState emoji="📢" title="No notices" subtitle="Society notices will appear here" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} tintColor={Colors.vibrantRed}
            onRefresh={() => { setRefreshing(true); load(true); }} />}>
          {data.map(n => {
            const isExp  = expanded === n.id;
            const color  = PRIORITY_COLOR(n.priority);
            const contentText = n.content || n.message || n.description || n.body || 'No details available';
            return (
              <TouchableOpacity key={n.id} onPress={() => toggle(n.id)} activeOpacity={0.6}
                style={[styles.card, isExp && { borderColor: color + '60', backgroundColor: color + '08' }]}>
                <View style={styles.cardHead}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.noticeTitle} numberOfLines={isExp ? undefined : 2}>{n.title}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.cat}>{CAT_LABEL(n.category)}</Text>
                      {!!n.created_at && <Text style={styles.date}> · {fmtDate(n.created_at)}</Text>}
                    </View>
                  </View>
                  <Text style={[styles.chevron, isExp && styles.chevronUp]}>›</Text>
                </View>
                {isExp && (
                  <View style={styles.content}>
                    <View style={styles.divider} />
                    <Text style={styles.contentText}>{contentText}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.royalBlue,
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  title: {
    fontSize: SF(32),
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    letterSpacing: SW(-0.5),
  },
  card: {
    backgroundColor: Colors.cardGlass,
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: SW(8),
    height: SH(8),
    borderRadius: SW(4),
    flexShrink: 0,
  },
  noticeTitle: {
    fontSize: SF(16),
    fontWeight: '700',
    color: Colors.charcoal,
    fontFamily: Fonts.bold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  cat: {
    fontSize: SF(11),
    color: Colors.grayGreen,
  },
  date: {
    fontSize: SF(11),
    color: Colors.grayGreen,
  },
  chevron: {
    fontSize: SF(22),
    color: Colors.textLight,
    marginLeft: Spacing.sm,
  },
  chevronUp: {
    transform: [{ rotate: '90deg' }],
  },
  content: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,123,255,0.06)',
    borderRadius: Radius.md,
  },
  divider: {
    height: SH(1),
    backgroundColor: `${Colors.grayGreen}4D`, // 30% opacity
    marginBottom: Spacing.md,
  },
  contentText: {
    fontSize: SF(14),
    color: '#000000',
    lineHeight: SH(22),
    fontFamily: Fonts.regular,
    fontWeight: '500',
  },
});

