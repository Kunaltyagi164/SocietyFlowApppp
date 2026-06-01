// src/screens/Visitors/VisitorsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Image, ToastAndroid, SafeAreaView, Modal, ScrollView, Animated, PanResponder, Dimensions } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVisitors, checkoutVisitor, getPendingVisitors, approveRegistration, rejectRegistration } from '../../services/api';
import { useNotifications } from '../../navigation';
import VisitorArrivalAlert from '../../components/VisitorArrivalAlert';
import { ScreenBackground } from '../../components';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { SF, SH, SW } from '../../utils/responsive';

// ── Format time to locale string ────────────────────────────
const fmtTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (err) {
    return '—';
  }
};

// ── Get valid status badge info ─────────────────────────────
const getValidStatus = (visitor) => {
  // No valid_until on this record (old data before feature)
  if (!visitor.valid_until) {
    return { label: '—', color: '#64748b', bg: 'transparent' };
  }

  // Already checked out
  if (!visitor.is_inside) {
    return { label: 'Checked Out', color: '#22d67a', bg: 'rgba(34,214,122,.1)' };
  }

  // Use backend-calculated is_overstay (most accurate)
  if (visitor.is_overstay) {
    const now = new Date();
    const expiry = new Date(visitor.valid_until);
    const minsOver = Math.round((now - expiry) / 60000);
    const label = minsOver < 60 ? `Overstay ${minsOver}m` : `Overstay ${Math.round(minsOver / 60)}h`;
    return { label, color: '#f87171', bg: 'rgba(248,113,113,.1)' };
  }

  // Inside and valid — show remaining time
  const now = new Date();
  const expiry = new Date(visitor.valid_until);
  const minsLeft = Math.round((expiry - now) / 60000);

  if (minsLeft <= 30) {
    // Expiring soon
    return {
      label: `${minsLeft}m left`,
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.1)',
    };
  }

  const hoursLeft = Math.round(minsLeft / 60);
  return {
    label: `${hoursLeft}h left`,
    color: '#22d67a',
    bg: 'rgba(34,214,122,.1)',
  };
};

