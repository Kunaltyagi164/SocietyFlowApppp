// src/screens/Amenities/AmenitiesBookingScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Shadow, Spacing } from '../../theme';
import { DatePickerModal, TimePickerModal, ScreenBackground } from '../../components';
import * as api from '../../services/api';
import { enrichAmenitiesWithIcons, getAmenityIcon } from '../../utils/amenityIconMapper';
import { SF, SH, SW } from '../../utils/responsive';

const DEFAULT_AMENITIES = [
  { id: 1, name: 'Swimming Pool', icon: '🏊', price_per_hour: 0, iconName: 'pool' },
  { id: 2, name: 'Club House', icon: '🏛️', price_per_hour: 500, iconName: 'office-building' },
  { id: 3, name: 'Gym', icon: '🏋️', price_per_hour: 0, iconName: 'dumbbell' },
  { id: 4, name: 'Badminton Court', icon: '🏸', price_per_hour: 200, iconName: 'badminton' },
  { id: 5, name: 'Tennis Court', icon: '🎾', price_per_hour: 300, iconName: 'tennis-ball' },
  { id: 6, name: 'Party Hall', icon: '🎉', price_per_hour: 1000, iconName: 'account-group' },
  { id: 7, name: 'Terrace Garden', icon: '🌿', price_per_hour: 0, iconName: 'tree' },
  { id: 8, name: 'Conference Room', icon: '💼', price_per_hour: 400, iconName: 'briefcase' },
  { id: 9, name: 'Kids Play Area', icon: '🎠', price_per_hour: 0, iconName: 'play' },
];

