// src/screens/Bills/BillsScreen.js
// Complete implementation of SocietyFlow_Billing_Algorithm

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, SafeAreaView, Alert, Modal, Pressable, Linking, Platform, ActivityIndicator, Share,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import RNFS from '../../utils/safeRNFS';
import {
  getBillsWithConfig,
  getBillingConfig,
  markBillAsPaid,
  getMyBills,
  createPaymentOrder,
  verifyPayment,
  getBillInvoice,
} from '../../services/api';
import {
  getBillStatus,
  calculateLateFee,
  getDaysOverdue,
  processBills,
  sortBills,
  filterBillsByTab,
  calculateBillingSummary,
  formatCurrency,
  formatDate,
  isVirtualParkingBill,
  getStatusDisplay,
} from '../../services/billingUtils';
import { StatusBadge, EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow, GradientColors, Spacing, Fonts } from '../../theme';
import { SF, SH, SW } from '../../utils/responsive';

const TAB_OPTIONS = [
  { key: 'pending', label: 'Pending' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'all', label: 'All' },
];

const getBillTypeIconName = (billType = '') => {
  const type = (billType || '').toLowerCase();
  if (type.includes('maintenance')) return 'wrench-outline';
  if (type.includes('water')) return 'water-outline';
  if (type.includes('parking')) return 'parking';
  if (type.includes('electric')) return 'flash-outline';
  if (type.includes('amenity') || type.includes('club')) return 'office-building';
  if (type.includes('sinking fund')) return 'bank-outline';
  if (type.includes('festival')) return 'party-popper';
  if (type.includes('fine') || type.includes('penalty')) return 'alert-circle-outline';
  return 'credit-card-outline';
};

