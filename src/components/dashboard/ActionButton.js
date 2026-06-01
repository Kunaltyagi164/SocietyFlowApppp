// src/components/dashboard/ActionButton.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SHADOWS } from '../../utils/colors';

const legacyEmojiMap = {
  '👤': 'account-plus-outline',
  '📝': 'clipboard-text-outline',
  '🔧': 'tools',
  '💳': 'credit-card-outline',
  '📦': 'package-variant-closed',
};

export default function ActionButton({ 
  title, 
  emoji,
  iconName,
  onPress, 
  bgColor = COLORS.infoLight, 
  disabled 
}) {
  const resolvedIcon = iconName || legacyEmojiMap[emoji] || 'package-variant-closed';

  return (
    <TouchableOpacity 
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={styles.touchable}
    >
      <View style={[
        styles.container,
        SHADOWS.card,
        disabled && styles.disabled
      ]}>
        {/* Circular Icon Container */}
        <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
          <MaterialCommunityIcons name={resolvedIcon} size={22} color={COLORS.primary} />
        </View>

        {/* Label */}
        <Text style={styles.label}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
    marginHorizontal: 6,
  },
  container: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabled: {
    opacity: 0.5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginHorizontal: 4,
  },
});