export default function AmenitiesBookingScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [amenities, setAmenities] = useState(DEFAULT_AMENITIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  
  // Resident info (auto-populated)
  const [residentInfo, setResidentInfo] = useState({
    name: '',
    flatNumber: '',
    contact: '',
  });
  
  // Booking form fields
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  
  const [showTimeOptions, setShowTimeOptions] = useState(false);
  const [selectedTimeField, setSelectedTimeField] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  const pollInterval = useRef(null);
  const notificationTimer = useRef(null);

  // Load user data on mount
  useEffect(() => {
    loadUserInfo();
    loadAmenities();
    loadData();
    setupNotificationSystem();
    
    // Set up polling for real-time booking updates (every 30 seconds)
    pollInterval.current = setInterval(() => {
      console.log('🔄 [Amenities] Auto-refreshing bookings (30s interval)');
      loadData(true); // quiet mode
    }, 30000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      if (notificationTimer.current) clearInterval(notificationTimer.current);
    };
  }, []);

  const loadUserInfo = async () => {
    try {
      const user = await api.getUser();
      if (user) {
        setResidentInfo({
          name: user.name || 'N/A',
          flatNumber: user.flat_no || user.unit_number || user.flat_number || 'N/A',
          contact: user.phone || user.contact || 'N/A',
        });
        console.log('✅ [Amenities] Resident info loaded:', user.name, user.unit_number);
      }
    } catch (err) {
      console.error('❌ [Amenities] Error loading user info:', err.message);
    }
  };

  // Fetch amenities from API (with pricing, capacity, timings)
  const loadAmenities = async () => {
    try {
      const response = await api.getAmenities();
      if (response?.data?.data && Array.isArray(response.data.data)) {
        console.log('📍 [Amenities] Fetched from API:', response.data.data.length, 'amenities');
        // Enrich amenities with intelligent icons
        const enrichedAmenities = enrichAmenitiesWithIcons(response.data.data);
        setAmenities(enrichedAmenities);
      } else {
        console.log('ℹ️ [Amenities] API returned no data, using defaults');
        setAmenities(DEFAULT_AMENITIES);
      }
    } catch (err) {
      console.log('⚠️ [Amenities] Error fetching amenities, using defaults:', err.message);
      setAmenities(DEFAULT_AMENITIES);
    }
  };

  // Calculate estimated cost based on start/end times and selected amenity price
  const calculateEstimatedCost = () => {
    if (!startTime || !endTime || !selectedAmenity) return 0;

    try {
      const startMinutes = timeToMinutes(startTime);
      const endMinutes = timeToMinutes(endTime);
      const durationMins = endMinutes - startMinutes;

      if (durationMins <= 0) return 0;

      const pricePerHour = selectedAmenity.price_per_hour || 0;
      const totalCost = (durationMins / 60) * pricePerHour;
      return Math.round(totalCost);
    } catch (err) {
      console.log('⚠️ [Amenities] Error calculating cost:', err.message);
      return 0;
    }
  };

  // Update estimated cost when time or amenity changes
  useEffect(() => {
    const cost = calculateEstimatedCost();
    setEstimatedCost(cost);
  }, [startTime, endTime, selectedAmenity]);

  // Setup notification system for upcoming bookings
  const setupNotificationSystem = () => {
    notificationTimer.current = setInterval(() => {
      checkUpcomingBookings();
    }, 60000); // Check every 1 minute
  };

  // Check for bookings in next 24 hours and show notifications
  const checkUpcomingBookings = () => {
    if (bookings.length === 0) return;

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcoming = [];

    bookings.forEach((booking) => {
      try {
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time || '00:00'}`);
        if (bookingDateTime > now && bookingDateTime <= tomorrow) {
          const exists = upcomingBookings.some(b => b.id === booking.id);
          if (!exists) {
            upcoming.push(booking);
          }
        }
      } catch (err) {
        console.log('⚠️ [Amenities] Error parsing booking date:', err.message);
      }
    });

    if (upcoming.length > 0) {
      setUpcomingBookings(upcoming);
      setShowNotification(true);
      console.log('🔔 [Amenities] Found', upcoming.length, 'upcoming bookings in next 24h');

      // Auto-hide notification after 10 seconds
      setTimeout(() => setShowNotification(false), 10000);
    }
  };

  const formatDateToDDMMYYYY = (ddmmyyyy) => {
    // Convert DD-MM-YYYY to YYYY-MM-DD for API
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return null;
    const [dd, mm, yyyy] = ddmmyyyy.split('-');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateToDBFormat = (ddmmyyyy) => {
    // Convert DD-MM-YYYY to YYYY-MM-DD format for API
    if (!ddmmyyyy) return '';
    const [dd, mm, yyyy] = ddmmyyyy.split('-');
    return `${yyyy}-${mm}-${dd}`;
  };

  const isValidTime = (time) => {
    // Validate HH:MM or HH:MM AM/PM format
    const time24Regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const time12Regex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    return time24Regex.test(time) || time12Regex.test(time);
  };

  // Convert "HH:MM AM/PM", "HH:MM", or "HH:MM:SS" to total minutes (0..1439)
  const timeToMinutes = (time) => {
    if (!time) return 0;
    const trimmed = time.trim();
    const parts = trimmed.split(' ');
    // Strip seconds if present: "10:30:00" → "10:30"
    const timePart = parts[0].split(':').slice(0, 2).join(':');
    const [hh, mm] = timePart.split(':').map(Number);
    const period = parts[1] ? parts[1].toUpperCase() : null;
    let hours = hh || 0;
    if (period === 'AM') {
      if (hours === 12) hours = 0;
    } else if (period === 'PM') {
      if (hours !== 12) hours += 12;
    }
    return hours * 60 + (mm || 0);
  };

  const isValidDate = (date) => {
    // Validate DD-MM-YYYY format
    const dateRegex = /^(0?[1-9]|[12][0-9]|3[01])-(0?[1-9]|1[012])-\d{4}$/;
    if (!dateRegex.test(date)) return false;
    
    const [dd, mm, yyyy] = date.split('-').map(v => parseInt(v));
    const actualDate = new Date(yyyy, mm - 1, dd);
    
    return actualDate.getDate() === dd &&
           actualDate.getMonth() === mm - 1 &&
           actualDate.getFullYear() === yyyy;
  };

  const checkAvailability = async () => {
    if (!selectedAmenity || !bookingDate || !startTime || !endTime) {
      Alert.alert('Required', 'Please fill amenity, date, and times first');
      return;
    }

    if (!isValidDate(bookingDate)) {
      Alert.alert('Invalid Date', 'Please use DD-MM-YYYY format (e.g., 16-04-2026)');
      return;
    }

    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      Alert.alert('Invalid Time', 'Please use HH:MM format (e.g., 10:30, 15:45)');
      return;
    }

    // Compare start and end times
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes >= endMinutes) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }

    try {
      setAvailabilityStatus(null);

      // Convert date format for API
      const apiDate = formatDateToDBFormat(bookingDate);

      console.log(`🔍 [Amenities] Checking availability for: ${selectedAmenity.name} on ${apiDate} from ${startTime} to ${endTime}`);
      console.log(`🔍 [Amenities] Total loaded bookings: ${bookings.length}`);

      // Filter existing bookings for same amenity + date (exclude cancelled)
      const amenityBookings = bookings.filter(b => {
        const nameMatch = (b.amenity || '').toLowerCase() === selectedAmenity.name.toLowerCase();
        const dateMatch = (b.booking_date || '').startsWith(apiDate);
        const notCancelled = (b.status || '').toLowerCase() !== 'cancelled';
        return nameMatch && dateMatch && notCancelled;
      });

      console.log(`🔍 [Amenities] Conflicting bookings to check: ${amenityBookings.length}`);

      let isAvailable = true;
      let conflictDetails = '';

      for (const booking of amenityBookings) {
        const rawStart = booking.start_time || '';
        const rawEnd = booking.end_time || '';

        if (!rawStart || !rawEnd) continue;

        // Use timeToMinutes to handle HH:MM, HH:MM:SS, HH:MM AM/PM formats
        const bStartMinutes = timeToMinutes(rawStart);
        const bEndMinutes = timeToMinutes(rawEnd);

        console.log(`🔍 [Amenities] Existing booking: ${rawStart}(${bStartMinutes}min) - ${rawEnd}(${bEndMinutes}min) | New: ${startMinutes}min - ${endMinutes}min`);

        if (bStartMinutes === 0 && bEndMinutes === 0) continue; // skip unparseable

        // Overlap check: new slot overlaps if it starts before existing ends AND ends after existing starts
        if (startMinutes < bEndMinutes && endMinutes > bStartMinutes) {
          isAvailable = false;
          conflictDetails = `${rawStart} - ${rawEnd} (by ${booking.resident_name || 'another resident'})`;
          break;
        }
      }

      if (isAvailable) {
        setAvailabilityStatus('available');
        Alert.alert('✅ Available', `${selectedAmenity.name} is available from ${startTime} to ${endTime} on ${bookingDate}`);
        console.log('✅ [Amenities] Time slot is available!');
      } else {
        setAvailabilityStatus('occupied');
        Alert.alert('❌ Already Booked', `This time slot is occupied:\n${conflictDetails}\n\nPlease select a different time.`);
        console.log('❌ [Amenities] Time slot is occupied! Conflict:', conflictDetails);
      }
    } catch (err) {
      console.error('❌ [Amenities] Availability check error:', err.message);
      Alert.alert('Error', 'Failed to check availability');
    }
  };

  const loadData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      console.log('📍 [Amenities] Loading bookings...');
      
      const bookingsRes = await api.getBookings();
      const raw = bookingsRes.data?.data ?? bookingsRes.data ?? [];
      const bookingsData = Array.isArray(raw) ? raw : [];
      setBookings(bookingsData);

      try {
        await AsyncStorage.multiSet([
          ['reports_cache_bookings', JSON.stringify(bookingsData)],
          ['reports_cache_bookings_updated_at', new Date().toISOString()],
        ]);
      } catch (cacheErr) {
        console.warn('[Amenities] Failed to cache report data:', cacheErr.message);
      }
      
      // Auto-check for upcoming bookings
      checkUpcomingBookings();
      
      console.log(`✅ [Amenities] Loaded ${bookingsData.length} bookings`);
    } catch (err) {
      const status = err.response?.status;
      console.warn('⚠️ [Amenities] Could not load bookings:', status, err.message);
      // Treat any server error as "no bookings yet" — screen still fully usable
      setBookings([]);
    } finally {
      if (!quiet) setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadData(false);
  };

  const handleBooking = async () => {
    if (!selectedAmenity || !bookingDate || !startTime || !endTime) {
      Alert.alert('Required', 'Please select amenity, date, and times');
      return;
    }

    if (availabilityStatus !== 'available') {
      Alert.alert('First Check Availability', 'Please check availability before booking');
      return;
    }

    try {
      setSubmitting(true);
      const apiDate = formatDateToDBFormat(bookingDate);
      
      const bookingData = {
        amenity: selectedAmenity.name,
        flat_no: residentInfo.flatNumber.toUpperCase(),
        resident_name: residentInfo.name,
        booking_date: apiDate,
        start_time: startTime,
        end_time: endTime,
        notes: notes || '',
      };
      
      console.log('📡 [Amenities] Creating booking:', bookingData);
      const response = await api.createBooking(bookingData);
      const booking = response?.data?.data;
      
      console.log('✅ [Amenities] Booking created:', booking);
      
      // Show detailed confirmation with pricing
      const costText = booking?.total_amount > 0 
        ? `\n💰 Total: ₹${booking.total_amount}\n📌 Payment: ${booking.payment_status || 'Pending'}`
        : '\n💳 Free';
      
      Alert.alert(
        'Success', 
        `${selectedAmenity.name}\n${bookingDate} | ${startTime}-${endTime}${costText}\n\nBooking confirmed!`
      );
      
      // Reset form
      setSelectedAmenity(null);
      setBookingDate('');
      setStartTime('');
      setEndTime('');
      setNotes('');
      setAvailabilityStatus(null);
      setEstimatedCost(0);
      
      // Reload bookings immediately
      await loadData(false);
    } catch (err) {
      console.error('❌ [Amenities] Booking error:', err.message);
      console.error('   Full Error:', err);
      console.error('   Status:', err.response?.status);
      console.error('   Data:', err.response?.data);
      console.error('   URL:', err.config?.url);
      console.error('   Method:', err.config?.method);
      
      const errorMsg = err.response?.data?.error || 
                       err.response?.data?.message || 
                       err.message || 
                       'Unknown error occurred';
      
      Alert.alert('Booking Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = (booking) => {
    Alert.alert(
      'Cancel Booking?',
      `Cancel ${booking.amenity} on ${booking.booking_date}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              console.log(`📡 [Amenities] Cancelling booking ID: ${booking.id}`);
              await api.cancelBooking(booking.id);
              console.log(`✅ [Amenities] Booking ${booking.id} cancelled`);
              Alert.alert('Cancelled', 'Booking cancelled successfully');
              await loadData(false);
            } catch (err) {
              console.error('❌ [Amenities] Cancel error:', err.message);
              Alert.alert('Error', err.response?.data?.error || err.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <ScreenBackground>
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.teal} style={{ marginTop: 40 }} />
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
    <SafeAreaView style={styles.container}>
      {/* Upcoming Bookings Notification */}
      {showNotification && upcomingBookings.length > 0 && (
        <View style={styles.notificationBanner}>
          <MaterialCommunityIcons name="bell-alert" size={20} color={Colors.textWhite} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.notificationTitle}>🔔 Upcoming Booking!</Text>
            <Text style={styles.notificationText}>
              You have {upcomingBookings.length} booking(s) in the next 24 hours
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowNotification(false)}>
            <MaterialCommunityIcons name="close" size={18} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnWrap}>
            <MaterialCommunityIcons name="arrow-left" size={18} color="#FFFFFF" />
            <Text style={styles.backBtn}>Back</Text>
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <MaterialCommunityIcons name="office-building" size={18} color="#FFFFFF" />
            <Text style={styles.title}>Amenities</Text>
          </View>
          <View style={{ width: 30 }} />
        </View>

        {/* My Bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Bookings ({bookings.length})</Text>
            {submitting && <ActivityIndicator size="small" color={Colors.teal} />}
          </View>
          {bookings.length > 0 ? (
            bookings.map((booking) => {
              const amenity = amenities.find(a => a.name === booking.amenity);
              const durationMins = booking.duration_mins || 0;
              const costDisplay = booking.total_amount > 0 
                ? `₹${booking.total_amount}` 
                : 'Free';
              const paymentStatus = booking.payment_status || 'Pending';
              
              return (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingContent}>
                    <View style={styles.bookingIcon}>
                      <MaterialCommunityIcons name={amenity?.iconName || 'office-building'} size={24} color={Colors.teal} />
                    </View>
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingTitle}>{booking.amenity}</Text>
                      <View style={styles.bookingDateRow}>
                        <MaterialCommunityIcons name="calendar-month-outline" size={14} color={Colors.textSecondary} />
                        <Text style={styles.bookingDate}>{booking.booking_date} • {booking.start_time}-{booking.end_time}</Text>
                      </View>
                      <View style={styles.bookingDetails}>
                        <Text style={styles.detailText}>⏱️ {durationMins} min</Text>
                        <Text style={styles.detailText}>💰 {costDisplay}</Text>
                        <Text style={[styles.detailText, { color: paymentStatus === 'Paid' ? Colors.teal : Colors.warning }]}>
                          📌 {paymentStatus}
                        </Text>
                      </View>
                      <View style={styles.statusContainer}>
                        <Text style={[
                          styles.bookingStatus,
                          booking.status === 'Confirmed' && styles.statusConfirmed,
                          booking.status === 'Pending' && styles.statusPending,
                          booking.status === 'Cancelled' && styles.statusCancelled,
                        ]}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancelBooking(booking)}
                    disabled={submitting || booking.status === 'Cancelled'}
                  >
                    <MaterialCommunityIcons name="close" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No bookings yet</Text>
          )}
        </View>

        {/* New Booking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book Amenity</Text>

          {/* Resident Info Display */}
          <View style={styles.residentInfoCard}>
            <View style={styles.residentInfoTitleRow}>
              <MaterialCommunityIcons name="account-circle-outline" size={16} color={Colors.teal} />
              <Text style={styles.residentInfoLabel}>Your Details</Text>
            </View>
            <View style={styles.residentInfoRow}>
              <Text style={styles.residentInfoKey}>Name:</Text>
              <Text style={styles.residentInfoValue}>{residentInfo.name}</Text>
            </View>
            <View style={styles.residentInfoRow}>
              <Text style={styles.residentInfoKey}>Unit/Flat:</Text>
              <Text style={styles.residentInfoValue}>{residentInfo.flatNumber}</Text>
            </View>
            <View style={styles.residentInfoRow}>
              <Text style={styles.residentInfoKey}>Contact:</Text>
              <Text style={styles.residentInfoValue}>{residentInfo.contact}</Text>
            </View>
          </View>

          {/* Select Amenity */}
          <Text style={styles.label}>Choose Amenity</Text>
          <View style={styles.amenityGrid}>
            {amenities.map((amenity) => (
              <TouchableOpacity
                key={amenity.id}
                style={[
                  styles.amenityBtn,
                  selectedAmenity?.id === amenity.id && styles.amenityBtn_Active,
                ]}
                onPress={() => {
                  setSelectedAmenity(amenity);
                  setAvailabilityStatus(null);
                }}
              >
                <MaterialCommunityIcons name={amenity.iconName || 'office-building'} size={28} color={Colors.teal} style={styles.amenityIcon} />
                <Text style={styles.amenityName}>{amenity.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Booking Details */}
          {selectedAmenity && (
            <>
              {/* Date Picker Button */}
              <Text style={styles.label}>Select Date</Text>
              <TouchableOpacity
                style={[styles.pickerButton, bookingDate && styles.pickerButtonActive]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.pickerButtonText, bookingDate && styles.pickerButtonTextActive]}>
                  {bookingDate || 'Tap to select date'}
                </Text>
              </TouchableOpacity>

              {/* Time Selection Pickers */}
              <View style={styles.timeRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Start Time</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, startTime && styles.pickerButtonActive]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Text style={[styles.pickerButtonText, startTime && styles.pickerButtonTextActive]}>
                      {startTime || 'Tap to select'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>End Time</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, endTime && styles.pickerButtonActive]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Text style={[styles.pickerButtonText, endTime && styles.pickerButtonTextActive]}>
                      {endTime || 'Tap to select'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Availability Status */}
              {availabilityStatus && (
                <View style={[
                  styles.availabilityBanner,
                  availabilityStatus === 'available' ? styles.availableBanner : styles.occupiedBanner
                ]}>
                  <View style={styles.availabilityRow}>
                    <MaterialCommunityIcons
                      name={availabilityStatus === 'available' ? 'check-circle-outline' : 'close-circle-outline'}
                      size={16}
                      color={Colors.textDark}
                    />
                    <Text style={styles.availabilityText}>
                      {availabilityStatus === 'available' ? 'Available' : 'Occupied'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Check Availability Button */}
              <TouchableOpacity
                style={styles.checkBtn}
                onPress={checkAvailability}
              >
                <View style={styles.actionBtnRow}>
                  <MaterialCommunityIcons name="magnify" size={16} color={Colors.textWhite} />
                  <Text style={styles.checkBtnText}>Check Availability</Text>
                </View>
              </TouchableOpacity>

              {/* Estimated Cost Display */}
              {startTime && endTime && selectedAmenity && (
                <View style={styles.estimatedCostBox}>
                  <Text style={styles.estimatedCostLabel}>Estimated Charge:</Text>
                  <Text style={styles.estimatedCostValue}>
                    {selectedAmenity.price_per_hour === 0 ? 'Free' : `₹${estimatedCost}`}
                  </Text>
                </View>
              )}

              {/* Notes */}
              <Text style={styles.label}>Additional Notes (Optional)</Text>
              <TextInput
                style={[styles.notesInput]}
                placeholder="e.g., Special requests, decorations needed, etc."
                placeholderTextColor={Colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.bookBtn,
                  submitting && styles.bookBtnDisabled,
                  availabilityStatus !== 'available' && styles.bookBtnDisabled
                ]}
                onPress={handleBooking}
                disabled={submitting || availabilityStatus !== 'available'}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={Colors.textWhite} />
                ) : (
                  <View style={styles.actionBtnRow}>
                    <MaterialCommunityIcons name="check" size={16} color={Colors.bgWhite} />
                    <Text style={styles.bookBtnText}>Confirm Booking</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        selectedDate={bookingDate}
        onDateChange={(date) => {
          setBookingDate(date);
          setShowDatePicker(false);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* Start Time Picker Modal */}
      <TimePickerModal
        visible={showStartTimePicker}
        selectedTime={startTime}
        onTimeChange={(time) => {
          setStartTime(time);
          setShowStartTimePicker(false);
        }}
        onClose={() => setShowStartTimePicker(false)}
        label="Select Start Time"
      />

      {/* End Time Picker Modal */}
      <TimePickerModal
        visible={showEndTimePicker}
        selectedTime={endTime}
        onTimeChange={(time) => {
          setEndTime(time);
          setShowEndTimePicker(false);
        }}
        onClose={() => setShowEndTimePicker(false)}
        label="Select End Time"
      />
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SW(16),
    paddingVertical: SH(12),
    backgroundColor: Colors.royalBlue,
    ...Shadow.soft,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  backBtn: {
    fontSize: SF(16),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  backBtnWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  title: {
    fontSize: SF(20),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    marginHorizontal: SW(16),
    marginVertical: SH(12),
  },
  sectionTitle: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(12),
  },
  label: {
    fontSize: SF(14),
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: SH(10),
  },
  bookingCard: {
    backgroundColor: Colors.cardGlass,
    borderRadius: Radius.lg,
    padding: SW(12),
    marginBottom: SH(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    ...Shadow.soft,
  },
  bookingTitle: {
    fontSize: SF(15),
    fontWeight: '700',
    color: Colors.textDark,
  },
  bookingDate: {
    fontSize: SF(13),
    color: Colors.textSecondary,
  },
  bookingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
    marginTop: SH(4),
  },
  bookingStatus: {
    fontSize: SF(12),
    color: Colors.teal,
    marginTop: SH(4),
  },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
    width: SW(36),
    height: SW(36),
    borderRadius: SW(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: SF(14),
    marginVertical: SH(20),
  },
  amenityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SH(16),
  },
  amenityBtn: {
    width: '48%',
    backgroundColor: Colors.cardGlass,
    borderRadius: Radius.md,
    padding: SW(12),
    alignItems: 'center',
    marginBottom: SH(10),
    borderWidth: SW(2),
    borderColor: Colors.primaryLight,
  },
  amenityBtn_Active: {
    borderColor: Colors.appBlue,
    backgroundColor: Colors.blueLight,
  },
  amenityIcon: {
    marginBottom: SH(6),
  },
  amenityName: {
    fontSize: SF(13),
    color: Colors.textDark,
    fontWeight: '500',
    textAlign: 'center',
  },
  dateInput: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    marginBottom: SH(16),
    borderWidth: SW(1),
    borderColor: Colors.primaryLight,
  },
  dateInputText: {
    fontSize: SF(14),
    color: Colors.textDark,
  },
  timeInput: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: Colors.primaryLight,
    paddingVertical: SH(12),
    paddingHorizontal: SW(12),
    fontSize: SF(14),
    color: Colors.textDark,
    marginBottom: SH(16),
  },
  pickerButton: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    borderWidth: SW(2),
    borderColor: Colors.border,
    paddingVertical: SH(14),
    paddingHorizontal: SW(14),
    marginBottom: SH(16),
    justifyContent: 'center',
  },
  pickerButtonActive: {
    borderColor: Colors.teal,
    backgroundColor: 'rgba(32, 201, 201, 0.05)',
  },
  pickerButtonText: {
    fontSize: SF(14),
    color: Colors.textMid,
    fontWeight: '500',
  },
  pickerButtonTextActive: {
    color: Colors.teal,
    fontWeight: '600',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SH(16),
  },
  slotBtn: {
    width: '48%',
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(10),
    alignItems: 'center',
    marginBottom: SH(8),
    borderWidth: SW(2),
    borderColor: Colors.primaryLight,
  },
  slotBtn_Active: {
    borderColor: Colors.teal,
    backgroundColor: Colors.tealLight,
  },
  slotText: {
    fontSize: SF(13),
    color: Colors.textDark,
    fontWeight: '500',
  },
  slotText_Active: {
    color: Colors.teal,
  },
  bookBtn: {
    backgroundColor: Colors.freshGreen,
    borderRadius: Radius.lg,
    paddingVertical: SH(12),
    alignItems: 'center',
  },
  bookBtnDisabled: {
    opacity: 0.6,
  },
  bookBtnText: {
    color: Colors.bgWhite,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SH(12),
  },
  bookingContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingIcon: {
    width: SW(32),
    alignItems: 'center',
    marginRight: SW(12),
  },
  bookingInfo: {
    flex: 1,
  },
  statusContainer: {
    marginTop: SH(4),
  },
  statusConfirmed: {
    color: Colors.success,
  },
  statusPending: {
    color: Colors.warning,
  },
  statusCancelled: {
    color: Colors.danger,
  },
  residentInfoCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    padding: SW(12),
    marginBottom: SH(16),
    borderLeftWidth: 4,
    borderLeftColor: Colors.teal,
    ...Shadow.soft,
  },
  residentInfoLabel: {
    fontSize: SF(14),
    fontWeight: '700',
    color: Colors.teal,
  },
  residentInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
    marginBottom: SH(10),
  },
  residentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SH(8),
  },
  residentInfoKey: {
    fontSize: SF(13),
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  residentInfoValue: {
    fontSize: SF(13),
    color: Colors.textDark,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SH(16),
  },
  dateInput: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: Colors.primaryLight,
    paddingVertical: SH(12),
    paddingHorizontal: SW(12),
    fontSize: SF(14),
    color: Colors.textDark,
    marginBottom: SH(16),
  },
  availabilityBanner: {
    borderRadius: Radius.md,
    paddingVertical: SH(10),
    paddingHorizontal: SW(12),
    marginBottom: SH(12),
    alignItems: 'center',
  },
  availableBanner: {
    backgroundColor: '#DBEAFE',
  },
  occupiedBanner: {
    backgroundColor: '#FEDEDE',
  },
  availabilityText: {
    fontSize: SF(13),
    fontWeight: '700',
    color: Colors.textDark,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  checkBtn: {
    backgroundColor: Colors.appBlue,
    borderRadius: Radius.md,
    paddingVertical: SH(12),
    alignItems: 'center',
    marginBottom: SH(16),
  },
  checkBtnText: {
    color: Colors.textWhite,
    fontWeight: '700',
    fontSize: SF(14),
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW(6),
  },
  notesInput: {
    backgroundColor: Colors.bgWhite,
    borderRadius: Radius.md,
    borderWidth: SW(1),
    borderColor: Colors.primaryLight,
    paddingVertical: SH(12),
    paddingHorizontal: SW(12),
    fontSize: SF(14),
    color: Colors.textDark,
    marginBottom: SH(16),
    textAlignVertical: 'top',
  },
  bookingDetails: {
    flexDirection: 'row',
    gap: SW(12),
    marginTop: SH(8),
  },
  detailText: {
    fontSize: SF(12),
    color: Colors.textSecondary,
  },
  estimatedCostBox: {
    backgroundColor: 'rgba(39, 181, 74, 0.1)',
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.freshGreen,
    padding: SW(12),
    marginBottom: SH(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estimatedCostLabel: {
    fontSize: SF(13),
    fontWeight: '600',
    color: Colors.textDark,
  },
  estimatedCostValue: {
    fontSize: SF(16),
    fontWeight: 'bold',
    color: Colors.freshGreen,
  },
  notificationBanner: {
    backgroundColor: Colors.royalBlue,
    borderRadius: Radius.md,
    padding: SW(12),
    margin: SW(12),
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadow.soft,
  },
  notificationTitle: {
    fontSize: SF(13),
    fontWeight: 'bold',
    color: Colors.textWhite,
  },
  notificationText: {
    fontSize: SF(12),
    color: Colors.textWhite,
    marginTop: SH(2),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SH(12),
  },
  bookingContent: {
    flex: 1,
    flexDirection: 'row',
    gap: SW(10),
  },
  bookingIcon: {
    backgroundColor: 'rgba(32, 201, 201, 0.1)',
    width: SW(44),
    height: SW(44),
    borderRadius: SW(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingInfo: {
    flex: 1,
  },
  statusContainer: {
    marginTop: SH(6),
  },
  statusConfirmed: {
    color: Colors.teal,
  },
  statusPending: {
    color: Colors.warning,
  },
  statusCancelled: {
    color: Colors.danger,
  },
});