// ── Visitor Card Component ──────────────────────────────────
const VisitorCard = ({ visitor, onCheckout, onPhotoPress }) => {
  const status = getValidStatus(visitor);
  const [imgError, setImgError] = useState(false);

  return (
    <View style={S.card}>
      {/* Photo */}
      <View style={S.photoBox}>
        {visitor.photo_url && !imgError ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPhotoPress?.(visitor.photo_url)}
          >
            <Image
              source={{ uri: visitor.photo_url }}
              style={S.photo}
              onError={() => setImgError(true)}
            />
          </TouchableOpacity>
        ) : (
          <MaterialCommunityIcons name="account-circle-outline" size={48} color="#94a3b8" />
        )}
        {/* Inside/Outside dot */}
        <View style={[S.dot, { backgroundColor: visitor.is_inside ? '#22d67a' : '#94a3b8' }]} />
      </View>

      {/* Info */}
      <View style={S.info}>
        <View style={S.nameRow}>
          <Text style={S.name}>{visitor.name}</Text>
          {/* Valid Until Badge */}
          {visitor.valid_until ? (
            <View style={[S.badge, { backgroundColor: status.bg }]}>
              <Text style={[S.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          ) : null}
        </View>

        <Text style={S.flat}>Flat {visitor.visiting_flat}</Text>
        <Text style={S.meta}>{visitor.purpose || 'Visit'}</Text>

        {/* Check-in time */}
        <Text style={S.time}>In: {fmtTime(visitor.check_in)}</Text>

        {/* Valid until time */}
        {visitor.valid_until ? (
          <Text style={[S.time, visitor.is_overstay && { color: '#f87171' }]}>
            Valid until: {fmtTime(visitor.valid_until)}
          </Text>
        ) : null}

        {/* Check-out time */}
        {visitor.check_out ? (
          <Text style={[S.time, { color: '#22d67a' }]}>Out: {fmtTime(visitor.check_out)}</Text>
        ) : null}

        {/* Checkout button */}
        {visitor.is_inside && (
          <TouchableOpacity 
            style={S.checkoutBtn}
            onPress={() => onCheckout(visitor.id, visitor.name)}
            activeOpacity={0.7}
          >
            <Text style={S.checkoutBtnText}>Check Out</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ── Pending Visitor Card Component ──────────────────────────
const PendingVisitorCard = ({ visitor, onPress }) => {
  return (
    <TouchableOpacity 
      style={S.pendingCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={S.pendingCardContent}>
        <View style={S.pendingBadge}>
          <View style={S.pendingBadgeInner}><MaterialCommunityIcons name="bell-ring-outline" size={12} color="#fff" /><Text style={S.pendingBadgeText}> PENDING</Text></View>
        </View>
        <Text style={S.pendingName}>{visitor.visitor_name || visitor.name}</Text>
        <Text style={S.pendingFlat}>Visiting Flat {visitor.visiting_flat}</Text>
        <Text style={S.pendingMeta}>{visitor.purpose || 'Visit'}</Text>
        {visitor.created_at && (
          <Text style={S.pendingTime}>Registered: {fmtTime(visitor.created_at)}</Text>
        )}
        <View style={S.pendingActionRow}><MaterialCommunityIcons name="gesture-tap" size={14} color="#2563EB" /><Text style={S.pendingAction}> Tap to view details</Text></View>
      </View>
    </TouchableOpacity>
  );
};

// ── Main Screen ──────────────────────────────────────────────
export default function VisitorsScreen({ navigation }) {
  const { loadCounts } = useNotifications();
  const [visitors, setVisitors] = useState([]);
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedPending, setSelectedPending] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [dateRange, setDateRange] = useState('week'); // 'day' | 'week' | 'month'
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
  const [panResponder, setPanResponder] = useState(null);
  
  // Visitor Arrival Alert Modal state (like HomeScreen)
  const [visitorArrivalData, setVisitorArrivalData] = useState(null);
  const [visitorAlertVisible, setVisitorAlertVisible] = useState(false);

  const handleVisitorAlertClose = async (result) => {
    setVisitorAlertVisible(false);
    
    // If action was successful (approved or rejected), remove from pending immediately
    if (result?.action === 'approved' || result?.action === 'rejected') {
      const registrationId = result?.registrationId;
      if (registrationId) {
        setPendingVisitors(prev => prev.filter(p => p.id !== registrationId));
        console.log(`[VisitorAlertClose] Removed ${result.action} visitor from pending list`);
      }
    }
    
    setVisitorArrivalData(null);
    // Polling will handle refreshing data automatically
    // Just ensure counts are updated
    await loadCounts();
  };

  const handleCheckout = async (visitorId, visitorName) => {
    Alert.alert('Check Out Visitor', `Check out ${visitorName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await checkoutVisitor(visitorId);
            ToastAndroid.show(`✅ ${visitorName} checked out!`, ToastAndroid.LONG);
            load(true);
            await loadCounts();
          } catch (err) {
            const error = err.response?.data?.error || err.message || 'Checkout failed';
            ToastAndroid.show('❌ Checkout failed. Try again.', ToastAndroid.LONG);
            Alert.alert('Error', error);
          }
        },
      },
    ]);
  };

  const handleApprovePending = async (pending) => {
    setActionLoading(true);
    try {
      const result = await approveRegistration(pending.id, {
        status: 'approved',
        approval_date: new Date().toISOString(),
      });
      console.log('✅ [VisitorsScreen] Approved:', result);
      
      // Remove from pending list immediately (as per backend guide)
      setPendingVisitors(prev => prev.filter(p => p.id !== pending.id));
      
      ToastAndroid.show(`✅ ${pending.visitor_name || pending.name} approved!`, ToastAndroid.LONG);
      setModalVisible(false);
      setSelectedPending(null);
      
      // Reload visitor log to show the new visitor
      const visitorsRes = await getVisitors();
      const allVisitors = visitorsRes.data?.data || [];
      setVisitors(allVisitors);
      
      await loadCounts();
    } catch (err) {
      const error = err.response?.data?.error || err.message || 'Approval failed';
      ToastAndroid.show('❌ Approval failed. Try again.', ToastAndroid.LONG);
      Alert.alert('Error', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPending = async (pending) => {
    setActionLoading(true);
    try {
      await rejectRegistration(pending.id, {
        status: 'rejected',
        rejection_date: new Date().toISOString(),
      });
      // Remove from pending list immediately (per backend guide)
      setPendingVisitors(prev => prev.filter(p => p.id !== pending.id));
      ToastAndroid.show(`✅ ${pending.visitor_name} declined!`, ToastAndroid.LONG);
      setVisitorAlertVisible(false);
      setVisitorArrivalData(null);
      // Fetch updated visitor log
      const visitorsRes = await getVisitors();
      setVisitors(visitorsRes.data?.data || []);
      await loadCounts();
    } catch (err) {
      const error = err.response?.data?.error || err.message || 'Rejection failed';
      ToastAndroid.show('❌ Rejection failed. Try again.', ToastAndroid.LONG);
      Alert.alert('Error', error);
    } finally {
      setActionLoading(false);
    }
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      console.log('👥 [VisitorsScreen] Loading visitors and pending registrations...');
      
      // Fetch checked-in visitors and pending visitors in parallel
      const [visitorsRes, pendingRes] = await Promise.all([
        getVisitors().catch((err) => {
          console.warn('[VisitorsScreen] getVisitors error:', err.message);
          return ({ data: { data: [] } });
        }),
        getPendingVisitors().catch((err) => {
          console.warn('[VisitorsScreen] getPendingVisitors error:', err.message);
          return [];
        })
      ]);

      const allVisitors = visitorsRes.data?.data || [];
      const pending = Array.isArray(pendingRes) ? pendingRes : [];

      console.log(`👥 [VisitorsScreen] Setting state: ${allVisitors.length} visitors, ${pending.length} pending`);
      
      setVisitors(allVisitors);
      setPendingVisitors(pending);

      try {
        await AsyncStorage.multiSet([
          ['reports_cache_visitors', JSON.stringify(allVisitors)],
          ['reports_cache_pending_visitors', JSON.stringify(pending)],
          ['reports_cache_visitors_updated_at', new Date().toISOString()],
        ]);
      } catch (cacheErr) {
        console.warn('[VisitorsScreen] Failed to cache report data:', cacheErr.message);
      }
      
      // Update local storage with inside visitors count
      const insideCount = allVisitors.filter(v => v.is_inside).length;
      await AsyncStorage.setItem('inside_visitors_count', String(insideCount));
      
      console.log(`✅ [VisitorsScreen] Fetched ${allVisitors.length} total visitors, ${pending.length} pending`);
      
      // Show pending visitor alert if any exist (like HomeScreen)
      if (pending.length > 0) {
        console.log(`🚪 [VisitorsScreen] Showing pending visitor alert for: ${pending[0].name || pending[0].visitor_name}`);
        setVisitorArrivalData(pending[0]);
        setVisitorAlertVisible(true);
      }
      
      allVisitors.forEach((v, idx) => {
        console.log(`   [${idx}] ${v.name} - is_inside: ${v.is_inside}`);
      });
      pending.forEach((p, idx) => {
        console.log(`   [PENDING-${idx}] ${p.name || p.visitor_name} - flat: ${p.visiting_flat}`);
      });
    } catch (err) {
      console.error('❌ [VisitorsScreen] Visitors fetch failed:', err.message);
      Alert.alert('Error', 'Failed to load visitors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    load();
  }, []);

  // Reset zoom when modal opens/closes
  useEffect(() => {
    if (!previewModalVisible) {
      setImageZoom(1);
    }
  }, [previewModalVisible]);

  // Auto-refresh every 20 seconds
  useAutoRefresh(() => load(false), true, 20000);

  // Setup polling intervals
  useEffect(() => {
    // Poll every 5 seconds for new pending visitors (as per backend guide)
    const pendingInterval = setInterval(() => {
      console.log('⏰ [VisitorsScreen] Polling pending visitors...');
      getPendingVisitors().then(pending => {
        console.log(`⏰ [Poll] Got ${pending.length} pending visitor(s)`);
        setPendingVisitors(pending);
        // Show alert for first pending if not already showing
        if (pending.length > 0 && !visitorAlertVisible) {
          setVisitorArrivalData(pending[0]);
          setVisitorAlertVisible(true);
        }
      }).catch(err => console.warn('Pending poll error:', err.message));
    }, 5000); // Poll every 5 seconds as per backend guide

    // Poll visitor log every 30 seconds
    const logInterval = setInterval(() => {
      getVisitors().then(res => {
        const allVisitors = res.data?.data || [];
        setVisitors(allVisitors);
      }).catch(err => console.warn('Visitor log poll error:', err.message));
    }, 30000);

    return () => {
      clearInterval(pendingInterval);
      clearInterval(logInterval);
    };
  }, []);

  // Date range options
  const DATE_RANGES = [
    { key: 'day',   label: 'Last 24 Hours' },
    { key: 'week',  label: 'Last Week' },
    { key: 'month', label: 'This Month' },
  ];
  const selectedRangeLabel = DATE_RANGES.find(r => r.key === dateRange)?.label || 'Last Week';

  const getDateRangeCutoff = () => {
    const now = new Date();
    if (dateRange === 'day') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (dateRange === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return new Date(now.getFullYear(), now.getMonth(), 1); // This Month
  };

  const cutoff = getDateRangeCutoff();

  // Apply date range filter first (by check-in date)
  const dateFiltered = visitors.filter(v => {
    const checkIn = v.check_in || v.created_at;
    if (!checkIn) return true;
    return new Date(checkIn) >= cutoff;
  });

  // Then apply status filter
  const filtered = dateFiltered.filter(v => {
    if (filter === 'inside') return v.is_inside;
    if (filter === 'overstay') return v.is_overstay;
    if (filter === 'checkedout') return !v.is_inside;
    return true;
  });

  // Count badges (based on date-filtered data)
  const insideCount = dateFiltered.filter(v => v.is_inside).length;
  const leftCount = dateFiltered.filter(v => !v.is_inside).length;
  const totalCount = dateFiltered.length;
  const overstayCount = dateFiltered.filter(v => v.is_overstay).length;

  const FILTERS = [
    { key: 'all', label: `All (${dateFiltered.length})` },
    { key: 'inside', label: `Inside (${insideCount})` },
    { key: 'overstay', label: `Overstay (${overstayCount})`, urgent: overstayCount > 0 },
    { key: 'checkedout', label: 'Checked Out' },
  ];

  return (
    <ScreenBackground>
    <SafeAreaView style={S.container}>
      {/* Header */}
      <View style={S.header}>
        <Text style={S.title}>Visitors</Text>
        <TouchableOpacity 
          style={S.addBtn}
          onPress={() => setAddSheetVisible(true)}
        >
          <Text style={S.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Stat Header */}
      <View style={S.statHeaderContainer}>
        {/* Title row with date range selector */}
        <View style={S.statHeaderRow}>
          <Text style={S.statHeaderTitle}>Your Visitors in</Text>
          <TouchableOpacity
            style={S.dateRangePill}
            onPress={() => setDateDropdownOpen(!dateDropdownOpen)}
            activeOpacity={0.8}
          >
            <Text style={S.dateRangePillText}>{selectedRangeLabel}</Text>
            <MaterialCommunityIcons name={dateDropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {/* Dropdown */}
        {dateDropdownOpen && (
          <View style={S.dateDropdown}>
            {DATE_RANGES.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[S.dateDropdownItem, dateRange === r.key && S.dateDropdownItemActive]}
                onPress={() => { setDateRange(r.key); setDateDropdownOpen(false); }}
              >
                <Text style={[S.dateDropdownText, dateRange === r.key && S.dateDropdownTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={S.statGrid}>
          <View style={S.statTile}>
            <View style={[S.statIcon, { backgroundColor: '#FFE5E5' }]}>
              <MaterialCommunityIcons name="account-arrow-right-outline" size={22} color="#22d67a" />
            </View>
            <View style={S.statContent}>
              <Text style={S.statLabel}>Inside</Text>
              <Text style={S.statValue}>{insideCount}</Text>
            </View>
          </View>

          <View style={S.statTile}>
            <View style={[S.statIcon, { backgroundColor: '#E3F2FD' }]}>
              <MaterialCommunityIcons name="account-arrow-left-outline" size={22} color="#3b82f6" />
            </View>
            <View style={S.statContent}>
              <Text style={S.statLabel}>Left</Text>
              <Text style={S.statValue}>{leftCount}</Text>
            </View>
          </View>

          <View style={S.statTile}>
            <View style={[S.statIcon, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color="#22c55e" />
            </View>
            <View style={S.statContent}>
              <Text style={S.statLabel}>Total</Text>
              <Text style={S.statValue}>{totalCount}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={S.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[S.filterBtn, filter === f.key && S.filterBtnActive, f.urgent && { borderColor: '#f87171' }]}
          >
            <Text style={[S.filterText, filter === f.key && S.filterTextActive, f.urgent && { color: '#f87171' }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pending Visitors Section */}
      {pendingVisitors.length > 0 && (
        <View style={S.pendingSection}>
          <View style={S.pendingSectionHeader}>
            <View style={S.pendingSectionTitleRow}><MaterialCommunityIcons name="bell-ring-outline" size={16} color="#f59e0b" /><Text style={S.pendingSectionTitle}> Pending Approvals ({pendingVisitors.length})</Text></View>
          </View>
          <FlatList
            data={pendingVisitors}
            keyExtractor={p => String(p.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
            renderItem={({ item }) => (
              <PendingVisitorCard 
                visitor={item}
                onPress={() => {
                  setSelectedPending(item);
                  setModalVisible(true);
                }}
              />
            )}
            scrollEnabled={pendingVisitors.length > 1}
          />
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={v => String(v.id)}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20, gap: 10 }}
        renderItem={({ item }) => (
          <VisitorCard
            visitor={item}
            onCheckout={handleCheckout}
            onPhotoPress={(url) => {
              setPreviewImageUrl(url);
              setPreviewModalVisible(true);
            }}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#2563EB" />}
        ListEmptyComponent={<Text style={S.empty}>{loading ? 'Loading...' : 'No visitors found'}</Text>}
      />

      {/* Visitor Photo Preview Modal */}
      <Modal
        visible={previewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={S.imagePreviewOverlay}>
          {/* Close Button */}
          <TouchableOpacity
            style={S.imagePreviewCloseBtn}
            onPress={() => setPreviewModalVisible(false)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Image Container with Zoom */}
          <View style={S.imageContainer}>
            {previewImageUrl ? (
              <Image
                source={{ uri: previewImageUrl }}
                style={[S.imagePreview, { transform: [{ scale: imageZoom }] }]}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Zoom Controls */}
          <View style={S.zoomControls}>
            <TouchableOpacity
              style={[S.zoomBtn, imageZoom <= 1 && { opacity: 0.5 }]}
              onPress={() => setImageZoom(Math.max(1, imageZoom - 0.3))}
              disabled={imageZoom <= 1}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="minus" size={20} color="#333" />
            </TouchableOpacity>

            <View style={S.zoomDisplay}>
              <Text style={S.zoomPercentage}>{Math.round(imageZoom * 100)}%</Text>
            </View>

            <TouchableOpacity
              style={[S.zoomBtn, imageZoom >= 3 && { opacity: 0.5 }]}
              onPress={() => setImageZoom(Math.min(3, imageZoom + 0.3))}
              disabled={imageZoom >= 3}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pending Visitor Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={S.modalContainer}>
          <View style={S.modalContent}>
            {/* Close Button */}
            <TouchableOpacity
              style={S.modalCloseBtn}
              onPress={() => setModalVisible(false)}
              disabled={actionLoading}
            >
              <MaterialCommunityIcons name="close" size={22} color="#333" />
            </TouchableOpacity>

            {/* Modal Header */}
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Visitor Details</Text>
              <View style={S.modalBadge}>
                <View style={S.modalBadgeInner}><MaterialCommunityIcons name="clock-outline" size={12} color="#f59e0b" /><Text style={S.modalBadgeText}> PENDING</Text></View>
              </View>
            </View>

            {/* Scrollable Details */}
            <ScrollView style={S.modalDetailsScroll} showsVerticalScrollIndicator={false}>
              <View style={S.modalDetailsContainer}>
                {/* Visitor Name */}
                <View style={S.detailRow}>
                  <Text style={S.detailLabel}>Visitor Name</Text>
                  <Text style={S.detailValue}>{selectedPending?.visitor_name || selectedPending?.name || 'N/A'}</Text>
                </View>

                {/* Visiting Flat */}
                <View style={S.detailRow}>
                  <Text style={S.detailLabel}>Visiting Flat</Text>
                  <Text style={S.detailValue}>Flat {selectedPending?.visiting_flat}</Text>
                </View>

                {/* Purpose */}
                <View style={S.detailRow}>
                  <Text style={S.detailLabel}>Purpose</Text>
                  <Text style={S.detailValue}>{selectedPending?.purpose || 'Visit'}</Text>
                </View>

                {/* Phone */}
                {selectedPending?.phone && (
                  <View style={S.detailRow}>
                    <Text style={S.detailLabel}>Phone</Text>
                    <Text style={S.detailValue}>{selectedPending.phone}</Text>
                  </View>
                )}

                {/* ID Number */}
                {selectedPending?.id_number && (
                  <View style={S.detailRow}>
                    <Text style={S.detailLabel}>ID Number</Text>
                    <Text style={S.detailValue}>{selectedPending.id_number}</Text>
                  </View>
                )}

                {/* Vehicle Info */}
                {selectedPending?.vehicle_number && (
                  <View style={S.detailRow}>
                    <Text style={S.detailLabel}>Vehicle Number</Text>
                    <Text style={S.detailValue}>{selectedPending.vehicle_number}</Text>
                  </View>
                )}

                {/* Requested Date */}
                {selectedPending?.created_at && (
                  <View style={S.detailRow}>
                    <Text style={S.detailLabel}>Requested</Text>
                    <Text style={S.detailValue}>{fmtTime(selectedPending.created_at)}</Text>
                  </View>
                )}

                {/* Notes */}
                {selectedPending?.notes && (
                  <View style={S.detailRow}>
                    <Text style={S.detailLabel}>Notes</Text>
                    <Text style={S.detailValue}>{selectedPending.notes}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={S.modalActions}>
              <TouchableOpacity
                style={[S.denyBtn, actionLoading && { opacity: 0.6 }]}
                onPress={() => handleRejectPending(selectedPending)}
                disabled={actionLoading}
              >
                <View style={S.actionBtnRow}><MaterialCommunityIcons name={actionLoading ? 'loading' : 'close-circle-outline'} size={16} color="#fff" /><Text style={S.denyBtnText}> {actionLoading ? 'Processing...' : 'Deny'}</Text></View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[S.approveBtn, actionLoading && { opacity: 0.6 }]}
                onPress={() => handleApprovePending(selectedPending)}
                disabled={actionLoading}
              >
                <View style={S.actionBtnRow}><MaterialCommunityIcons name={actionLoading ? 'loading' : 'check-circle-outline'} size={16} color="#fff" /><Text style={S.approveBtnText}> {actionLoading ? 'Processing...' : 'Approve'}</Text></View>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Visitor Arrival Alert Modal (using working component from HomeScreen) */}
      <VisitorArrivalAlert
        visible={visitorAlertVisible}
        visitorData={visitorArrivalData}
        onClose={handleVisitorAlertClose}
      />

      {/* + Add Action Sheet */}
      <Modal
        visible={addSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddSheetVisible(false)}
      >
        <TouchableOpacity
          style={S.sheetOverlay}
          activeOpacity={1}
          onPress={() => setAddSheetVisible(false)}
        >
          <View style={S.sheetContainer}>
            <View style={S.sheetHandle} />
            <Text style={S.sheetTitle}>Add Visitor</Text>
            <Text style={S.sheetSubtitle}>Choose how you'd like to register your visitor</Text>

            {/* Card 1 — Pre-Register Visitor */}
            <TouchableOpacity
              style={S.actionCard}
              activeOpacity={0.7}
              onPress={() => { setAddSheetVisible(false); navigation.navigate('PreRegisterForm', { type: 'visitor' }); }}
            >
              <View style={[S.actionIcon, { backgroundColor: '#eff6ff' }]}>
                <MaterialCommunityIcons name="clipboard-edit-outline" size={22} color="#2563EB" />
              </View>
              <View style={S.actionInfo}>
                <Text style={S.actionLabel}>Pre-Register Visitor</Text>
                <Text style={S.actionHint}>Register a friend, family or guest before they arrive</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Card 2 — Invite a Friend */}
            <TouchableOpacity
              style={S.actionCard}
              activeOpacity={0.7}
              onPress={() => { setAddSheetVisible(false); navigation.navigate('InviteFriend'); }}
            >
              <View style={[S.actionIcon, { backgroundColor: '#f0fdf4' }]}>
                <MaterialCommunityIcons name="link-variant" size={22} color="#16a34a" />
              </View>
              <View style={S.actionInfo}>
                <Text style={S.actionLabel}>Invite a Friend</Text>
                <Text style={S.actionHint}>Share an invite link — your guest fills their own details</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Card 3 — Register Delivery */}
            <TouchableOpacity
              style={S.actionCard}
              activeOpacity={0.7}
              onPress={() => { setAddSheetVisible(false); navigation.navigate('PreRegisterForm', { type: 'delivery' }); }}
            >
              <View style={[S.actionIcon, { backgroundColor: '#fef9c3' }]}>
                <MaterialCommunityIcons name="package-variant-closed" size={22} color="#ca8a04" />
              </View>
              <View style={S.actionInfo}>
                <Text style={S.actionLabel}>Register Delivery</Text>
                <Text style={S.actionHint}>Pre-register a delivery person for quick entry</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Card 4 — View All Upcoming */}
            <TouchableOpacity
              style={S.actionCard}
              activeOpacity={0.7}
              onPress={() => { setAddSheetVisible(false); navigation.navigate('UpcomingPreReg'); }}
            >
              <View style={[S.actionIcon, { backgroundColor: '#f5f3ff' }]}>
                <MaterialCommunityIcons name="format-list-bulleted" size={22} color="#7c3aed" />
              </View>
              <View style={S.actionInfo}>
                <Text style={S.actionLabel}>View All Upcoming</Text>
                <Text style={S.actionHint}>See and manage all your pre-registered visitors</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity style={S.sheetCancel} onPress={() => setAddSheetVisible(false)} activeOpacity={0.7}>
              <Text style={S.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SW(16),
    paddingTop: SH(12),
    paddingBottom: SH(8),
    gap: SW(12),
    backgroundColor: '#0B4EA2',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
    borderBottomLeftRadius: SW(20),
    borderBottomRightRadius: SW(20),
  },
  title: {
    fontSize: SF(24),
    fontWeight: '900',
    color: '#FFFFFF',
    flex: 1,
  },
  addBtn: {
    backgroundColor: '#39B54A',
    paddingHorizontal: SW(14),
    paddingVertical: SH(8),
    borderRadius: SW(12),
  },
  addBtnText: {
    fontSize: SF(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statHeaderContainer: {
    backgroundColor: '#007BFF',
    marginHorizontal: SW(16),
    marginVertical: SH(12),
    borderRadius: SW(16),
    padding: SW(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SH(12),
    flexWrap: 'wrap',
    gap: SW(6),
  },
  statHeaderTitle: {
    fontSize: SF(16),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateRangePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: SW(20),
    paddingHorizontal: SW(10),
    paddingVertical: SH(4),
  },
  dateRangePillText: {
    fontSize: SF(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateRangeArrow: {
    fontSize: SF(10),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: SW(12),
    marginBottom: SH(10),
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  dateDropdownItem: {
    paddingVertical: SH(13),
    paddingHorizontal: SW(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dateDropdownItemActive: {
    backgroundColor: '#EAF3FF',
  },
  dateDropdownText: {
    fontSize: SF(14),
    color: '#1e293b',
    fontWeight: '500',
  },
  dateDropdownTextActive: {
    color: '#007BFF',
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    gap: SW(10),
    justifyContent: 'space-between',
  },
  statTile: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: SW(12),
    padding: SW(12),
    justifyContent: 'center',
  },
  statIcon: {
    width: SW(40),
    height: SH(40),
    borderRadius: SW(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statEmoji: {
    fontSize: SF(20),
  },
  statContent: {
    alignItems: 'center',
    marginTop: SH(8),
  },
  statLabel: {
    fontSize: SF(11),
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  statValue: {
    fontSize: SF(18),
    fontWeight: '700',
    color: '#1F2937',
    marginTop: SH(4),
    textAlign: 'center',
  },
  filterRow: { 
    flexDirection: 'row', 
    paddingHorizontal: SW(14),
    paddingVertical: SH(10),
    gap: SW(8), 
    flexWrap: 'wrap',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterBtn: {
    paddingHorizontal: SW(14),
    paddingVertical: SH(7),
    borderRadius: SW(20),
    borderWidth: SW(1),
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  filterBtnActive: { 
    backgroundColor: '#007BFF', 
    borderColor: '#007BFF' 
  },
  filterText: { 
    fontSize: SF(12), 
    color: '#6B7280', 
    fontWeight: '600' 
  },
  filterTextActive: { 
    color: '#FFFFFF' 
  },
  card: {
    flexDirection: 'row',
    gap: SW(12),
    backgroundColor: '#FFFFFF',
    borderRadius: SW(16),
    padding: SW(14),
    borderWidth: SW(1),
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  photoBox: { 
    position: 'relative' 
  },
  photo: { 
    width: SW(56), 
    height: SH(56), 
    borderRadius: SW(28),
    backgroundColor: '#F3F4F6',
  },
  photoPlaceholder: {
    width: SW(56),
    height: SH(56),
    borderRadius: SW(28),
    backgroundColor: '#F3F4F6',
    fontSize: SF(26),
    textAlign: 'center',
    lineHeight: SH(56),
    color: '#9CA3AF',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SW(12),
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '72%',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(12),
    paddingHorizontal: SW(16),
    paddingBottom: SH(24),
    justifyContent: 'center',
  },
  zoomBtn: {
    width: SW(40),
    height: SH(40),
    borderRadius: SW(20),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: SW(1.5),
    borderColor: 'rgba(255,255,255,0.3)',
  },
  zoomBtnText: {
    color: '#FFFFFF',
    fontSize: SF(22),
    fontWeight: '600',
    lineHeight: SH(24),
  },
  zoomDisplay: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: SW(14),
    paddingVertical: SH(8),
    borderRadius: SW(8),
    borderWidth: SW(1),
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: SW(60),
    alignItems: 'center',
  },
  zoomPercentage: {
    color: '#FFFFFF',
    fontSize: SF(13),
    fontWeight: '700',
  },
  imagePreviewCloseBtn: {
    position: 'absolute',
    top: SH(52),
    right: SW(18),
    width: SW(36),
    height: SH(36),
    borderRadius: SW(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  imagePreviewCloseText: {
    color: '#FFFFFF',
    fontSize: SF(18),
    fontWeight: '700',
    lineHeight: SH(20),
  },
  dot: {
    position: 'absolute',
    bottom: SH(0),
    right: SW(0),
    width: SW(14),
    height: SH(14),
    borderRadius: SW(7),
    borderWidth: SW(2),
    borderColor: '#FFFFFF',
  },
  info: { 
    flex: 1 
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SH(4),
    gap: SW(8),
  },
  name: { 
    fontSize: SF(15), 
    fontWeight: '700', 
    color: '#1F2937',
    flex: 1,
  },
  flat: { 
    fontSize: SF(12), 
    color: '#007BFF', 
    fontWeight: '600', 
    marginBottom: SH(2) 
  },
  meta: { 
    fontSize: SF(12), 
    color: '#6B7280', 
    marginBottom: SH(4) 
  },
  time: { 
    fontSize: SF(11), 
    color: '#9CA3AF', 
    marginTop: SH(2) 
  },
  badge: { 
    paddingHorizontal: SW(8), 
    paddingVertical: SH(3), 
    borderRadius: SW(12),
    alignItems: 'center',
  },
  badgeText: { 
    fontSize: SF(10), 
    fontWeight: '700' 
  },
  checkoutBtn: {
    backgroundColor: '#EF4444',
    paddingVertical: SH(7),
    paddingHorizontal: SW(10),
    borderRadius: SW(6),
    marginTop: SH(8),
    alignItems: 'center',
  },
  checkoutBtnText: { 
    fontSize: SF(11), 
    fontWeight: '700', 
    color: '#FFFFFF' 
  },
  empty: { 
    textAlign: 'center', 
    color: '#9CA3AF', 
    marginTop: SH(40), 
    fontSize: SF(14) 
  },
  // ── Pending Visitors Styles ──────────────────────────
  pendingSection: {
    backgroundColor: 'rgba(244,197,66,0.16)',
    borderBottomWidth: 1,
    borderBottomColor: '#F4C542',
    paddingVertical: SH(12),
  },
  pendingSectionHeader: {
    paddingHorizontal: SW(14),
    paddingBottom: SH(8),
  },
  pendingSectionTitle: {
    fontSize: SF(14),
    fontWeight: '700',
    color: '#0A2B5E',
  },
  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: SW(16),
    padding: SW(12),
    width: SW(280),
    borderWidth: SW(2),
    borderColor: '#00BFA6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pendingCardContent: {
    gap: SW(6),
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: SW(8),
    paddingVertical: SH(4),
    borderRadius: SW(6),
  },
  pendingBadgeText: {
    fontSize: SF(11),
    fontWeight: '700',
    color: '#D97706',
  },
  pendingName: {
    fontSize: SF(15),
    fontWeight: '700',
    color: '#1F2937',
  },
  pendingFlat: {
    fontSize: SF(12),
    color: '#007BFF',
    fontWeight: '600',
  },
  pendingMeta: {
    fontSize: SF(12),
    color: '#6B7280',
  },
  pendingTime: {
    fontSize: SF(11),
    color: '#9CA3AF',
  },
  pendingAction: {
    fontSize: SF(11),
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: SH(2),
  },
  pendingBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SH(2),
  },
  pendingSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Modal Styles ─────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: SW(24),
    borderTopRightRadius: SW(24),
    paddingHorizontal: SW(16),
    paddingTop: SH(16),
    paddingBottom: SH(16),
    maxHeight: '90%',
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    width: SW(32),
    height: SH(32),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SW(16),
    backgroundColor: '#F3F4F6',
  },
  modalCloseText: {
    fontSize: SF(18),
    fontWeight: '700',
    color: '#6B7280',
  },
  modalHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: SW(8),
    marginBottom: SH(16),
  },
  modalTitle: {
    fontSize: SF(20),
    fontWeight: '900',
    color: '#1F2937',
  },
  modalBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: SW(10),
    paddingVertical: SH(5),
    borderRadius: SW(8),
  },
  modalBadgeText: {
    fontSize: SF(12),
    fontWeight: '700',
    color: '#D97706',
  },
  modalDetailsScroll: {
    flexGrow: 0,
    maxHeight: SH(300),
    marginBottom: SH(16),
  },
  modalDetailsContainer: {
    gap: SW(12),
  },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: SH(12),
  },
  detailLabel: {
    fontSize: SF(12),
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: SH(4),
  },
  detailValue: {
    fontSize: SF(14),
    color: '#1F2937',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SW(10),
    justifyContent: 'space-between',
  },
  denyBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    paddingVertical: SH(12),
    paddingHorizontal: SW(12),
    borderRadius: SW(10),
    alignItems: 'center',
    borderWidth: SW(1),
    borderColor: '#FCA5A5',
  },
  denyBtnText: {
    fontSize: SF(14),
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: SH(12),
    paddingHorizontal: SW(12),
    borderRadius: SW(10),
    alignItems: 'center',
  },
  approveBtnText: {
    fontSize: SF(14),
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── + Add Action Sheet ────────────────────────────────────
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: SW(24),
    borderTopRightRadius: SW(24),
    paddingTop: SH(12),
    paddingHorizontal: SW(16),
    paddingBottom: SH(36),
  },
  sheetHandle: {
    width: SW(40),
    height: SH(4),
    backgroundColor: '#D1D5DB',
    borderRadius: SW(2),
    alignSelf: 'center',
    marginBottom: SH(16),
  },
  sheetTitle: {
    fontSize: SF(20),
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: SH(4),
  },
  sheetSubtitle: {
    fontSize: SF(13),
    color: '#6B7280',
    marginBottom: SH(16),
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: SW(12),
    borderWidth: SW(1),
    borderColor: '#E5E7EB',
    padding: SW(14),
    marginBottom: SH(10),
    gap: SW(14),
  },
  actionIcon: {
    width: SW(46),
    height: SH(46),
    borderRadius: SW(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: { fontSize: 22 },
  actionInfo: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  actionHint:  { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  actionArrow: { fontSize: 22, color: '#9CA3AF' },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: SH(13),
    marginTop: SH(4),
    borderWidth: SW(1),
    borderColor: '#E5E7EB',
    borderRadius: SW(12),
  },
  sheetCancelText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
});

