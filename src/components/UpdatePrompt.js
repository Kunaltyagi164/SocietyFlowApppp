/**
 * Update Prompt Component
 * 
 * Shows update notifications:
 * - New version available (optional)
 * - Update required (forced)
 * - Bug alerts
 * - Maintenance alerts
 * 
 * Uses UpdateService for version and feature flag management
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius } from '../theme';
import updateService from '../services/updateService';

const UpdatePrompt = ({ enabled = true, downloadHandler = () => {} }) => {
  const [updateAlert, setUpdateAlert] = useState(null);
  const [updateVisible, setUpdateVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    console.log('📦 [UpdatePrompt] Initializing');

    // Subscribe to update events
    const unsubscribe = updateService.subscribe((event, data) => {
      console.log(`📦 [UpdatePrompt] Event: ${event}`, data);

      if (event === 'versionAvailable') {
        handleVersionAvailable(data);
      } else if (event === 'updateRequired') {
        handleUpdateRequired(data);
      } else if (event === 'bugAlert') {
        handleBugAlert(data);
      } else if (event === 'maintenanceScheduled') {
        handleMaintenance(data);
      }
    });

    return unsubscribe;
  }, [enabled]);

  const handleVersionAvailable = async (data) => {
    const alreadySeen = await updateService.hasVersionBeenSeen(data.version);
    if (alreadySeen) return;

    console.log('📦 [UpdatePrompt] New version available:', data.version);
    setUpdateAlert({
      type: 'available',
      ...data,
    });
    setUpdateVisible(true);
    await updateService.markVersionSeen(data.version);
  };

  const handleUpdateRequired = (data) => {
    console.log('🚨 [UpdatePrompt] Update required:', data.version);
    setUpdateAlert({
      type: 'required',
      ...data,
    });
    setUpdateVisible(true);
  };

  const handleBugAlert = (data) => {
    const alarmColor =
      data.severity === 'critical'
        ? '#f87171'
        : data.severity === 'high'
        ? '#fb923c'
        : '#fbbf24';

    console.log(`🐛 [UpdatePrompt] Bug alert (${data.severity})`);
    Alert.alert(
      `${data.severity.toUpperCase()} - Bug Alert`,
      data.description,
      [
        data.workaround && {
          text: 'Workaround',
          onPress: () => Alert.alert('Workaround', data.workaround),
        },
        { text: 'Dismiss', style: 'cancel' },
      ].filter(Boolean)
    );
  };

  const handleMaintenance = (data) => {
    const startTime = new Date(data.startTime).toLocaleString();
    Alert.alert(
      'Scheduled Maintenance',
      `Maintenance scheduled at ${startTime}\n\nReason: ${data.reason}`
    );
  };

  const handleUpdate = () => {
    console.log('📥 [UpdatePrompt] User started update');
    updateService.reportUpdateStarted(updateAlert.version);
    setUpdateVisible(false);
    downloadHandler(updateAlert.downloadUrl);
  };

  const handleDismiss = () => {
    setUpdateVisible(false);
    setUpdateAlert(null);
  };

  if (!updateAlert || !updateVisible) return null;

  const isRequired = updateAlert.type === 'required';

  return (
    <Modal
      visible={updateVisible}
      transparent
      animationType="fade"
      onRequestClose={() => !isRequired && handleDismiss()}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <MaterialCommunityIcons
                name={isRequired ? 'alert-circle-outline' : 'package-variant-closed'}
                size={42}
                color={isRequired ? '#DC2626' : '#2563EB'}
                style={styles.headerEmoji}
              />
              <Text style={styles.headerTitle}>
                {isRequired ? 'Update Required' : 'New Version Available'}
              </Text>
            </View>

            {/* Version Info */}
            <View style={styles.infoBox}>
              <Text style={styles.label}>New Version</Text>
              <Text style={styles.version}>{updateAlert.version}</Text>
            </View>

            {/* Release Notes */}
            {updateAlert.releaseNotes && (
              <View style={styles.notesBox}>
                <Text style={styles.label}>What's New</Text>
                <Text style={styles.notes}>{updateAlert.releaseNotes}</Text>
              </View>
            )}

            {/* Reason (if required) */}
            {isRequired && updateAlert.reason && (
              <View style={styles.reasonBox}>
                <Text style={styles.label}>Important</Text>
                <Text style={styles.reason}>{updateAlert.reason}</Text>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {!isRequired && (
              <TouchableOpacity
                style={[styles.button, styles.dismissBtn]}
                onPress={handleDismiss}
              >
                <Text style={styles.dismissBtnText}>Later</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.updateBtn]}
              onPress={handleUpdate}
            >
              <Text style={styles.updateBtnText}>
                {isRequired
                  ? 'Update Now'
                  : 'Download & Install'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '80%',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  infoBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  version: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
  },
  notesBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  notes: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  reasonBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F87171',
  },
  reason: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissBtn: {
    backgroundColor: '#E5E7EB',
  },
  dismissBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  updateBtn: {
    flex: 1.5,
    backgroundColor: '#10B981',
  },
  updateBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default UpdatePrompt;
