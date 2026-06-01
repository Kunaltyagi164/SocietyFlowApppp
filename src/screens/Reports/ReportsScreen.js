import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { Colors, Radius, Shadow, Spacing, Fonts } from '../../theme';
import { ScreenLoader, ScreenBackground } from '../../components';
import { useFocusEffect } from '@react-navigation/native';
import { getUser } from '../../services/api';
import { SF, SH, SW } from '../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const KPI_CARD_WIDTH = (SCREEN_WIDTH - (Spacing.lg * 2) - 12) / 2;

const FALLBACK_BILLS = [
  { id: 'b1', bill_type: 'Maintenance', amount: 3200, status: 'paid', due_date: '2026-03-10', paid: true, flat_no: 'A-104' },
  { id: 'b2', bill_type: 'Water', amount: 950, status: 'paid', due_date: '2026-04-10', paid: true, flat_no: 'A-104' },
  { id: 'b3', bill_type: 'Parking', amount: 1200, status: 'pending', due_date: '2026-05-10', paid: false, flat_no: 'A-104' },
  { id: 'b4', bill_type: 'Electricity', amount: 1680, status: 'overdue', due_date: '2026-02-10', paid: false, flat_no: 'A-104' },
];

const FALLBACK_VISITORS = [
  { id: 'v1', name: 'Sanjay', visiting_flat: 'A-104', is_inside: false, check_in: '2026-05-01T10:00:00' },
  { id: 'v2', name: 'Meera', visiting_flat: 'A-104', is_inside: true, check_in: '2026-05-21T12:10:00' },
  { id: 'v3', name: 'Arjun', visiting_flat: 'A-104', is_inside: false, check_in: '2026-05-23T09:20:00' },
];

const FALLBACK_BOOKINGS = [
  { id: 'bk1', amenity: 'Club House', flat_no: 'A-104', booking_date: '2026-03-18', total_amount: 500, payment_status: 'paid', status: 'confirmed' },
  { id: 'bk2', amenity: 'Badminton Court', flat_no: 'A-104', booking_date: '2026-04-05', total_amount: 200, payment_status: 'paid', status: 'confirmed' },
  { id: 'bk3', amenity: 'Party Hall', flat_no: 'A-104', booking_date: '2026-05-26', total_amount: 1000, payment_status: 'pending', status: 'confirmed' },
];

const PIE_COLORS = ['#1E88E5', '#43A047', '#FB8C00', '#E53935'];

const parseJSON = (v, fallback = []) => {
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const toAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeFlat = (value) => (value || '').toString().trim().toUpperCase().replace(/\s+/g, '');

const pickDate = (item, keys) => {
  for (const key of keys) {
    if (!item?.[key]) continue;
    const dt = new Date(item[key]);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return null;
};

const getMonthKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;

const formatMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  const dt = new Date(year, month - 1, 1);
  return dt.toLocaleDateString('en-IN', { month: 'short' });
};

const lastMonths = (count = 6) => {
  const out = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(getMonthKey(dt));
  }
  return out;
};

const formatINR = (amount) => `Rs ${Math.round(amount).toLocaleString('en-IN')}`;