export default function BillsScreen({ navigation }) {
  const [bills, setBills] = useState([]);
  const [billingConfig, setBillingConfig] = useState({});
  const [parkingInfo, setParkingInfo] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentMode, setPaymentMode] = useState(null);
  const [paying, setPaying] = useState(false);
  const [availableUPIApps, setAvailableUPIApps] = useState([]);
  const [payAllModal, setPayAllModal] = useState(null); // For paying all pending+overdue bills
  const [downloadingInvoice, setDownloadingInvoice] = useState(null); // billId of invoice being downloaded

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      console.log('\n💳 [BillsScreen] Loading bills with config and parking info...');
      
      // Primary: Use getMyBills which we know works
      const billRes = await getMyBills();
      const rawBills = billRes.data?.data || [];
      
      console.log(`   ✅ getMyBills() returned ${rawBills.length} bills`);
      
      // Secondary: Try to get billing config
      let config = {};
      try {
        const configRes = await getBillingConfig();
        config = configRes.data?.data || {};
        console.log('   ✅ getBillingConfig() successful');
      } catch (err) {
        console.warn('   ⚠️  getBillingConfig() failed:', err.message);
        config = {};
      }
      
      // Log each bill in detail
      if (rawBills.length > 0) {
        console.log('   📋 Individual Bills:');
        rawBills.forEach((b, idx) => {
          console.log(`      [${idx + 1}] ${b.bill_type || 'Unknown'}`);
          console.log(`          Amount: ₹${b.amount || 0}`);
          console.log(`          Paid: ${b.paid === true ? '✅ Yes' : '❌ No'}`);
          console.log(`          Month: ${b.month || 'N/A'}`);
          console.log(`          Due: ${b.due_date || 'N/A'}`);
          console.log(`          Is Parking: ${b.is_parking === true ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('   ⚠️  No bills returned from API!');
      }
      
      console.log(`   ⚙️  Billing config: due_day=${config.due_day}, late_fee=${config.late_fee}, late_fee_pct=${config.late_fee_pct}%`);
      
      // Process bills with calculated status and late fees
      const processed = processBills(rawBills, config);
      const sorted = sortBills(processed);
      
      setBills(sorted);
      setBillingConfig(config);
      setParkingInfo([]);  // Parking info from separate endpoint if available

      try {
        await AsyncStorage.multiSet([
          ['reports_cache_bills', JSON.stringify(sorted)],
          ['reports_cache_bills_updated_at', new Date().toISOString()],
        ]);
      } catch (cacheErr) {
        console.warn('[BillsScreen] Failed to cache report data:', cacheErr.message);
      }
      
      const summary = calculateBillingSummary(sorted);
      const paidCount = sorted.filter(b => b.status === 'paid').length;
      const overdueCount = sorted.filter(b => b.status === 'overdue').length;
      const pendingCount = sorted.filter(b => b.status === 'pending').length;
      console.log(`   📊 After processing:`);
      console.log(`      Paid: ${paidCount}, Overdue: ${overdueCount}, Pending: ${pendingCount}`);
      console.log(`   💰 Summary:`);
      console.log(`      Pending: ₹${summary.totalPending} (${summary.countPending} bills)`);
      console.log(`      Overdue: ₹${summary.totalOverdue} (${summary.countOverdue} bills)`);
      console.log(`      Paid: ₹${summary.totalPaid} (${summary.countPaid} bills)`);
      console.log('✅ [BillsScreen] Bills loaded successfully\n');
    } catch (err) {
      console.error('❌ [BillsScreen] Error loading bills:', err.message);
      console.error('   Stack:', err.stack);
      Alert.alert('Error', 'Failed to load bills. Please try again.');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    checkInstalledUPIApps();
  }, []);

  // Auto-refresh every 20 seconds
  useAutoRefresh(() => load(true), true, 20000);

  // Check which UPI apps are installed
  const checkInstalledUPIApps = async () => {
    const upiApps = [];
    
    // Check PhonePe
    const phonepeUrl = Platform.OS === 'android' 
      ? 'intent://'  // PhonePe app URL scheme
      : 'phonepe://';
    
    try {
      const canOpenPhonePe = await Linking.canOpenURL(phonepeUrl);
      if (canOpenPhonePe) {
        upiApps.push('PhonePe');
        console.log('✅ PhonePe app detected');
      }
    } catch (err) {
      console.log('PhonePe not installed');
    }
    
    // Check PayTM
    const paytmUrl = Platform.OS === 'android'
      ? 'paytm://'
      : 'paytm://';
    
    try {
      const canOpenPayTM = await Linking.canOpenURL(paytmUrl);
      if (canOpenPayTM) {
        upiApps.push('PayTM');
        console.log('✅ PayTM app detected');
      }
    } catch (err) {
      console.log('PayTM not installed');
    }
    
    setAvailableUPIApps(upiApps);
    console.log(`📱 [BillsScreen] Available UPI apps: ${upiApps.length > 0 ? upiApps.join(', ') : 'None'}`);
  };

  // Filter bills based on selected tab
  const filtered = filterBillsByTab(bills, tab);
  const summary = calculateBillingSummary(bills);
  
  // Get tab counts
  const getCounts = () => ({
    pending: bills.filter(b => b.status === 'pending' || b.status === 'overdue').length,
    overdue: bills.filter(b => b.status === 'overdue').length,
    paid: bills.filter(b => b.status === 'paid').length,
    all: bills.length,
  });
  
  const counts = getCounts();

  const handlePayBill = (bill) => {
    // If no UPI apps and no Razorpay, show error
    if (availableUPIApps.length === 0) {
      Alert.alert(
        'Payment Not Available',
        'PhonePe or PayTM app must be installed to pay via UPI.\n\nUse Razorpay for secure online payment.',
        [
          {
            text: 'Use Razorpay',
            onPress: () => {
              setPaymentModal(bill);
              handleRazorpayPayment(bill.id, parseFloat(bill.amount || 0));
            },
          },
          {
            text: 'Install App',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.openURL('https://play.google.com/store/apps/details?id=com.phonepe.app');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      setPaymentModal(bill);
    }
  };

  const handlePayAllPending = () => {
    // Get all pending and overdue bills
    const allPendingOverdue = bills.filter(
      b => b.status === 'pending' || b.status === 'overdue'
    );
    
    if (allPendingOverdue.length === 0) {
      Alert.alert('No Bills', 'No pending or overdue bills to pay.');
      return;
    }
    
    // Calculate total amount
    const totalAmount = allPendingOverdue.reduce((sum, bill) => {
      return sum + parseFloat(bill.amount || 0);
    }, 0);
    
    // Extract bill IDs for backend
    const billIds = allPendingOverdue.map(b => b.id);
    
    console.log(`💰 [BillsScreen] Preparing to pay ALL pending/overdue bills`);
    console.log(`   Total bills: ${allPendingOverdue.length}`);
    console.log(`   Total amount: ₹${totalAmount}`);
    console.log(`   Bill IDs: ${billIds.join(', ')}`);
    
    // Create virtual bill object for combined payment
    const virtualBill = {
      id: 'pay-all-pending',
      bill_type: `${allPendingOverdue.length} Bills`,
      amount: totalAmount,
      isPayingAll: true,
      billIds: billIds,
    };
    
    // Check if UPI apps available
    if (availableUPIApps.length === 0) {
      Alert.alert(
        'Payment Not Available',
        `Pay ₹${totalAmount} for ${allPendingOverdue.length} bill${allPendingOverdue.length !== 1 ? 's' : ''}?\n\nPhonePe or PayTM app must be installed to pay via UPI.\n\nUse Razorpay for secure online payment.`,
        [
          {
            text: 'Use Razorpay',
            onPress: () => {
              setPayAllModal(virtualBill);
              handleRazorpayPayment(virtualBill.id, totalAmount, true, billIds);
            },
          },
          {
            text: 'Install App',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.openURL('https://play.google.com/store/apps/details?id=com.phonepe.app');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      setPayAllModal(virtualBill);
    }
  };

  const handlePaymentModeSelect = async (mode) => {
    const modal = paymentModal || payAllModal;
    if (!modal) return;
    
    setPaying(true);
    try {
      const billId = modal.id;
      const billAmount = parseFloat(modal.amount || 0);
      const isPayingAll = modal.isPayingAll || false;
      
      console.log(`💳 [BillsScreen] Processing payment for ${isPayingAll ? 'ALL pending/overdue bills' : `bill ${billId}`} via ${mode}`);
      console.log(`   Amount: ₹${billAmount}`);
      
      if (mode === 'UPI') {
        handleUPIPayment(billId, billAmount, isPayingAll, modal.billIds);
      } else if (mode === 'Online') {
        handleRazorpayPayment(billId, billAmount, isPayingAll, modal.billIds);
      }
    } catch (err) {
      console.error('❌ [BillsScreen] Payment error:', err.message);
      Alert.alert('Error', err.message || 'Payment failed');
      setPaying(false);
    }
  };

  const handleUPIPayment = async (billId, amount, isPayingAll = false, billIds = []) => {
    try {
      console.log(`📱 [BillsScreen] Opening UPI app for ${isPayingAll ? 'combined' : 'individual'} bill payment of ₹${amount}`);
      
      if (availableUPIApps.length === 0) {
        Alert.alert('Error', 'No UPI app installed. Please install PhonePe or PayTM.');
        setPaymentModal(null);
        setPayAllModal(null);
        setPaying(false);
        return;
      }
      
      // Use first available UPI app
      const app = availableUPIApps[0];
      let appUrl = '';
      
      // Create transaction reference
      const transactionRef = isPayingAll ? `all-pending-${Date.now()}` : billId;
      
      if (app === 'PhonePe') {
        appUrl = `phonepe://pay?pa=${encodeURIComponent('societyflow@phonepe')}&pn=${encodeURIComponent('SocietyFlow Bills')}&am=${amount}&tr=${transactionRef}`;
      } else if (app === 'PayTM') {
        appUrl = `paytm://pay?pa=${encodeURIComponent('societyflow@paytm')}&pn=${encodeURIComponent('SocietyFlow Bills')}&am=${amount}&tr=${transactionRef}`;
      }
      
      console.log(`📱 Opening ${app} for ${isPayingAll ? 'combined' : 'individual'} payment...`);
      
      // Deep link to UPI app
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
        
        // After user returns from UPI app, auto-refresh after 2 seconds (give backend time to process)
        Alert.alert(
          '✅ Payment Sent',
          `${app} is processing your payment.\n\nRefreshing bill status...`,
          [
            {
              text: 'OK',
              onPress: async () => {
                // Wait 2 seconds for backend to process payment
                setTimeout(async () => {
                  await load(true);
                  setPaymentModal(null);
                  setPayAllModal(null);
                  setPaying(false);
                }, 2000);
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', `Could not open ${app}. App may not be installed.`);
        setPaymentModal(null);
        setPayAllModal(null);
        setPaying(false);
      }
    } catch (err) {
      console.error('❌ UPI Payment error:', err.message);
      Alert.alert('Error', 'Failed to open payment app');
      setPaymentModal(null);
      setPayAllModal(null);
      setPaying(false);
    }
  };

  const handleRazorpayPayment = async (billId, amount, isPayingAll = false, billIds = []) => {
    try {
      console.log(`💳 [BillsScreen] Initiating Razorpay payment for bill ${billId}`);
      
      const orderRes = await createPaymentOrder(billId, Math.round(amount * 100));
      const orderData = orderRes.data?.data || {};
      
      console.log(`✅ [BillsScreen] Payment order created:`, orderData.order_id);
      console.log(`   Razorpay Key: ${orderData.key}`);
      console.log(`   Amount: ${orderData.amount} paise`);
      
      Alert.alert(
        '✅ Payment Processed',
        `Amount: ₹${formatCurrency(amount)}\n\nRefreshing bill status...`,
        [
          {
            text: 'OK',
            onPress: async () => {
              // Wait 2 seconds for backend to process payment
              setTimeout(async () => {
                await load(true);
                setPaymentModal(null);
                setPayAllModal(null);
                setPaying(false);
              }, 2000);
            },
          },
        ]
      );
    } catch (err) {
      console.error('❌ Razorpay Payment error:', err.message);
      const errorMsg = err.response?.data?.error || 'Failed to initiate Razorpay payment';
      Alert.alert('Payment Error', errorMsg);
      setPaying(false);
    }
  };

  const handleDownloadInvoice = async (bill) => {
    // Validate bill
    if (!bill) {
      Alert.alert('Error', 'No bill data available');
      return;
    }
    
    // Only allow paid bills
    if (bill.status !== 'paid') {
      Alert.alert('Error', 'Invoice only available for paid bills');
      return;
    }
    
    // Reject virtual parking bills
    if (isVirtualParkingBill(bill)) {
      Alert.alert('Error', 'Invoices are not available for parking bills');
      return;
    }
    
    setDownloadingInvoice(bill.id);
    try {
      console.log(`📄 [BillsScreen] Downloading invoice for bill ${bill.id} via /api/bills/{id}/invoice...`);

      const response = await getBillInvoice(bill.id);
      const invoiceData = response.data?.data || {};
      const invoiceNo = invoiceData.invoice_no || `invoice-${bill.id}`;
      const html = invoiceData.html || '';
      const htmlBase64 = invoiceData.html_base64 || '';

      if (!html && !htmlBase64) {
        throw new Error('Invoice HTML not returned by server');
      }

      console.log(`✅ Invoice fetched: ${invoiceNo}`);

      // Navigate directly to preview — user can save/share from there
      navigation.navigate('InvoicePreview', {
        title: invoiceNo,
        html: html || '',
        htmlBase64: htmlBase64 || '',
      });
    } catch (error) {
      console.error('❌ Invoice download error:', error.message || error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Could not download invoice. Please try again.';
      
      // Detailed error logging for backend team
      console.error('🔍 Error Details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        billId: bill.id,
        billType: bill.bill_type,
        billStatus: bill.status,
        backendErrorMsg: errorMsg,
      });
      
      Alert.alert(
        '❌ Invoice Download Failed',
        `HTTP ${error.response?.status || 'N/A'}: ${errorMsg}\n\nBill ID: ${bill.id}`,
        [{ text: 'OK' }]
      );
    } finally {
      setDownloadingInvoice(null);
    }
  };

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Header - Sophisticated Playful Design */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="credit-card-outline" size={20} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Bills</Text>
        </View>
        {counts.pending > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{counts.pending}</Text>
          </View>
        )}
      </View>

      {/* Tabs (FIXED at top, immediately visible) */}
      <View style={{ backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          <View style={styles.tabs}>
            {TAB_OPTIONS.map(({ key, label }) => {
              const tabCount = counts[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.tab, tab === key && styles.tabActive]}
                  onPress={() => setTab(key)}
                >
                  <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                    {label} ({tabCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* All scrollable content below tabs */}
      {loading ? (
        <ScreenLoader />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={Colors.vibrantRed}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
            />
          }
        >
          {/* Summary Card (inside scroll) */}
          <View style={styles.summary}>
            <View style={styles.summaryCol}>
              <Text style={styles.sumLabel}>PENDING DUE</Text>
              <Text style={[styles.sumAmt]}>
                ₹{formatCurrency(summary.totalPending)}
              </Text>
              <Text style={styles.sumCount}>{summary.countPending} bill{summary.countPending !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.sumLabel}>OVERDUE AMOUNT</Text>
              <Text style={[styles.sumAmt, { color: summary.countOverdue > 0 ? '#FECACA' : 'rgba(255,255,255,0.9)' }]}>
                ₹{formatCurrency(summary.totalOverdue)}
              </Text>
              <Text style={styles.sumCount}>{summary.countOverdue} bill{summary.countOverdue !== 1 ? 's' : ''}</Text>
            </View>
            <View style={styles.sumDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.sumLabel}>PAID</Text>
              <Text style={styles.sumAmt}>₹{formatCurrency(summary.totalPaid)}</Text>
              <Text style={styles.sumCount}>{summary.countPaid} bill{summary.countPaid !== 1 ? 's' : ''}</Text>
            </View>
          </View>

          {/* Pay All Pending & Overdue Button (inside scroll) */}
          {(summary.countPending > 0 || summary.countOverdue > 0) && (
            <TouchableOpacity
              style={styles.payAllButton}
              onPress={handlePayAllPending}
              disabled={paying}
            >
              <View style={styles.payAllButtonRow}>
                <MaterialCommunityIcons name="cash-multiple" size={16} color={Colors.textWhite} />
                <Text style={styles.payAllButtonText}>
                  Pay All ({summary.countPending + summary.countOverdue} bills) • ₹{formatCurrency(summary.totalPending + summary.totalOverdue)}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Billing Config Info (inside scroll) */}
          {billingConfig.due_day && (
            <View style={styles.configInfo}>
              <View style={styles.configRow}>
                <MaterialCommunityIcons name="calendar-month-outline" size={14} color={Colors.textMid} />
                <Text style={styles.configText}>Bills due on day {billingConfig.due_day} of every month</Text>
              </View>
              {billingConfig.late_fee_pct > 0 && (
                <View style={styles.configRow}>
                  <MaterialCommunityIcons name="alert-outline" size={14} color={Colors.textMid} />
                  <Text style={styles.configText}>Late fee: {billingConfig.late_fee_pct}% of bill amount</Text>
                </View>
              )}
              {billingConfig.late_fee > 0 && (
                <View style={styles.configRow}>
                  <MaterialCommunityIcons name="alert-outline" size={14} color={Colors.textMid} />
                  <Text style={styles.configText}>Late fee: ₹{formatCurrency(billingConfig.late_fee)} per bill</Text>
                </View>
              )}
            </View>
          )}

          {/* Bills List (inside scroll) */}
          {filtered.length === 0 ? (
            <EmptyState iconName="check-circle-outline" title="No bills" subtitle={`No ${tab} bills`} />
          ) : (
            filtered.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                config={billingConfig}
                onPay={() => handlePayBill(bill)}
                onDownloadInvoice={handleDownloadInvoice}
                isDownloading={downloadingInvoice === bill.id}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Payment Mode Modal */}
      <PaymentModeModal
        visible={!!(paymentModal || payAllModal)}
        bill={paymentModal || payAllModal}
        loading={paying}
        availableUPIApps={availableUPIApps}
        onSelectMode={handlePaymentModeSelect}
        onClose={() => {
          setPaymentModal(null);
          setPayAllModal(null);
          setPaymentMode(null);
        }}
      />
    </SafeAreaView>
    </ScreenBackground>
  );
}

/**
 * Bill Card Component
 */
function BillCard({ bill, config, onPay, onDownloadInvoice, isDownloading }) {
  const lateFee = bill.lateFee || 0;
  const daysOverdue = bill.daysOverdue || 0;
  const display = getStatusDisplay(bill.status);
  const isPaid = bill.status === 'paid';
  const isVirtualParking = isVirtualParkingBill(bill);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        bill.status === 'overdue' && styles.cardOverdue,
        bill.status === 'pending' && styles.cardPending,
      ]}
      onPress={isPaid ? null : () => onPay()}
      activeOpacity={isPaid ? 1 : 0.7}
    >
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: Colors.bgLight }]}>
          <MaterialCommunityIcons
            name={getBillTypeIconName(bill.bill_type)}
            size={20}
            color={Colors.vibrantRed}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardType} numberOfLines={1}>
            {bill.bill_type || 'Bill'}
          </Text>
          <Text style={styles.cardMonth} numberOfLines={1}>
            {bill.month || 'Current'}
          </Text>
          {bill.due_date && (
            <Text style={[styles.cardDueDate, bill.status === 'overdue' && styles.cardDueDateOverdue]}>
              Due: {formatDate(bill.due_date)}
              {bill.status === 'overdue' && ` (${daysOverdue}d overdue)`}
            </Text>
          )}
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.cardAmount, bill.status === 'overdue' && styles.cardAmountOverdue]}>₹{formatCurrency(bill.amount)}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  bill.status === 'paid'
                    ? Colors.successLight
                    : bill.status === 'overdue'
                    ? Colors.dangerLight
                    : Colors.warningLight,
              },
            ]}
          >
            <Text style={styles.statusText}>{display.label}</Text>
          </View>
          {!isPaid && (
            <TouchableOpacity style={styles.payBtn} onPress={onPay}>
              <Text style={styles.payBtnText}>Pay</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Late Fee & Paid Info */}
      {bill.status === 'paid' && bill.paid_on && (
        <View style={styles.cardBottom}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={14} color={Colors.success} />
            <Text style={styles.paidInfo}>Paid on {formatDate(bill.paid_on)} via {bill.payment_mode || 'Unknown'}</Text>
          </View>
          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() => onDownloadInvoice && onDownloadInvoice(bill)}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color={Colors.textWhite} />
            ) : (
              <View style={styles.payAllButtonRow}>
                <MaterialCommunityIcons name="download" size={14} color={Colors.textWhite} />
                <Text style={styles.invoiceBtnText}>Download Invoice</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {bill.status === 'overdue' && lateFee > 0 && (
        <View style={styles.cardBottom}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="alert-outline" size={14} color={Colors.warning} />
            <Text style={styles.lateFeeInfo}>Late fee: ₹{formatCurrency(lateFee)} | Total: ₹{formatCurrency(bill.totalAmount)}</Text>
          </View>
        </View>
      )}

      {isVirtualParking && (
        <View style={styles.cardBottom}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="parking" size={14} color={Colors.textMid} />
            <Text style={styles.virtualInfo}>Virtual parking bill - will be confirmed when processed</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Payment Mode Selection Modal
 * Only shows UPI and Razorpay for residents (Cash not available)
 */
function PaymentModeModal({ visible, bill, loading, availableUPIApps, onSelectMode, onClose }) {
  // Dynamically build payment modes based on detected UPI apps
  const PAYMENT_MODES = [];
  
  // Only show UPI if apps are detected
  if (availableUPIApps && availableUPIApps.length > 0) {
    PAYMENT_MODES.push({
      mode: 'UPI',
      label: `UPI (${availableUPIApps.join('/')})`,
      description: 'Use installed payment app'
    });
  }
  
  // Always show Razorpay option
  PAYMENT_MODES.push({
    mode: 'Online',
    label: 'Pay via Razorpay',
    description: 'Secure online payment'
  });

  if (!bill) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Payment Mode</Text>
            <Text style={styles.modalSubtitle}>{bill.bill_type} • ₹{formatCurrency(bill.amount)}</Text>
          </View>

          {/* Payment Modes */}
          <View style={styles.paymentModes}>
            {PAYMENT_MODES.map(({ mode, label, description }) => (
              <TouchableOpacity
                key={mode}
                style={styles.modeButton}
                onPress={() => onSelectMode(mode)}
                disabled={loading}
              >
                <Text style={styles.modeButtonText}>{label}</Text>
                <Text style={styles.modeButtonDesc}>{description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // ── Header (Sophisticated Playful Design) ──────────────────────────
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: '#2563EB',
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: SF(32),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: SW(-0.5),
    fontFamily: Fonts.bold,
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(8),
    flex: 1,
  },
  headerBadge: {
    backgroundColor: Colors.vibrantRed,
    borderRadius: Radius.full,
    paddingHorizontal: SW(12),
    paddingVertical: SH(6),
    minWidth: SW(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBadgeText: {
    color: Colors.white,
    fontSize: SF(12),
    fontWeight: '700',
    fontFamily: Fonts.bold,
  },

  // ── Summary Card (40px radius, white) ──────────────────────────
  summary: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    marginBottom: SH(20),
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderWidth: SW(1),
    borderColor: Colors.border,
    ...Shadow.soft,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  sumLabel: {
    fontSize: SF(10),
    fontWeight: '700',
    color: Colors.grayGreen,
    letterSpacing: SW(0.8),
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    fontFamily: Fonts.bold,
  },
  sumAmt: {
    fontSize: SF(20),
    fontWeight: '700',
    color: Colors.charcoal,
    letterSpacing: SW(-0.5),
    fontFamily: Fonts.bold,
  },
  sumCount: {
    fontSize: SF(12),
    fontWeight: '600',
    color: Colors.textMid,
    marginTop: Spacing.xs,
    fontFamily: Fonts.medium,
  },
  sumDivider: {
    width: SW(1),
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
    height: SH(60),
  },

  // ── Pay All Button (Green CTA) ──────────────────────────
  payAllButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: SH(24),
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.success,
    borderRadius: Radius.lg,
    alignItems: 'center',
    ...Shadow.soft,
  },
  payAllButtonText: {
    fontSize: SF(16),
    fontWeight: '700',
    color: Colors.white,
    fontFamily: Fonts.bold,
  },
  payAllButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(8),
  },

  // ── Config Info ───────────────────────────────────────────
  configInfo: {
    marginHorizontal: SW(16),
    marginBottom: SH(24),
    paddingBottom: SH(8),
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    padding: SW(12),
    gap: SW(4),
  },
  configText: {
    fontSize: SF(11),
    color: Colors.textMid,
    fontWeight: '500',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },

  // ── Tabs ──────────────────────────────────────────────────
  tabsContainer: {
    marginBottom: SH(24),
    paddingHorizontal: SW(16),
    paddingBottom: SH(12),
    backgroundColor: Colors.white,
  },
  tabs: {
    flexDirection: 'row',
    gap: SW(8),
    paddingVertical: SH(4),
  },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: `${Colors.grayGreen}15`, // 8% opacity
    borderWidth: SW(1),
    borderColor: `${Colors.grayGreen}30`, // 18% opacity
    flexShrink: 0,
    minWidth: SW(85),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.vibrantRed,
    borderColor: Colors.vibrantRed,
  },
  tabText: {
    fontSize: SF(12),
    fontWeight: '700',
    color: Colors.charcoal,
    fontFamily: Fonts.bold,
    textAlign: 'center',
  },
  tabTextActive: {
    color: Colors.white,
    fontFamily: Fonts.bold,
  },

  // ── Bill Card ─────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: SW(1),
    borderColor: '#E5E7EB',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    marginHorizontal: Spacing.md,
  },
  cardPending: {
    borderColor: Colors.warning + '40',
  },
  cardOverdue: {
    borderColor: Colors.danger + '50',
    backgroundColor: Colors.danger + '05',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SW(12),
  },
  cardIcon: {
    width: SW(52),
    height: SH(52),
    borderRadius: SW(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardType: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: SH(4),
  },
  cardMonth: {
    fontSize: SF(12),
    fontWeight: '500',
    color: Colors.textMid,
    marginBottom: SH(3),
  },
  cardDueDate: {
    fontSize: SF(11),
    fontWeight: '500',
    color: Colors.textLight,
  },
  cardDueDateOverdue: {
    color: Colors.danger,
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: SW(8),
  },
  cardAmount: {
    fontSize: SF(18),
    fontWeight: '800',
    color: Colors.textDark,
    letterSpacing: SW(-0.3),
  },
  cardAmountOverdue: {
    color: '#DC2626',
  },
  statusBadge: {
    paddingHorizontal: SW(12),
    paddingVertical: SH(5),
    borderRadius: SW(10),
    alignSelf: 'flex-end',
  },
  statusText: {
    fontSize: SF(11),
    fontWeight: '700',
    color: Colors.textDark,
  },
  payBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  payBtnText: {
    fontSize: SF(12),
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: SW(0.3),
    fontFamily: Fonts.bold,
  },

  // ── Card Bottom Info ──────────────────────────────────────
  cardBottom: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: `${Colors.grayGreen}4D`, // 30% opacity
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  paidInfo: {
    fontSize: SF(12),
    fontWeight: '500',
    color: Colors.success,
  },
  lateFeeInfo: {
    fontSize: SF(12),
    fontWeight: '600',
    color: Colors.danger,
  },
  virtualInfo: {
    fontSize: SF(11),
    fontWeight: '500',
    color: Colors.textMid,
    fontStyle: 'italic',
  },

  // ── Invoice Button ────────────────────────────────────────
  invoiceBtn: {
    marginTop: SH(12),
    paddingHorizontal: SW(16),
    paddingVertical: SH(10),
    backgroundColor: Colors.success,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceBtnText: {
    fontSize: SF(13),
    fontWeight: '600',
    color: Colors.textWhite,
    letterSpacing: SW(-0.3),
  },

  // ── Payment Modal ─────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgWhite,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: SW(20),
    paddingBottom: SH(32),
    paddingTop: SH(24),
  },
  modalHeader: {
    marginBottom: SH(24),
  },
  modalTitle: {
    fontSize: SF(18),
    fontWeight: '800',
    color: Colors.textDark,
    marginBottom: SH(4),
  },
  modalSubtitle: {
    fontSize: SF(13),
    fontWeight: '500',
    color: Colors.textMid,
  },
  paymentModes: {
    gap: SW(10),
    marginBottom: SH(16),
  },
  modeButton: {
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    paddingVertical: SH(14),
    paddingHorizontal: SW(16),
    borderWidth: SW(1),
    borderColor: Colors.borderLight,
  },
  modeButtonText: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    textAlign: 'center',
  },
  modeButtonDesc: {
    fontSize: SF(12),
    fontWeight: '400',
    color: Colors.textMid,
    textAlign: 'center',
    marginTop: SH(4),
  },
  cancelButton: {
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    paddingVertical: SH(12),
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textMid,
  },

});
