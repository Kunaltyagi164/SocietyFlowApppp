// src/screens/Complaints/DetailedComplaintScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../theme';
import { StatusBadge, ScreenBackground } from '../../components';
import { SF, SH, SW } from '../../utils/responsive';

const CAT_EMOJI = (c = '') => {
  const t = c.toLowerCase();
  if (t.includes('plumb'))   return '🔧';
  if (t.includes('elect'))   return '⚡';
  if (t.includes('secur'))   return '🔒';
  if (t.includes('clean'))   return '🧹';
  if (t.includes('park'))    return '🅿️';
  if (t.includes('noise'))   return '🔊';
  if (t.includes('internet')) return '📡';
  return '📋';
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
};

const getPriorityColor = (priority) => {
  const p = (priority || '').toLowerCase();
  if (p.includes('urgent')) return Colors.danger;
  if (p.includes('high')) return Colors.warning;
  if (p.includes('medium')) return Colors.teal;
  return Colors.textMid;
};

const getPriorityEmoji = (priority) => {
  const p = (priority || '').toLowerCase();
  if (p.includes('urgent')) return '🔴';
  if (p.includes('high')) return '🟠';
  if (p.includes('medium')) return '🟡';
  return '🟢';
};

const getStatusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'open') return '#2563EB';           // Blue for Open
  if (s === 'in_progress') return '#F59E0B';   // Yellow/Amber for In Progress
  if (s === 'resolved') return '#10B981';      // Green for Resolved
  return Colors.textMid;
};

const getStatusBgColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'open') return '#DBEAFE';            // Light blue for Open
  if (s === 'in_progress') return '#FEF3C7';    // Light yellow for In Progress
  if (s === 'resolved') return '#D1FAE5';       // Light green for Resolved
  return Colors.borderLight;
};

