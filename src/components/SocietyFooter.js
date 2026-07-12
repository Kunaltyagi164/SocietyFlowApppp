// src/components/SocietyFooter.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius } from '../theme';

export default function SocietyFooter({ 
  societyName = 'Your Society', 
  emergencyPhone = '+91-XXXXX',
  adminEmail = 'admin@society.com',
  onSettings = () => {},
  onHelp = () => {},
  onPrivacy = () => {},
  onTerms = () => {},
}) {
  
  const handleCall = () => {
    const url = `tel:${emergencyPhone.replace(/[^\d+]/g, `')}`;
    Linking.openURL(url).catch(() => 
      Alert.alert('Error', 'Could not open phone dialer')
    );
  };

  const handleEmail = () => {
    const url = `mailto:${adminEmail}`;
    Linking.openURL(url).catch(() => 
      Alert.alert('Error', 'Could not open email client')
    );
  };

  return (
    <View style={styles.container}>
      {/* Society Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="map-marker" size={16} color={Colors.royalBlue} />
          <Text style={styles.infoText}>{societyName}</Text>
        </View>

        <TouchableOpacity style={styles.infoRow} onPress={handleCall}>
          <MaterialCommunityIcons name="phone" size={16} color={Colors.royalBlue} />
          <Text style={styles.infoLinkText}>{emergencyPhone}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.infoRow} onPress={handleEmail}>
          <MaterialCommunityIcons name="email-outline" size={16} color={Colors.royalBlue} />
          <Text style={styles.infoLinkText}>{adminEmail}</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Quick Links Section */}
      <View style={styles.linksSection}>
        <TouchableOpacity style={styles.linkBtn} onPress={onHelp}>
          <MaterialCommunityIcons name="help-circle-outline" size={18} color={Colors.royalBlue} />
          <Text style={styles.linkText}>Help</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={onSettings}>
          <MaterialCommunityIcons name="cog-outline" size={18} color={Colors.royalBlue} />
          <Text style={styles.linkText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={onPrivacy}>
          <MaterialCommunityIcons name="shield-account-outline" size={18} color={Colors.royalBlue} />
          <Text style={styles.linkText}>Privacy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkBtn} onPress={onTerms}>
          <MaterialCommunityIcons name="file-document-outline" size={18} color={Colors.royalBlue} />
          <Text style={styles.linkText}>Terms</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Copyright Section */}
      <View style={styles.copyrightSection}>
        <Text style={styles.copyrightText}>© 2026 Society Flow</Text>
        <Text style={styles.versionText}>Version 1.0.5</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 20,
  },

  // Info Section
  infoSection: {
    marginBottom: 12,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },

  infoText: {
    fontSize: 13,
    color: Colors.textDark,
    fontWeight: '600',
    flex: 1,
  },

  infoLinkText: {
    fontSize: 13,
    color: Colors.royalBlue,
    fontWeight: '500',
    textDecorationLine: 'underline',
    flex: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },

  // Links Section
  linksSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    justifyContent: 'space-between',
  },

  linkBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },

  linkText: {
    fontSize: 12,
    color: Colors.textDark,
    fontWeight: '500',
    flex: 1,
  },

  // Copyright Section
  copyrightSection: {
    alignItems: 'center',
  },

  copyrightText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  versionText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
