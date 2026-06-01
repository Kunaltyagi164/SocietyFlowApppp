// src/screens/Documents/DocumentPreviewScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { Colors, Spacing, Radius } from '../../theme';
import RNFS from '../../utils/safeRNFS';
import { SF, SH, SW } from '../../utils/responsive';

export default function DocumentPreviewScreen({ route, navigation }) {
  const title    = route.params?.title    || 'Document';
  const filePath = route.params?.filePath || ''; // local file:// path
  const fileType = (route.params?.fileType || '').toLowerCase();
  const fileName = route.params?.fileName || title;
  const [saving, setSaving] = useState(false);

  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
  const isPdf   = fileType === 'pdf';

  const handleSaveToDownloads = async () => {
    if (!filePath) {
      Alert.alert('Error', 'No file to save.');
      return;
    }
    setSaving(true);
    try {
      const downloadsPath =
        RNFS.DownloadDirectoryPath ||
        (RNFS.ExternalStorageDirectoryPath
          ? `${RNFS.ExternalStorageDirectoryPath}/Download`
          : null);

      if (!downloadsPath) {
        Alert.alert('Not Supported', 'Cannot access Downloads folder on this device.');
        return;
      }

      const destPath = `${downloadsPath}/${fileName}`;
      const srcPath  = filePath.replace('file://', '');
      await RNFS.copyFile(srcPath, destPath);
      Alert.alert('Saved to Downloads', `${fileName} has been saved to your Downloads folder.`);
    } catch (err) {
      console.error('[DocumentPreview] Save error:', err.message);
      Alert.alert('Save Failed', err?.message || 'Could not save to Downloads.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: `Document: ${title}`,
        message: title,
        url: filePath,
      });
    } catch (err) {
      Alert.alert('Share Failed', err?.message || 'Could not share document');
    }
  };

  const renderContent = () => {
    if (!filePath) {
      return (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="folder-outline" size={48} color={Colors.textMid} />
          <Text style={styles.emptyText}>Preview not available</Text>
        </View>
      );
    }

    if (isImage) {
      return (
        <Image
          source={{ uri: filePath }}
          style={styles.image}
          resizeMode="contain"
          onError={() => console.log('[DocumentPreview] Image load error')}
        />
      );
    }

    if (isPdf) {
      return (
        <WebView
          originWhitelist={['*']}
          source={{ uri: filePath }}
          javaScriptEnabled
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading PDF...</Text>
            </View>
          )}
        />
      );
    }

    // Generic / unknown type
    return (
      <View style={styles.emptyWrap}>
        <MaterialCommunityIcons name="file-document-outline" size={56} color={Colors.textMid} />
        <Text style={[styles.emptyText, { marginTop: 12, fontWeight: '700', fontSize: 16 }]}>{fileName}</Text>
        <Text style={[styles.emptyText, { marginTop: 6, fontSize: 13 }]}>
          Preview not available for this file type.{'\n'}Use Save or Share to open it.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <View style={styles.headerBtnRow}>
            <MaterialCommunityIcons name="arrow-left" size={14} color="#fff" />
            <Text style={styles.headerBtnText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 64 }} />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>{renderContent()}</View>

      {/* Bottom Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.saveBtn]}
          onPress={handleSaveToDownloads}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="content-save-outline" size={16} color="#fff" style={styles.actionIcon} />
              <Text style={styles.actionBtnText}>Save to Downloads</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
          <MaterialCommunityIcons name="share-variant-outline" size={16} color="#fff" style={styles.actionIcon} />
          <Text style={styles.actionBtnText}>Share</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#2563EB',
  },
  title: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    fontSize: SF(15),
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: SW(64),
    alignItems: 'center',
  },
  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(4),
  },
  headerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  webview: { flex: 1, backgroundColor: '#fff' },
  image: { flex: 1, width: '100%' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: Colors.textMid, fontSize: 14, textAlign: 'center', marginTop: 4 },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: SW(12),
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH(13),
    borderRadius: Radius.md,
    gap: SW(6),
  },
  saveBtn:  { backgroundColor: '#2563EB' },
  shareBtn: { backgroundColor: '#6B7280' },
  actionIcon: {},
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