export default function DetailedComplaintScreen({ route, navigation }) {
  const { complaint } = route.params;

  if (!complaint) {
    return (
      <ScreenBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, color: Colors.textMid }}>No complaint data</Text>
        </View>
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  const isClosed = (complaint.status || '').toLowerCase() === 'closed' || 
                   (complaint.status || '').toLowerCase() === 'resolved';

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Issue Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* ── Status Card ──────────────────────────────── */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>STATUS</Text>
              <View style={[styles.statusBadgeDark, { backgroundColor: getStatusBgColor(complaint.status || 'open') }]}>
                <Text style={[styles.statusBadgeDarkText, { color: getStatusColor(complaint.status || 'open') }]}>
                  {(complaint.status || 'open').toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={{ fontSize: 16 }}>{getPriorityEmoji(complaint.priority)}</Text>
              <Text style={[styles.priorityText, { color: getPriorityColor(complaint.priority) }]}>
                {complaint.priority || 'Medium'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Title ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 ISSUE TITLE</Text>
          <View style={styles.contentBox}>
            <Text style={styles.titleText}>{complaint.title}</Text>
          </View>
        </View>

        {/* ── Category ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ CATEGORY</Text>
          <View style={styles.categoryBadge}>
            <Text style={{ fontSize: 20, marginRight: 8 }}>{CAT_EMOJI(complaint.category)}</Text>
            <Text style={styles.categoryText}>{complaint.category || 'General'}</Text>
          </View>
        </View>

        {/* ── Description ──────────────────────────────── */}
        {!!complaint.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 DESCRIPTION</Text>
            <View style={styles.contentBox}>
              <Text style={styles.descText}>{complaint.description}</Text>
            </View>
          </View>
        )}

        {/* ── Timeline ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ TIMELINE</Text>
          <View style={styles.timeline}>
            {/* Created */}
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Created</Text>
                <Text style={styles.timelineDate}>{formatDate(complaint.created_at)}</Text>
              </View>
            </View>

            {/* Resolved/Closed */}
            {isClosed && complaint.resolved_at && (
              <>
                <View style={styles.timelineConnector} />
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: Colors.success }]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>
                      {(complaint.status || '').toLowerCase() === 'closed' ? 'Closed' : 'Resolved'}
                    </Text>
                    <Text style={styles.timelineDate}>{formatDate(complaint.resolved_at)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Admin Notes ──────────────────────────────── */}
        {!!complaint.admin_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💬 ADMIN NOTES</Text>
            <View style={styles.adminBox}>
              <Text style={styles.adminTitle}>Message from Admin</Text>
              <Text style={styles.adminText}>{complaint.admin_notes}</Text>
            </View>
          </View>
        )}

        {/* ── Additional Info ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ DETAILS</Text>
          <View style={styles.infoBox}>
            <InfoRow label="Complaint ID" value={complaint.id || 'N/A'} />
            <InfoRow label="Flat No." value={complaint.flat_no || 'N/A'} />
            <InfoRow label="Resident" value={complaint.resident_name || 'N/A'} />
            {complaint.assigned_to && (
              <InfoRow label="Assigned To" value={complaint.assigned_to} />
            )}
          </View>
        </View>

        {/* ── Note about missing data ──────────────────── */}
        {isClosed && !complaint.assigned_to && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              ℹ️ Your ticket was closed on {formatDate(complaint.resolved_at)}. 
              For more details about who closed it, please contact the admin.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SW(16),
    paddingVertical: SH(14),
    backgroundColor: '#2563EB',
    borderBottomWidth: 0,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '300' },
  title: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  body: { padding: 16, paddingBottom: 80 },

  // ── Status Card ──────────────────────────────────
  statusCard: {
    backgroundColor: Colors.blueLight,
    borderRadius: Radius.lg,
    padding: SW(16),
    marginBottom: SH(20),
    borderLeftWidth: 4,
    borderLeftColor: Colors.blue,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMid, marginBottom: 8, letterSpacing: 0.5 },
  statusBadgeDark: {
    borderRadius: Radius.lg,
    paddingHorizontal: SW(12),
    paddingVertical: SH(8),
    alignSelf: 'flex-start',
    borderWidth: SW(1),
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statusBadgeDarkText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // ── Section ──────────────────────────────────────
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMid, marginBottom: 10, letterSpacing: 0.5 },

  // ── Content Box ──────────────────────────────────
  contentBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: SW(14),
    borderWidth: SW(1),
    borderColor: Colors.border,
  },
  titleText: { fontSize: 16, fontWeight: '700', color: Colors.textDark, lineHeight: 24 },
  descText: { fontSize: 14, color: Colors.textMid, lineHeight: 22 },

  // ── Category Badge ───────────────────────────────
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.tealLight,
    borderRadius: Radius.lg,
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    alignSelf: 'flex-start',
  },
  categoryText: { fontSize: 13, fontWeight: '600', color: Colors.textDark },

  // ── Priority Badge ───────────────────────────────
  priorityBadge: {
    alignItems: 'center',
    backgroundColor: Colors.inputFill,
    borderRadius: Radius.lg,
    paddingHorizontal: SW(12),
    paddingVertical: SH(8),
  },
  priorityText: { fontSize: 11, fontWeight: '700', marginTop: 4 },

  // ── Timeline ─────────────────────────────────────
  timeline: { marginLeft: 8 },
  timelineItem: { flexDirection: 'row', marginBottom: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.teal, marginRight: 12, marginTop: 4 },
  timelineConnector: { width: 2, height: 20, backgroundColor: Colors.border, marginLeft: 5, marginBottom: 4 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: Colors.textDark },
  timelineDate: { fontSize: 12, color: Colors.textMid, marginTop: 2 },

  // ── Admin Box ────────────────────────────────────
  adminBox: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: SW(14),
    borderLeftWidth: 4,
    borderLeftColor: Colors.accent,
  },
  adminTitle: { fontSize: 12, fontWeight: '700', color: Colors.accent, marginBottom: 8 },
  adminText: { fontSize: 13, color: Colors.textMid, lineHeight: 20 },

  // ── Info Box ─────────────────────────────────────
  infoBox: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: SW(12),
    borderWidth: SW(1),
    borderColor: Colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SH(10),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRow_last: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMid },
  infoValue: { fontSize: 12, fontWeight: '700', color: Colors.textDark },

  // ── Note Box ─────────────────────────────────────
  noteBox: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.lg,
    padding: SW(12),
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  noteText: { fontSize: 12, color: Colors.textMid, fontStyle: 'italic', lineHeight: 18 },
});
