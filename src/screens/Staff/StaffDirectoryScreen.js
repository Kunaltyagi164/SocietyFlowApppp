// src/screens/Staff/StaffDirectoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../theme';
import * as api from '../../services/api';
import { ScreenBackground } from '../../components';
import { SF, SH, SW } from '../../utils/responsive';

export default function StaffDirectoryScreen({ navigation }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await api.getStaffMembers();
      setStaff(res.data?.data || []);
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone) => {
    if (!phone) {
      Alert.alert('⚠️ No Phone', 'Phone number not available');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case 'security':
        return '👮';
      case 'maintenance':
        return '🔧';
      case 'manager':
        return '👔';
      case 'guard':
        return '🚨';
      case 'cleaning':
        return '🧹';
      default:
        return '👤';
    }
  };

  if (loading) {
    return (
      <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.teal} style={{ marginTop: 40 }} />
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>👥 Staff Directory</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.section}>
          {staff.length > 0 ? (
            staff.map((member) => (
              <View key={member.id} style={styles.staffCard}>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffIcon}>{getRoleIcon(member.role)}</Text>
                  <View style={styles.staffDetails}>
                    <Text style={styles.staffName}>{member.name}</Text>
                    <Text style={styles.staffRole}>{member.role}</Text>
                    {member.shift && (
                      <Text style={styles.staffShift}>🕐 {member.shift}</Text>
                    )}
                    {member.phone && (
                      <Text style={styles.staffPhone}>📱 {member.phone}</Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall(member.phone)}
                >
                  <Text style={styles.callBtnText}>📞</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No staff members</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
  section: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  staffCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    marginBottom: SH(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: Colors.teal,
    ...Shadow.soft,
  },
  staffInfo: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    gap: SW(12),
  },
  staffIcon: {
    fontSize: SF(32),
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: SF(15),
    fontWeight: '700',
    color: Colors.textDark,
  },
  staffRole: {
    fontSize: SF(13),
    color: Colors.teal,
    fontWeight: '600',
    marginTop: SH(2),
  },
  staffShift: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    marginTop: SH(2),
  },
  staffPhone: {
    fontSize: SF(12),
    color: Colors.textSecondary,
    marginTop: SH(2),
  },
  callBtn: {
    backgroundColor: Colors.blue,
    width: SW(44),
    height: SH(44),
    borderRadius: SW(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtnText: {
    fontSize: SF(20),
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SH(40),
  },
  emptyIcon: {
    fontSize: SF(48),
    marginBottom: SH(12),
  },
  emptyText: {
    fontSize: SF(14),
    color: Colors.textSecondary,
  },
});
