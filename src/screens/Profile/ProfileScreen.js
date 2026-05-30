// src/screens/Profile/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from '../../utils/safeRNFS';
import { getMe, clearAll, createProfileUpdateRequest } from '../../services/api';
import { SFCard, Divider, InfoRow, SFButton, ScreenLoader, ScreenBackground } from '../../components';
import { Colors, Radius, Shadow } from '../../theme';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SF, SH, SW } from '../../utils/responsive';

export default function ProfileScreen({ navigation }) {
  const [user,    setUser]    = useState(null);
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Profile image storage paths
  const PROFILE_IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/profile_images`;
  const PROFILE_IMAGE_PATH = `${PROFILE_IMAGE_DIR}/profile.jpg`;
  const PROFILE_IMAGE_STORAGE_KEY = 'user_profile_image';

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        // Load from cache first for speed
        const [cachedUser, cachedSoc] = await Promise.all([
          AsyncStorage.getItem('user')
            .then(v => { try { return JSON.parse(v || 'null'); } catch { return null; } })
            .catch(() => null),
          AsyncStorage.getItem('society')
            .then(v => { try { return JSON.parse(v || 'null'); } catch { return null; } })
            .catch(() => null),
        ]);

        if (!isMounted) return;

        if (cachedUser) setUser(cachedUser);
        if (cachedSoc) setSociety(cachedSoc);

        // Load profile image
        const savedImagePath = await AsyncStorage.getItem(PROFILE_IMAGE_STORAGE_KEY);
        if (savedImagePath && await RNFS.exists(savedImagePath)) {
          setProfileImage(savedImagePath);
        }

        setLoading(false);

        // Then refresh from API
        try {
          const r = await getMe();
          if (!isMounted) return;
          
          const d = r.data?.data;
          if (d?.user) {
            setUser(d.user);
            await AsyncStorage.setItem('user', JSON.stringify(d.user));
          }
          if (d?.society) {
            setSociety(d.society);
            await AsyncStorage.setItem('society', JSON.stringify(d.society));
          }
        } catch (apiErr) {
          console.log('ℹ️ [API] ProfileScreen getMe refresh warning:', apiErr?.message);
          // Not a critical error - we have cached data
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('[ProfileScreen] Load error:', err.message);
        setLoading(false);
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, []);

  const requestChangePhoto = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option:',
      [
        {
          text: 'Select from Gallery',
          onPress: pickImage,
        },
        {
          text: 'Remove Photo',
          onPress: removeProfileImage,
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const pickImage = async () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: SH(400),
        maxWidth: SW(400),
        quality: 0.7,
      },
      async (response) => {
        if (response.didCancel) {
          console.log('Image selection cancelled');
          return;
        }

        if (response.errorCode) {
          Alert.alert('Error', `${response.errorCode}: ${response.errorMessage}`);
          return;
        }

        if (response.assets && response.assets.length > 0) {
          try {
            setUploading(true);
            const asset = response.assets[0];
            const sourceUri = asset.uri;

            // Ensure directory exists
            try {
              await RNFS.mkdir(PROFILE_IMAGE_DIR);
            } catch (err) {
              console.log('Directory already exists or creation skipped:', err.message);
            }

            // Copy image to app's document directory
            await RNFS.copyFile(sourceUri, PROFILE_IMAGE_PATH);

            // Save path to AsyncStorage
            await AsyncStorage.setItem(PROFILE_IMAGE_STORAGE_KEY, PROFILE_IMAGE_PATH);

            setProfileImage(PROFILE_IMAGE_PATH);
            Alert.alert(
              'Success',
              'Profile picture updated successfully!',
              [{ text: 'OK' }]
            );
          } catch (err) {
            console.error('Image save error:', err);
            Alert.alert('Error', 'Failed to save profile picture: ' + err.message);
          } finally {
            setUploading(false);
          }
        }
      }
    );
  };

  const removeProfileImage = async () => {
    Alert.alert(
      'Confirm',
      'Are you sure you want to remove your profile picture?',
      [
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true);
              // Delete file if it exists
              if (profileImage && await RNFS.exists(profileImage)) {
                await RNFS.unlink(profileImage);
              }
              // Clear from storage
              await AsyncStorage.removeItem(PROFILE_IMAGE_STORAGE_KEY);
              setProfileImage(null);
              Alert.alert('Removed', 'Profile picture removed successfully');
            } catch (err) {
              console.error('Image removal error:', err);
              Alert.alert('Error', 'Failed to remove profile picture: ' + err.message);
            } finally {
              setUploading(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const logout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearAll();
            navigation.replace('Login');
          } catch (err) {
            console.error('[ProfileScreen] Logout error:', err.message);
            navigation.replace('Login');
          }
        },
      },
    ]);
  };

  if (loading && !user) return <ScreenLoader />;

  const initial = (user?.name || 'R').charAt(0).toUpperCase();

  return (
    <ScreenBackground>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={[styles.decorCircle, styles.decorTopRight]} />
          <View style={[styles.decorCircle, styles.decorBottomLeft]} />
          <View style={[styles.decorCircleSmall, styles.decorMidRight]} />
          <View style={styles.avatarCardContent}>
            <View style={styles.avatarWrapper}>
              <TouchableOpacity 
                style={styles.avatar}
                onPress={requestChangePhoto}
                disabled={uploading}
              >
                {profileImage ? (
                  <Image 
                    source={{ uri: `file://${profileImage}` }} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initial}</Text>
                )}
                {!uploading && (
                  <View style={styles.editOverlay}>
                    <MaterialCommunityIcons name="camera" size={14} color="#fff" />
                  </View>
                )}
                {uploading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user?.name || '—'}</Text>
            {!!user?.flat_no && (
              <View style={styles.flatBadge}>
                <Text style={styles.flatText}>Flat {user.flat_no}</Text>
              </View>
            )}
            <Text style={styles.roleText}>{(user?.role || 'resident').toUpperCase()}</Text>
          </View>
        </View>

        {/* Society */}
        {society && (
          <SFCard style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.sectionIcon}>
                <MaterialCommunityIcons name="home-city-outline" size={22} color={Colors.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>SOCIETY</Text>
                <Text style={styles.sectionValue}>{society.name}</Text>
                {!!society.city && <Text style={styles.sectionSub}>{society.city}</Text>}
              </View>
            </View>
          </SFCard>
        )}
        <SFCard style={styles.section}>
          <InfoRow iconName="email-outline" label="Email" value={user?.email} />
          <Divider inset={46} />
          <InfoRow iconName="phone-outline" label="Phone" value={user?.phone} />
          <Divider inset={46} />
          <InfoRow iconName="account-group-outline" label="Members" value={`${user?.members || 1} member(s)`} />
          {!!user?.vehicle_no && <>
            <Divider inset={46} />
            <InfoRow iconName="car-outline" label="Vehicle" value={user.vehicle_no} />
          </>}
        </SFCard>

        {/* Quick links */}
        <SFCard style={styles.section}>
          {[
            ['account-cog-outline', 'Manage Profile', 'ProfileManagement'],
            ['credit-card-outline', 'My Bills', 'Bills'],
            ['message-alert-outline', 'My Complaints', 'Issues'],
            ['bullhorn-outline', 'Notices', 'Notices'],
            ['alert-octagon-outline', 'Emergency', 'Emergency'],
          ].map(([iconName, label, screen], i) => (
            <React.Fragment key={label}>
              {i > 0 && <Divider inset={50} />}
              <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate(screen)}>
                <View style={styles.linkIcon}>
                  <MaterialCommunityIcons name={iconName} size={18} color={Colors.teal} />
                </View>
                <Text style={styles.linkLabel}>{label}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </SFCard>

        {/* Sign out */}
        <SFButton label="Sign Out" onPress={logout} outlined style={{ marginTop: 8, marginHorizontal: 16 }} />
        <Text style={styles.version}>SocietyFlow v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: Colors.royalBlue, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  backBtn:     { width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  backIcon:    { fontSize: 18, color: '#FFFFFF' },
  title:       { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  avatarCard:  { position: 'relative', overflow: 'hidden', borderRadius: Radius.xl, padding: 18, alignItems: 'center', marginHorizontal: 16, marginBottom: 14, backgroundColor: Colors.appBlue, borderWidth: 1.5, borderColor: Colors.freshGreen },
  avatarCardContent: { alignItems: 'center', zIndex: 2 },
  decorCircle: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.09)', zIndex: 1 },
  decorCircleSmall: { position: 'absolute', width: 86, height: 86, borderRadius: 43, backgroundColor: 'rgba(126,217,87,0.18)', zIndex: 1 },
  decorTopRight: { top: -62, right: -45 },
  decorBottomLeft: { bottom: -72, left: -52 },
  decorMidRight: { top: 44, right: -40 },
  avatarWrapper: { position: 'relative', marginBottom: 12 },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', resizeMode: 'cover' },
  avatarText:  { fontSize: 34, fontWeight: '800', color: '#fff' },
  editOverlay: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, backgroundColor: '#3b82f6', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  editIcon:    { fontSize: 16, color: '#fff', fontWeight: '800' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  cameraIcon:  { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, backgroundColor: '#3b82f6', borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  userName:    { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.3, marginBottom: 6 },
  flatBadge:   { backgroundColor: Colors.gold, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  flatText:    { fontSize: 12, fontWeight: '700', color: '#fff' },
  roleText:    { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '600', letterSpacing: 1 },
  section:     { marginBottom: 12, marginHorizontal: 16, overflow: 'hidden', borderRadius: Radius.lg, backgroundColor: Colors.cardGlass, borderWidth: 1.5, borderColor: Colors.border, elevation: 0, shadowOpacity: 0, shadowColor: 'transparent' },
  sectionIcon: { width: 40, height: 40, backgroundColor: Colors.tealLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionLabel:{ fontSize: 10, fontWeight: '700', color: Colors.textDark, letterSpacing: 0.5 },
  sectionValue:{ fontSize: 14, fontWeight: '700', color: Colors.textDark, marginTop: 2 },
  sectionSub:  { fontSize: 12, color: Colors.textMid },
  linkRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  linkIcon:    { width: 36, height: 36, backgroundColor: Colors.blueLight, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkLabel:   { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textDark },
  linkChevron: { fontSize: 18, color: Colors.textLight },
  version:     { textAlign: 'center', fontSize: 11, color: Colors.textLight, marginTop: 12, marginBottom: 8 },
});
