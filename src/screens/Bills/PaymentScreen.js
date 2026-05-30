// src/screens/Bills/PaymentScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Colors, Fonts, Radius, Shadow, Spacing } from '../../theme';
import * as api from '../../services/api';
import { SF, SH, SW } from '../../utils/responsive';

export default function PaymentScreen({ route, navigation }) {
  const { bill } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState('online');
  const [amount, setAmount] = useState(bill?.amount ? bill.amount.toString() : '');
  const [notes, setNotes] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const paymentModes = [
    { id: 'online', label: 'Online (Razorpay)', icon: '💳' },
    { id: 'cash', label: 'Cash', icon: '💵' },
    { id: 'upi', label: 'UPI Transfer', icon: '📱' },
    { id: 'cheque', label: 'Cheque', icon: '📄' },
    { id: 'bank', label: 'Bank Transfer', icon: '🏦' },
  ];

  // Handle Razorpay Payment
  const handleRazorpayPayment = async () => {
    try {
      setLoading(true);
      
      // Step 1: Create payment order
      const orderResponse = await api.createPaymentOrder({
        bill_id: bill.id,
        amount: parseFloat(amount),
      });

      const orderData = orderResponse.data?.data;
      if (!orderData?.order_id) {
        throw new Error('Failed to create payment order');
      }

      // Note: In production, you would integrate actual Razorpay SDK here
      // For now, showing a modal to confirm payment
      setPaymentStatus('processing');
      setShowModal(true);

      // Simulate payment processing (3 seconds)
      setTimeout(async () => {
        try {
          // Step 2: Verify payment (in real scenario, with actual Razorpay signature)
          const verifyResponse = await api.verifyPayment({
            razorpay_order_id: orderData.order_id,
            razorpay_payment_id: 'pay_' + Math.random().toString(36).substr(2, 9),
            razorpay_signature: 'sig_' + Math.random().toString(36).substr(2, 9),
            bill_id: bill.id,
          });

          if (verifyResponse.data?.data?.paid) {
            setPaymentStatus('success');
            setTimeout(() => {
              setShowModal(false);
              Alert.alert('✅ Payment Successful', `Bill paid: ₹${amount}`, [
                { text: 'View Invoice', onPress: () => generateInvoice() },
                { text: 'Back to Bills', onPress: () => navigation.goBack() },
              ]);
            }, 1500);
          }
        } catch (err) {
          setPaymentStatus('error');
          console.error('Payment verification failed:', err);
          setTimeout(() => {
            setShowModal(false);
            Alert.alert('❌ Payment Failed', err.message || 'Please try again');
          }, 1500);
        }
      }, 3000);
    } catch (err) {
      setLoading(false);
      Alert.alert('❌ Error', err.message || 'Failed to initiate payment');
    }
  };

  // Handle Manual Payment (Cash, Cheque, etc.)
  const handleManualPayment = async () => {
    try {
      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert('⚠️ Invalid Amount', 'Please enter a valid amount');
        return;
      }

      setLoading(true);
      const response = await api.recordManualPayment({
        bill_id: bill.id,
        amount: parseFloat(amount),
        payment_mode: paymentMode.toUpperCase(),
        notes: notes || undefined,
      });

      setLoading(false);
      Alert.alert('✅ Payment Recorded', `₹${amount} recorded as ${paymentMode}`, [
        { text: 'View Invoice', onPress: () => generateInvoice() },
        { text: 'Back to Bills', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      setLoading(false);
      Alert.alert('❌ Error', err.message || 'Failed to record payment');
    }
  };

  // Generate Invoice PDF
  const generateInvoice = async () => {
    try {
      const invoiceResponse = await api.generateInvoice(bill.id);
      // In production, this would download/open a PDF
      Alert.alert('📄 Invoice', 'Invoice generated successfully\n(PDF download feature coming soon)');
    } catch (err) {
      Alert.alert('❌ Error', 'Failed to generate invoice');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Pay Bill</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Bill Details */}
        <View style={[styles.card, styles.billCard]}>
          <View style={styles.billRow}>
            <Text style={styles.label}>Bill Amount</Text>
            <Text style={styles.billAmount}>₹{bill?.amount || 0}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.label}>Bill Type</Text>
            <Text style={styles.billType}>{bill?.bill_type || 'Maintenance'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.billRow}>
            <Text style={styles.label}>Due Date</Text>
            <Text style={styles.dueDate}>{bill?.due_date || 'N/A'}</Text>
          </View>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Amount</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="Enter amount"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.maxBtn}
            onPress={() => setAmount(bill?.amount.toString())}
            disabled={loading}
          >
            <Text style={styles.maxBtnText}>Pay Full Amount</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <View style={styles.paymentModes}>
            {paymentModes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[
                  styles.modeBtn,
                  paymentMode === mode.id && styles.modeBtn_Active,
                ]}
                onPress={() => setPaymentMode(mode.id)}
                disabled={loading}
              >
                <Text style={styles.modeIcon}>{mode.icon}</Text>
                <Text
                  style={[
                    styles.modeLabel,
                    paymentMode === mode.id && styles.modeLabel_Active,
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes (for manual payments) */}
        {paymentMode !== 'online' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Enter reference number, cheque no., etc."
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              editable={!loading}
            />
          </View>
        )}

        {/* Payment Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.payBtn,
              (loading || !amount) && styles.payBtn_Disabled,
            ]}
            onPress={
              paymentMode === 'online'
                ? handleRazorpayPayment
                : handleManualPayment
            }
            disabled={loading || !amount}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.payBtnText}>
                  {paymentMode === 'online'
                    ? '💳 Pay with Razorpay'
                    : '✓ Confirm Payment'}
                </Text>
                <Text style={styles.payBtnAmount}>₹{amount || 0}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Important</Text>
          <Text style={styles.infoText}>
            • Online payments via Razorpay are instant{'\n'}
            • Manual payments need admin approval{'\n'}
            • Invoice will be generated after confirmation
          </Text>
        </View>
      </ScrollView>

      {/* Payment Processing Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {paymentStatus === 'processing' && (
              <>
                <ActivityIndicator size="large" color={Colors.teal} />
                <Text style={styles.modalText}>Processing Payment...</Text>
              </>
            )}
            {paymentStatus === 'success' && (
              <>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.modalText}>Payment Successful!</Text>
                <Text style={styles.modalSubtext}>₹{amount} paid</Text>
              </>
            )}
            {paymentStatus === 'error' && (
              <>
                <Text style={styles.errorIcon}>❌</Text>
                <Text style={styles.modalText}>Payment Failed</Text>
                <Text style={styles.modalSubtext}>Please try again</Text>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    backgroundColor: '#2563EB',
    ...Shadow.soft,
  },
  backBtn: {
    fontSize: SF(16),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  title: {
    fontSize: SF(20),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  card: {
    margin: SW(16),
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(16),
    ...Shadow.soft,
  },
  billCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.teal,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SH(8),
  },
  label: {
    fontSize: SF(14),
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  billAmount: {
    fontSize: SF(24),
    fontWeight: 'bold',
    color: Colors.teal,
  },
  billType: {
    fontSize: SF(14),
    color: Colors.textDark,
    fontWeight: '500',
  },
  dueDate: {
    fontSize: SF(14),
    color: Colors.textDark,
  },
  divider: {
    height: SH(1),
    backgroundColor: Colors.primaryLight,
    marginVertical: SH(8),
  },
  section: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  sectionTitle: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(12),
  },
  amountInput: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    fontSize: SF(16),
    color: Colors.textDark,
    borderWidth: SW(1),
    borderColor: Colors.primaryLight,
    marginBottom: SH(8),
  },
  maxBtn: {
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.md,
    paddingVertical: SH(10),
    alignItems: 'center',
  },
  maxBtnText: {
    color: Colors.teal,
    fontWeight: '600',
  },
  paymentModes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modeBtn: {
    width: '48%',
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    alignItems: 'center',
    marginBottom: SH(10),
    borderWidth: SW(2),
    borderColor: Colors.primaryLight,
  },
  modeBtn_Active: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealLight,
  },
  modeIcon: {
    fontSize: SF(28),
    marginBottom: SH(4),
  },
  modeLabel: {
    fontSize: SF(12),
    color: Colors.textDark,
    fontWeight: '500',
    textAlign: 'center',
  },
  modeLabel_Active: {
    color: Colors.teal,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    fontSize: SF(14),
    color: Colors.textDark,
    borderWidth: SW(1),
    borderColor: Colors.primaryLight,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  payBtn: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.lg,
    paddingVertical: SH(14),
    paddingHorizontal: SW(16),
    alignItems: 'center',
    ...Shadow.soft,
  },
  payBtn_Disabled: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.6,
  },
  payBtnText: {
    color: Colors.bgWhite,
    fontSize: SF(16),
    fontWeight: '700',
  },
  payBtnAmount: {
    color: Colors.bgWhite,
    fontSize: SF(14),
    marginTop: SH(4),
  },
  infoBox: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
    backgroundColor: Colors.blueLight,
    borderRadius: Radius.md,
    padding: SW(12),
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue,
  },
  infoTitle: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.blue,
    marginBottom: SH(6),
  },
  infoText: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    lineHeight: SH(18),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.lg,
    padding: SW(32),
    alignItems: 'center',
    minWidth: SW(250),
  },
  modalText: {
    fontSize: SF(18),
    fontWeight: '700',
    color: Colors.textDark,
    marginTop: SH(16),
  },
  modalSubtext: {
    fontSize: SF(14),
    color: Colors.textSecondary,
    marginTop: SH(8),
  },
  successIcon: {
    fontSize: SF(60),
    marginBottom: SH(16),
  },
  errorIcon: {
    fontSize: SF(60),
    marginBottom: SH(16),
  },
});
