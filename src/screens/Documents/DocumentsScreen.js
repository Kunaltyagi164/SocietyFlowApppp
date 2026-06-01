// src/screens/Documents/DocumentsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
  SafeAreaView, Alert, ActivityIndicator, TextInput, Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from 'react-native-document-picker';
import RNFS from '../../utils/safeRNFS';
import {
  getDocumentsWithCache, downloadDocument,
  getMyDocuments, uploadMyDocument, downloadMyDocument, deleteMyDocument,
} from '../../services/api';
import { EmptyState, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow, Fonts } from '../../theme';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SF, SH, SW } from '../../utils/responsive';

const DOC_EMOJI = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('agreement')) return '📋';
  if (t.includes('policy'))    return '📑';
  if (t.includes('rule'))      return '⚖️';
  if (t.includes('guideline')) return '📖';
  if (t.includes('form'))      return '📝';
  if (t.includes('pdf'))       return '📄';
  return '📃';
};

export default function DocumentsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('society'); // 'society' or 'personal'
  const [societyDocs, setSocietyDocs] = useState([]);
  const [personalDocs, setPersonalDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Personal',
    description: '',
  });

  const categories = ['Personal', 'Identity', 'Property', 'Financial', 'Medical', 'Legal', 'Vehicle', 'Other'];

  const load = async (quiet = false, forceRefresh = false) => {
    if (!quiet) setLoading(true);
    try {
      console.log('📄 [Documents] Loading all documents...');
      
      // Load society documents
      const societyResp = await getDocumentsWithCache(forceRefresh);
      let societyData = [];
      if (Array.isArray(societyResp.data?.data)) {
        societyData = societyResp.data.data;
      } else if (Array.isArray(societyResp.data)) {
        societyData = societyResp.data;
      } else if (societyResp.data?.success && Array.isArray(societyResp.data?.documents)) {
        societyData = societyResp.data.documents;
      }
      setSocietyDocs(societyData);
      console.log('✅ [Documents] Loaded society docs:', societyData.length);

      // Load personal documents
      const personalResp = await getMyDocuments();
      let personalData = [];
      if (Array.isArray(personalResp.data?.data)) {
        personalData = personalResp.data.data;
      } else if (Array.isArray(personalResp.data)) {
        personalData = personalResp.data;
      }
      setPersonalDocs(personalData);
      console.log('✅ [Documents] Loaded personal docs:', personalData.length);
    } catch (err) {
      console.error('❌ [Documents] Load error:', err.message);
      Alert.alert('Error', 'Failed to load documents');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
    const unsub = navigation.addListener('focus', () => {
      load(true);
    });
    return unsub;
  }, [navigation]);

  // Auto-refresh every 20 seconds
  useAutoRefresh(() => load(true), true, 20000);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });

      const file = result[0];
      console.log(`📄 [Documents] Selected file: ${file.name}, Size: ${file.size}`);

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Maximum file size is 10MB');
        return;
      }

      // Read file as base64
      const base64 = await RNFS.readFile(file.uri, 'base64');
      const mimeType = file.type || 'application/octet-stream';
      const fileUrl = `data:${mimeType};base64,${base64}`;

      // Store file data for upload
      setUploadForm(prev => ({
        ...prev,
        file_name: file.name,
        file_url: fileUrl,
        file_size: Math.round(file.size / 1024),
      }));
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('❌ [Documents] File pick error:', err);
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const handleUploadDocument = async () => {
    if (!uploadForm.title.trim()) {
      Alert.alert('Required', 'Please enter a document title');
      return;
    }
    if (!uploadForm.file_url) {
      Alert.alert('Required', 'Please select a file');
      return;
    }

    setUploading(true);
    try {
      const uploadData = {
        title: uploadForm.title.trim(),
        category: uploadForm.category,
        description: uploadForm.description.trim(),
        file_name: uploadForm.file_name,
        file_url: uploadForm.file_url,
      };

      console.log('📤 [Documents] Uploading personal document:', uploadData.title);
      const response = await uploadMyDocument(uploadData);

      console.log('✅ [Documents] Upload successful:', response.data);
      Alert.alert('Success', 'Document uploaded successfully');

      // Reset form and reload
      setUploadForm({ title: '', category: 'Personal', description: '' });
      setShowUploadModal(false);
      load(true);
    } catch (err) {
      console.error('❌ [Documents] Upload error:', err);
      Alert.alert('Upload Failed', err.response?.data?.error || err.message);
    }
    setUploading(false);
  };

  const handleDownload = async (doc, isPersonal = false) => {
    setDownloading(doc.id);
    try {
      console.log(`📥 [Documents] Downloading ${isPersonal ? 'personal' : 'society'} document ${doc.id}`);

      // Call download endpoint
      const downloadResp = isPersonal
        ? await downloadMyDocument(doc.id)
        : await downloadDocument(doc.id);

      const fileData = downloadResp.data?.data;
      if (!fileData) {
        throw new Error('No file data received');
      }

      const { file_url, file_name } = fileData;
      if (!file_url) {
        throw new Error('File not available');
      }

      // Determine file extension
      let fileExt = '.pdf';
      if (file_name && file_name.includes('.')) {
        fileExt = file_name.substring(file_name.lastIndexOf('.'));
      }
      const sanitizedFileName = (doc.title || file_name || 'document').replace(/[^a-zA-Z0-9.-]/g, '_');
      const fullFileName = sanitizedFileName + fileExt;

      // Create download directory
      const documentsPath = `${RNFS.DocumentDirectoryPath}/SocietyFlow`;
      try {
        await RNFS.mkdir(documentsPath);
      } catch (err) {
        // Directory exists
      }

      const filePath = `${documentsPath}/${fullFileName}`;

      // Save file
      if (file_url.startsWith('data:')) {
        const base64String = file_url.includes(',') ? file_url.split(',')[1] : file_url;
        await RNFS.writeFile(filePath, base64String, 'base64');
      } else {
        const token = await AsyncStorage.getItem('token');
        const downloadTask = RNFS.downloadFile({
          fromUrl: file_url,
          toFile: filePath,
          headers: { 'Authorization': `Bearer ${token}` },
        });
        await downloadTask.promise;
      }

      // Navigate to preview
      navigation.navigate('DocumentPreview', {
        title: doc.title || fullFileName,
        filePath: `file://${filePath}`,
        fileName: fullFileName,
      });
    } catch (err) {
      console.error('❌ [Documents] Download error:', err);
      Alert.alert('Download Failed', err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteDocument = async (docId) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ [Documents] Deleting document:', docId);
              await deleteMyDocument(docId);
              Alert.alert('Success', 'Document deleted');
              load(true);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  if (loading) return <ScreenLoader />;

  const currentDocs = activeTab === 'society' ? societyDocs : personalDocs;
  const isEmpty = currentDocs.length === 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <MaterialCommunityIcons name="file-document-multiple-outline" size={24} color={Colors.textWhite} />
            <Text style={styles.title}>Documents</Text>
          </View>

          {/* Tab Buttons */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'society' && styles.tabActive]}
              onPress={() => setActiveTab('society')}
            >
              <MaterialCommunityIcons
                name="cloud-download-outline"
                size={16}
                color={activeTab === 'society' ? Colors.textWhite : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[styles.tabText, activeTab === 'society' && styles.tabTextActive]}>
                Society Documents
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'personal' && styles.tabActive]}
              onPress={() => setActiveTab('personal')}
            >
              <MaterialCommunityIcons
                name="account-box-outline"
                size={16}
                color={activeTab === 'personal' ? Colors.textWhite : 'rgba(255,255,255,0.6)'}
              />
              <Text style={[styles.tabText, activeTab === 'personal' && styles.tabTextActive]}>
                My Documents
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upload Button (Personal Tab Only) */}
        {activeTab === 'personal' && (
          <TouchableOpacity
            style={styles.uploadFloatingBtn}
            onPress={() => setShowUploadModal(true)}
          >
            <MaterialCommunityIcons name="plus" size={28} color={Colors.textWhite} />
          </TouchableOpacity>
        )}

        {/* Content */}
        {isEmpty ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <EmptyState
              emoji={activeTab === 'society' ? '📁' : '📝'}
              title={activeTab === 'society' ? 'No society documents' : 'No personal documents'}
              subtitle={activeTab === 'society'
                ? 'Documents from society admin will appear here'
                : 'Upload your documents here'
              }
            />
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => load(false, true)}
            >
              <MaterialCommunityIcons name="refresh" size={16} color={Colors.accent} />
              <Text style={{ color: Colors.accent, fontSize: 14, fontWeight: '600', marginLeft: 6 }}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor={Colors.accent}
                onRefresh={() => { setRefreshing(true); load(true, true); }}
              />
            }
          >
            {/* Section Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MaterialCommunityIcons
                name={activeTab === 'society' ? 'cloud-download-outline' : 'account-box-outline'}
                size={14}
                color={Colors.textDark}
              />
              <Text style={styles.sectionTitle}>
                {activeTab === 'society' ? 'Society Documents' : 'My Documents'}
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{currentDocs.length}</Text>
              </View>
            </View>

            {/* Document Cards */}
            {currentDocs.map(doc => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docIcon}>
                  <Text style={{ fontSize: 24 }}>{DOC_EMOJI(doc.category)}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.docName}>{doc.title || doc.name}</Text>
                  {doc.description && <Text style={styles.docDesc}>{doc.description}</Text>}
                  {activeTab === 'society' && doc.uploaded_by && (
                    <Text style={styles.docBy}>Shared by {doc.uploaded_by}</Text>
                  )}
                  {activeTab === 'personal' && doc.category && (
                    <Text style={styles.docCategory}>{doc.category} • {doc.file_size || '—'}</Text>
                  )}
                  {doc.created_at && (
                    <Text style={styles.docDate}>
                      {new Date(doc.created_at).toLocaleDateString('en-IN')}
                    </Text>
                  )}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => handleDownload(doc, activeTab === 'personal')}
                    disabled={downloading === doc.id}
                  >
                    <MaterialCommunityIcons
                      name={downloading === doc.id ? 'loading' : 'download-outline'}
                      size={16}
                      color={Colors.textWhite}
                    />
                  </TouchableOpacity>

                  {activeTab === 'personal' && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteDocument(doc.id)}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Upload Modal */}
        <Modal
          visible={showUploadModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowUploadModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Upload Document</Text>
                <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={Colors.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1 }}>
                {/* File Selection */}
                <TouchableOpacity
                  style={styles.filePickerBtn}
                  onPress={handlePickDocument}
                >
                  <MaterialCommunityIcons name="file-upload-outline" size={32} color={Colors.appBlue} />
                  <Text style={styles.filePickerText}>
                    {uploadForm.file_name ? uploadForm.file_name : 'Tap to select file'}
                  </Text>
                  {uploadForm.file_size && (
                    <Text style={styles.fileSizeText}>{uploadForm.file_size} KB</Text>
                  )}
                </TouchableOpacity>

                {/* Title */}
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.formLabel}>Title *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Aadhaar Card"
                    placeholderTextColor={Colors.textSecondary}
                    value={uploadForm.title}
                    onChangeText={(text) => setUploadForm(prev => ({ ...prev, title: text }))}
                  />
                </View>

                {/* Category */}
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.formLabel}>Category</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {categories.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryTag,
                          uploadForm.category === cat && styles.categoryTagActive,
                        ]}
                        onPress={() => setUploadForm(prev => ({ ...prev, category: cat }))}
                      >
                        <Text
                          style={[
                            styles.categoryTagText,
                            uploadForm.category === cat && styles.categoryTagTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Description */}
                <View style={{ marginTop: 16 }}>
                  <Text style={styles.formLabel}>Description (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Add notes about this document"
                    placeholderTextColor={Colors.textSecondary}
                    value={uploadForm.description}
                    onChangeText={(text) => setUploadForm(prev => ({ ...prev, description: text }))}
                    multiline
                  />
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, uploading && { opacity: 0.6 }]}
                  onPress={handleUploadDocument}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color={Colors.textWhite} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="upload-outline" size={16} color={Colors.textWhite} />
                      <Text style={styles.submitBtnText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SW(16),
    paddingTop: SH(12),
    paddingBottom: SH(16),
    backgroundColor: Colors.royalBlue,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  title: {
    fontSize: SF(22),
    fontWeight: '800',
    color: Colors.textWhite,
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: SW(8),
    backgroundColor: 'rgba(0,0,0,0.1)',
    padding: SW(4),
    borderRadius: SW(12),
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SW(6),
    paddingHorizontal: SW(10),
    paddingVertical: SH(8),
    borderRadius: SW(10),
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabText: {
    fontSize: SF(12),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Fonts.Poppins_Medium,
  },
  tabTextActive: {
    color: Colors.textWhite,
  },
  uploadFloatingBtn: {
    position: 'absolute',
    bottom: SH(24),
    right: SW(20),
    width: SW(60),
    height: SH(60),
    borderRadius: SW(30),
    backgroundColor: Colors.freshGreen,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
    fontFamily: Fonts.Poppins_Bold,
  },
  countBadge: {
    paddingHorizontal: SW(8),
    paddingVertical: SH(2),
    backgroundColor: Colors.primaryLight,
    borderRadius: SW(12),
  },
  countText: {
    fontSize: SF(11),
    fontWeight: '600',
    color: Colors.appBlue,
  },
  refreshBtn: {
    marginTop: SH(20),
    paddingHorizontal: SW(16),
    paddingVertical: SH(10),
    backgroundColor: Colors.accentLight,
    borderRadius: SW(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  docCard: {
    backgroundColor: Colors.cardGlass,
    borderRadius: Radius.xl,
    borderWidth: SW(1),
    borderColor: Colors.border,
    padding: SW(12),
    marginBottom: SH(12),
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.card,
  },
  docIcon: {
    width: SW(44),
    height: SH(44),
    backgroundColor: Colors.primaryLight,
    borderRadius: SW(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  docName: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.textDark,
    fontFamily: Fonts.Poppins_Bold,
  },
  docDesc: {
    fontSize: SF(11),
    color: Colors.textSecondary,
    marginTop: SH(2),
    fontFamily: Fonts.Poppins_Regular,
  },
  docBy: {
    fontSize: SF(10),
    color: Colors.textSecondary,
    marginTop: SH(2),
    fontFamily: Fonts.Poppins_Regular,
  },
  docCategory: {
    fontSize: SF(10),
    color: Colors.textSecondary,
    marginTop: SH(2),
    fontFamily: Fonts.Poppins_Regular,
  },
  docDate: {
    fontSize: SF(9),
    color: Colors.textSecondary,
    marginTop: SH(1),
  },
  downloadBtn: {
    width: SW(40),
    height: SH(40),
    borderRadius: SW(8),
    backgroundColor: Colors.appBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: SW(40),
    height: SH(40),
    borderRadius: SW(8),
    backgroundColor: 'rgba(255,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgWhite,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '85%',
    padding: SW(16),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SH(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: SF(18),
    fontWeight: '800',
    color: Colors.textDark,
    fontFamily: Fonts.Poppins_Bold,
  },
  filePickerBtn: {
    borderWidth: SW(2),
    borderStyle: 'dashed',
    borderColor: Colors.appBlue,
    borderRadius: SW(12),
    padding: SW(24),
    alignItems: 'center',
    marginTop: SH(16),
    backgroundColor: Colors.primaryLight,
  },
  filePickerText: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.appBlue,
    marginTop: SH(8),
    fontFamily: Fonts.Poppins_Medium,
  },
  fileSizeText: {
    fontSize: SF(11),
    color: Colors.textSecondary,
    marginTop: SH(4),
  },
  formLabel: {
    fontSize: SF(13),
    fontWeight: '600',
    color: Colors.textDark,
    fontFamily: Fonts.Poppins_Medium,
  },
  textInput: {
    borderWidth: SW(1),
    borderColor: Colors.border,
    borderRadius: SW(8),
    paddingHorizontal: SW(12),
    paddingVertical: SH(10),
    fontSize: SF(13),
    color: Colors.textDark,
    marginTop: SH(8),
    fontFamily: Fonts.Poppins_Regular,
  },
  categoryTag: {
    paddingHorizontal: SW(12),
    paddingVertical: SH(6),
    borderRadius: SW(20),
    borderWidth: SW(1),
    borderColor: Colors.border,
    marginRight: SW(8),
  },
  categoryTagActive: {
    backgroundColor: Colors.appBlue,
    borderColor: Colors.appBlue,
  },
  categoryTagText: {
    fontSize: SF(11),
    fontWeight: '600',
    color: Colors.textDark,
    fontFamily: Fonts.Poppins_Medium,
  },
  categoryTagTextActive: {
    color: Colors.textWhite,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SW(12),
    marginTop: SH(16),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: SH(12),
    borderWidth: SW(1),
    borderColor: Colors.border,
    borderRadius: SW(8),
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    fontFamily: Fonts.Poppins_Medium,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: SH(12),
    backgroundColor: Colors.freshGreen,
    borderRadius: SW(8),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SW(6),
  },
  submitBtnText: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textWhite,
    fontFamily: Fonts.Poppins_Bold,
  },
});
