// src/components/dashboard/StatCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SHADOWS } from '../../utils/colors';

export default function StatCard({ 
  title, 
  value, 
  iconName,
  iconBg = COLORS.infoLight,
  trend 
}) {
  return (
    <View style={[styles.card, SHADOWS.card]}>
      {/* Icon Container */}
      <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
        {iconName ? (
          <MaterialCommunityIcons 
            name={iconName} 
            size={20} 
            color={COLORS.primary}
          />
        ) : (
          <MaterialCommunityIcons name="package-variant-closed" size={20} color={COLORS.primary} />
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text 
          style={styles.title}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
        <Text 
          style={styles.value}
          numberOfLines={1}
        >
          {value}
        </Text>
        
        {/* Trend indicator (optional) */}
        {trend && (
          <Text style={[styles.trend, { color: trend.positive ? COLORS.success : COLORS.danger }]}>
            {trend.positive ? '↑' : '↓'} {trend.text}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 12,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  trend: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
