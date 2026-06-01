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
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { Colors, Spacing, Radius } from '../../theme';
import RNFS from '../../utils/safeRNFS';
import { SF, SH, SW } from '../../utils/responsive';

// Strip unwanted UI elements (print/download/close buttons) from backend invoice HTML
const sanitizeInvoiceHtml = (htmlContent) => {
  if (!htmlContent) return htmlContent;

  let sanitized = htmlContent;

  // Remove print/download/close button containers (common patterns)
  sanitized = sanitized.replace(/<div[^>]*class="*print[^"]*"*[^>]*>[\s\S]*?<\/div>/gi, '');
  sanitized = sanitized.replace(/<div[^>]*class="*download[^"]*"*[^>]*>[\s\S]*?<\/div>/gi, '');
  sanitized = sanitized.replace(/<div[^>]*class="*action[^"]*"*[^>]*>[\s\S]*?<\/div>/gi, '');
  sanitized = sanitized.replace(/<div[^>]*id="*print[^"]*"*[^>]*>[\s\S]*?<\/div>/gi, '');
  sanitized = sanitized.replace(/<div[^>]*id="*download[^"]*"*[^>]*>[\s\S]*?<\/div>/gi, '');

  // Remove individual buttons
  sanitized = sanitized.replace(/<button[^>]*print[^>]*>[\s\S]*?<\/button>/gi, '');
  sanitized = sanitized.replace(/<button[^>]*download[^>]*>[\s\S]*?<\/button>/gi, '');
  sanitized = sanitized.replace(/<button[^>]*close[^>]*>[\s\S]*?<\/button>/gi, '');
  sanitized = sanitized.replace(/<a[^>]*onclick="*window\.print[^"]*"*[^>]*>[\s\S]*?<\/a>/gi, '');
  sanitized = sanitized.replace(/<a[^>]*onclick="*window\.close[^"]*"*[^>]*>[\s\S]*?<\/a>/gi, '');

  // Remove any links/buttons with print/download/close text
  sanitized = sanitized.replace(/<button[^>]*>(Print|Download|Close|Save|Email)[^<]*<\/button>/gi, '');
  sanitized = sanitized.replace(/<a[^>]*>(Print|Download|Close|Save|Email)[^<]*<\/a>/gi, '');

  return sanitized;
};

export default function InvoicePreviewScreen({ route, navigation }) {
  const title = route.params?.title || 'Invoice';
  const rawHtml = route.params?.html || '';
  const htmlBase64 = route.params?.htmlBase64 || '';
  const [saving, setSaving] = useState(false);

  // Sanitize HTML: remove print/download buttons from backend template
  const html = sanitizeInvoiceHtml(rawHtml);

  // Determine WebView source
  const webviewSource = html
    ? { html }
    : htmlBase64
    ? { uri: `data:text/html;base64,${htmlBase64}` }
    : null;

  const handleSaveToDownloads = async () => {
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

      const fileName = `${title}.html`;
      const filePath = `${downloadsPath}/${fileName}`;

      if (html) {
        await RNFS.writeFile(filePath, html, 'utf8');
      } else if (htmlBase64) {
        await RNFS.writeFile(filePath, htmlBase64, 'base64');
      } else {
        Alert.alert('Error', 'No invoice content to save.');
        return;
      }

      Alert.alert('Saved to Downloads', `${fileName} has been saved to your Downloads folder.`);
    } catch (err) {
      console.error('[InvoicePreview] Save error:', err.message);
      Alert.alert('Save Failed', err?.message || 'Could not save invoice to Downloads.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      // Save to temp path first so we can share as a file
      const tempPath = `${RNFS.TemporaryDirectoryPath || RNFS.DocumentDirectoryPath}/${title}.html`;
      if (html) await RNFS.writeFile(tempPath, html, 'utf8');
      else if (htmlBase64) await RNFS.writeFile(tempPath, htmlBase64, 'base64');

      await Share.share({
        title: `Invoice ${title}`,
        message: `Invoice ${title}`,
        url: `file://${tempPath}`,
      });
    } catch (err) {
      Alert.alert('Share Failed', err?.message || 'Could not share invoice');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <View style={styles.headerBtnRow}>
            <MaterialCommunityIcons name="arrow-left" size={14} color="#000" />
            <Text style={styles.headerBtnText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={{ width: 64 }} />
      </View>

      {/* WebView */}
      {webviewSource ? (
        <WebView
          originWhitelist={['*']}
          source={webviewSource}
          javaScriptEnabled
          style={styles.webview}
        />
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Invoice preview not available</Text>
        </View>
      )}

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
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  title: {
    flex: 1,
    marginHorizontal: Spacing.sm,
    fontSize: SF(15),
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  headerBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: SW(64),
    alignItems: 'center',
  },
  headerBtnText: {
    color: '#000',
    fontSize: SF(12),
    fontWeight: '700',
  },
  headerBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(4),
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMid,
    fontSize: SF(14),
    fontWeight: '600',
  },
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
  saveBtn: {
    backgroundColor: '#2563EB',
  },
  shareBtn: {
    backgroundColor: '#6B7280',
  },
  actionIcon: {},
  actionBtnText: {
    color: '#fff',
    fontSize: SF(14),
    fontWeight: '700',
  },
});