const pieHtml = (data) => {
  const total = Math.max(1, data.reduce((sum, d) => sum + d.value, 0));
  let current = 0;
  const stops = data.map((item, idx) => {
    const start = (current / total) * 100;
    current += item.value;
    const end = (current / total) * 100;
    const c = PIE_COLORS[idx % PIE_COLORS.length];
    return `${c} ${start}% ${end}%`;
  });

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        body { margin:0; background:#fff; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
        .wrap { display:flex; justify-content:center; align-items:center; height:220px; }
        .pie {
          width:180px; height:180px; border-radius:50%;
          background: conic-gradient(${stops.join(',')});
          position:relative;
        }
        .hole {
          position:absolute; inset:38px; border-radius:50%; background:#fff;
          border:1px solid #e3edfb;
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="pie"><div class="hole"></div></div>
      </div>
    </body>
  </html>`;
};

const barsHtml = (labels, visitors, bookings, payments) => {
  const maxCount = Math.max(1, ...visitors, ...bookings);
  const maxPayment = Math.max(1, ...payments);

  const groups = labels
    .map((label, i) => {
      const vh = Math.max(4, Math.round((visitors[i] / maxCount) * 120));
      const bh = Math.max(4, Math.round((bookings[i] / maxCount) * 120));
      const ph = Math.max(2, Math.round((payments[i] / maxPayment) * 120));
      return `
        <div class="g">
          <div class="bars">
            <div class="bar v" style="height:${vh}px"></div>
            <div class="bar b" style="height:${bh}px"></div>
            <div class="linePoint" style="bottom:${ph}px"></div>
          </div>
          <div class="lbl">${label}</div>
        </div>`;
    })
    .join('');

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        body { margin:0; background:#fff; font-family: system-ui, -apple-system, Segoe UI, sans-serif; }
        .root { padding:10px 6px 0; }
        .chart {
          height:160px; border-bottom:1px solid #d5e3f7;
          display:flex; justify-content:space-around; align-items:flex-end;
        }
        .g { width:14%; text-align:center; }
        .bars { height:126px; position:relative; display:flex; align-items:flex-end; justify-content:center; gap:5px; }
        .bar { width:12px; border-radius:4px 4px 0 0; }
        .v { background:#42A5F5; }
        .b { background:#66BB6A; }
        .linePoint {
          width:8px; height:8px; border-radius:50%; background:#FF7043;
          position:absolute; left:50%; transform:translateX(-50%);
          box-shadow: 0 0 0 2px rgba(255,112,67,0.2);
        }
        .lbl { margin-top:6px; font-size:10px; color:#4e6d97; }
      </style>
    </head>
    <body>
      <div class="root">
        <div class="chart">${groups}</div>
      </div>
    </body>
  </html>`;
};

function PieChartCard({ title, data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.pieWrap}>
        <WebView
          originWhitelist={['*']}
          source={{ html: pieHtml(data) }}
          style={styles.webChart}
          scrollEnabled={false}
          javaScriptEnabled={false}
          scalesPageToFit={false}
        />
        <View style={styles.pieCenterOverlay}>
          <Text style={styles.pieCenterText}>{total}</Text>
          <Text style={styles.pieCenterSub}>Total</Text>
        </View>
      </View>
      <View style={styles.legendWrap}>
        {data.map((item, idx) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
            <Text style={styles.legendValue}>{item.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BarsCard({ title, labels, visitors, bookings, payments }) {
  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <WebView
        originWhitelist={['*']}
        source={{ html: barsHtml(labels, visitors, bookings, payments) }}
        style={styles.webBars}
        scrollEnabled={false}
        javaScriptEnabled={false}
        scalesPageToFit={false}
      />
      <View style={styles.graphLegendRow}>
        <LegendChip color="#42A5F5" label="Visitors" />
        <LegendChip color="#66BB6A" label="Bookings" />
        <LegendChip color="#FF7043" label="Payments (Amount)" />
      </View>
    </View>
  );
}

function LegendChip({ color, label }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendChipText}>{label}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [updatedAt, setUpdatedAt] = useState('');

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getUser();
      const residentFlat = normalizeFlat(user?.flat_no || user?.unit_number || user?.flat_number || user?.apartment || '');
      const residentName = (user?.name || '').toLowerCase().trim();

      const [billsRaw, visitorsRaw, bookingsRaw, billsStamp, visitorsStamp, bookingsStamp] = await Promise.all([
        AsyncStorage.getItem('reports_cache_bills'),
        AsyncStorage.getItem('reports_cache_visitors'),
        AsyncStorage.getItem('reports_cache_bookings'),
        AsyncStorage.getItem('reports_cache_bills_updated_at'),
        AsyncStorage.getItem('reports_cache_visitors_updated_at'),
        AsyncStorage.getItem('reports_cache_bookings_updated_at'),
      ]);

      let bills = parseJSON(billsRaw, FALLBACK_BILLS);
      let visitors = parseJSON(visitorsRaw, FALLBACK_VISITORS);
      let bookings = parseJSON(bookingsRaw, FALLBACK_BOOKINGS);

      if (residentFlat) {
        const byFlat = (item) => {
          const cands = [item?.flat_no, item?.visiting_flat, item?.flat, item?.apartment];
          return cands.some((c) => normalizeFlat(c) === residentFlat);
        };
        const byName = (item) => (item?.resident_name || item?.name || '').toLowerCase().trim() === residentName;

        bills = bills.filter((item) => byFlat(item) || byName(item));
        visitors = visitors.filter((item) => byFlat(item));
        bookings = bookings.filter((item) => byFlat(item) || byName(item));
      }

      const billPaid = bills.filter((b) => b.status === 'paid' || b.paid === true).length;
      const billPending = bills.filter((b) => (b.status || '').toLowerCase() === 'pending').length;
      const billOverdue = bills.filter((b) => (b.status || '').toLowerCase() === 'overdue').length;
      const totalBillsAmount = bills.reduce((sum, b) => sum + toAmount(b.amount), 0);

      const paidAmount = bills
        .filter((b) => b.status === 'paid' || b.paid === true)
        .reduce((sum, b) => sum + toAmount(b.amount), 0) + bookings
        .filter((b) => (b.payment_status || '').toLowerCase() === 'paid')
        .reduce((sum, b) => sum + toAmount(b.total_amount), 0);

      const totalVisitors = visitors.length;
      const insideVisitors = visitors.filter((v) => v.is_inside).length;
      const totalBookings = bookings.length;
      const confirmedBookings = bookings.filter((b) => (b.status || '').toLowerCase() !== 'cancelled').length;

      const months = lastMonths(6);
      const trend = months.reduce((acc, m) => {
        acc[m] = { visitors: 0, bookings: 0, payments: 0 };
        return acc;
      }, {});

      visitors.forEach((v) => {
        const dt = pickDate(v, ['check_in', 'created_at', 'updated_at']);
        if (!dt) return;
        const key = getMonthKey(dt);
        if (trend[key]) trend[key].visitors += 1;
      });

      bookings.forEach((b) => {
        const dt = pickDate(b, ['booking_date', 'created_at', 'updated_at']);
        if (!dt) return;
        const key = getMonthKey(dt);
        if (trend[key]) trend[key].bookings += 1;
        if ((b.payment_status || '').toLowerCase() === 'paid' && trend[key]) {
          trend[key].payments += toAmount(b.total_amount);
        }
      });

      bills.forEach((b) => {
        if (!(b.status === 'paid' || b.paid === true)) return;
        const dt = pickDate(b, ['payment_date', 'updated_at', 'due_date', 'created_at']);
        if (!dt) return;
        const key = getMonthKey(dt);
        if (trend[key]) trend[key].payments += toAmount(b.amount);
      });

      const labels = months.map(formatMonthLabel);
      const visitorsSeries = months.map((m) => trend[m].visitors);
      const bookingsSeries = months.map((m) => trend[m].bookings);
      const paymentsSeries = months.map((m) => trend[m].payments);

      setReportData({
        metrics: {
          totalBillsAmount,
          paidAmount,
          totalVisitors,
          insideVisitors,
          totalBookings,
          confirmedBookings,
        },
        billStatusPie: [
          { label: 'Paid', value: billPaid },
          { label: 'Pending', value: billPending },
          { label: 'Overdue', value: billOverdue },
        ],
        labels,
        visitorsSeries,
        bookingsSeries,
        paymentsSeries,
      });

      const stamps = [billsStamp, visitorsStamp, bookingsStamp].filter(Boolean);
      setUpdatedAt(stamps.sort().reverse()[0] || new Date().toISOString());
    } catch (err) {
      console.warn('[Reports] Failed to build report:', err.message);
      setReportData({
        metrics: {
          totalBillsAmount: 0,
          paidAmount: 0,
          totalVisitors: 0,
          insideVisitors: 0,
          totalBookings: 0,
          confirmedBookings: 0,
        },
        billStatusPie: [
          { label: 'Paid', value: 0 },
          { label: 'Pending', value: 0 },
          { label: 'Overdue', value: 0 },
        ],
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        visitorsSeries: [0, 0, 0, 0, 0, 0],
        bookingsSeries: [0, 0, 0, 0, 0, 0],
        paymentsSeries: [0, 0, 0, 0, 0, 0],
      });
      setUpdatedAt(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport])
  );

  if (loading || !reportData) {
    return (
      <ScreenBackground>
        <SafeAreaView style={styles.safe}>
          <ScreenLoader />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const { metrics } = reportData;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['#0B4EA2', '#1E88E5', '#43A047']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerCard}
          >
            <View>
              <Text style={styles.headerTitle}>Reports</Text>
              <Text style={styles.headerSub}>Resident-specific analytics for bills, payments, visitors and bookings</Text>
              <Text style={styles.headerMeta}>Updated: {new Date(updatedAt).toLocaleString('en-IN')}</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadReport} activeOpacity={0.85}>
              <MaterialCommunityIcons name="refresh" color="#0B4EA2" size={20} />
            </TouchableOpacity>
          </LinearGradient>

          <View style={styles.kpiGrid}>
            <KpiCard icon="file-document-multiple-outline" label="Bills Total" value={formatINR(metrics.totalBillsAmount)} colors={['#1976D2', '#42A5F5']} />
            <KpiCard icon="cash-check" label="Payments Done" value={formatINR(metrics.paidAmount)} colors={['#2E7D32', '#66BB6A']} />
            <KpiCard icon="account-group-outline" label="Visitors" value={`${metrics.totalVisitors} (${metrics.insideVisitors} inside)`} colors={['#EF6C00', '#FFB74D']} />
            <KpiCard icon="calendar-check-outline" label="Bookings" value={`${metrics.confirmedBookings} / ${metrics.totalBookings}`} colors={['#6A1B9A', '#AB47BC']} />
          </View>

          <PieChartCard title="Bills Distribution (Pie)" data={reportData.billStatusPie} />

          <BarsCard
            title="6-Month Trends (Graphs)"
            labels={reportData.labels}
            visitors={reportData.visitorsSeries}
            bookings={reportData.bookingsSeries}
            payments={reportData.paymentsSeries}
          />

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Data Sheet</Text>
            <View style={styles.sheetHeaderRow}>
              <Text style={[styles.sheetHead, styles.sheetMonth]}>Month</Text>
              <Text style={styles.sheetHead}>Visitors</Text>
              <Text style={styles.sheetHead}>Bookings</Text>
              <Text style={styles.sheetHead}>Payments</Text>
            </View>
            {reportData.labels.map((label, idx) => (
              <View key={`sheet-${label}-${idx}`} style={styles.sheetRow}>
                <Text style={[styles.sheetCell, styles.sheetMonth]}>{label}</Text>
                <Text style={styles.sheetCell}>{reportData.visitorsSeries[idx]}</Text>
                <Text style={styles.sheetCell}>{reportData.bookingsSeries[idx]}</Text>
                <Text style={styles.sheetCell}>{formatINR(reportData.paymentsSeries[idx])}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function KpiCard({ icon, label, value, colors }) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpiCard}>
      <MaterialCommunityIcons name={icon} size={22} color="#fff" />
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  headerCard: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...Shadow.medium,
  },
  headerTitle: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: SF(26),
    marginBottom: SH(4),
  },
  headerSub: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: Fonts.regular,
    fontSize: SF(13),
    lineHeight: SH(18),
    maxWidth: SCREEN_WIDTH - 130,
  },
  headerMeta: {
    marginTop: SH(8),
    color: 'rgba(255,255,255,0.85)',
    fontFamily: Fonts.medium,
    fontSize: SF(11),
  },
  refreshBtn: {
    width: SW(38),
    height: SH(38),
    borderRadius: SW(20),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SH(2),
  },
  kpiCard: {
    width: KPI_CARD_WIDTH,
    borderRadius: Radius.lg,
    padding: SW(12),
    minHeight: SH(112),
    marginBottom: SH(12),
    ...Shadow.soft,
  },
  kpiLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontFamily: Fonts.medium,
    fontSize: SF(12),
    marginTop: SH(8),
  },
  kpiValue: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: SF(16),
    marginTop: SH(4),
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: SW(1),
    borderColor: '#E2ECF9',
    ...Shadow.soft,
  },
  chartTitle: {
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
    fontSize: SF(17),
    marginBottom: Spacing.md,
  },
  pieWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webChart: {
    width: Math.min(SCREEN_WIDTH - 80, 260),
    height: SH(220),
    backgroundColor: '#fff',
  },
  webBars: {
    width: SCREEN_WIDTH - 70,
    height: SH(170),
    backgroundColor: '#fff',
  },
  pieCenterOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: SW(90),
    height: SH(90),
    borderRadius: SW(45),
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: SW(1),
    borderColor: '#E2ECF9',
  },
  pieCenterText: {
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
    fontSize: SF(24),
  },
  pieCenterSub: {
    color: Colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: SF(11),
  },
  legendWrap: {
    marginTop: SH(8),
    gap: SW(8),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SH(4),
  },
  legendDot: {
    width: SW(10),
    height: SH(10),
    borderRadius: SW(5),
    marginRight: SW(8),
  },
  legendLabel: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: SF(13),
  },
  legendValue: {
    color: Colors.textPrimary,
    fontFamily: Fonts.bold,
    fontSize: SF(13),
  },
  graphLegendRow: {
    marginTop: SH(10),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SW(10),
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F8FF',
    borderRadius: SW(20),
    paddingVertical: SH(6),
    paddingHorizontal: SW(10),
  },
  legendChipText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.medium,
    fontSize: SF(12),
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    paddingVertical: SH(8),
    borderBottomWidth: 1,
    borderBottomColor: '#DCE8F8',
  },
  sheetRow: {
    flexDirection: 'row',
    paddingVertical: SH(10),
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4FD',
  },
  sheetHead: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: SF(12),
    textAlign: 'center',
  },
  sheetCell: {
    flex: 1,
    color: Colors.textPrimary,
    fontFamily: Fonts.medium,
    fontSize: SF(12),
    textAlign: 'center',
  },
  sheetMonth: {
    textAlign: 'left',
    flex: 1.2,
  },
});
