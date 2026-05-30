// src/components/TimePickerModal.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Spacing } from '../theme';

export const TimePickerModal = ({ visible, selectedTime, onTimeChange, onClose, label = 'Select Time' }) => {
  const [hours, setHours] = useState(Array.from({ length: 12 }, (_, i) => i + 1));
  const [minutes, setMinutes] = useState(Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')));
  const [periods, setPeriods] = useState(['AM', 'PM']);
  
  const [selectedHour, setSelectedHour] = useState('10');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('AM');

  const hourScrollRef = useRef();
  const minuteScrollRef = useRef();
  const periodScrollRef = useRef();

  useEffect(() => {
    if (selectedTime && selectedTime.includes(':')) {
      const [time, period] = selectedTime.includes(' ') 
        ? selectedTime.split(' ')
        : [selectedTime, 'AM'];
      const [hour, minute] = time.split(':');
      setSelectedHour(String(parseInt(hour) || 10).padStart(2, '0'));
      setSelectedMinute(String(minute || '00').padStart(2, '0'));
      setSelectedPeriod(period);
    }
  }, [selectedTime, visible]);

  const ITEM_HEIGHT = 50;

  const handleHourScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, hours.length - 1));
    if (hours[clamped] !== undefined) {
      setSelectedHour(String(hours[clamped]).padStart(2, '0'));
    }
  };

  const handleMinuteScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, minutes.length - 1));
    if (minutes[clamped] !== undefined) {
      setSelectedMinute(minutes[clamped]);
    }
  };

  const handlePeriodScroll = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(index, periods.length - 1));
    if (periods[clamped] !== undefined) {
      setSelectedPeriod(periods[clamped]);
    }
  };

  const handleConfirm = () => {
    const timeStr = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;
    onTimeChange(timeStr);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{label}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.textMid} />
            </TouchableOpacity>
          </View>

          {/* Time Picker Wheels */}
          <View style={styles.pickerContainer}>
            {/* Hours */}
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelLabel}>Hour</Text>
              <ScrollView
                ref={hourScrollRef}
                style={styles.wheel}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleHourScroll}
                onScrollEndDrag={handleHourScroll}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                snapToAlignment="start"
                decelerationRate="fast"
              >
                <View style={{ height: 75 }} />
                {hours.map((hour) => (
                  <TouchableOpacity key={hour} style={styles.wheelItem} onPress={() => setSelectedHour(String(hour).padStart(2, '0'))}>
                    <Text style={[
                      styles.wheelItemText,
                      String(hour).padStart(2, '0') === selectedHour && styles.wheelItemSelected
                    ]}>
                      {String(hour).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 75 }} />
              </ScrollView>
            </View>

            {/* Colon */}
            <View style={styles.colonColumn}>
              <Text style={styles.colon}>:</Text>
            </View>

            {/* Minutes */}
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelLabel}>Minute</Text>
              <ScrollView
                ref={minuteScrollRef}
                style={styles.wheel}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handleMinuteScroll}
                onScrollEndDrag={handleMinuteScroll}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                snapToAlignment="start"
                decelerationRate="fast"
              >
                <View style={{ height: 75 }} />
                {minutes.map((minute) => (
                  <TouchableOpacity key={minute} style={styles.wheelItem} onPress={() => setSelectedMinute(minute)}>
                    <Text style={[
                      styles.wheelItemText,
                      minute === selectedMinute && styles.wheelItemSelected
                    ]}>
                      {minute}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 75 }} />
              </ScrollView>
            </View>

            {/* Period (AM/PM) */}
            <View style={styles.wheelColumn}>
              <Text style={styles.wheelLabel}>Period</Text>
              <ScrollView
                ref={periodScrollRef}
                style={styles.wheel}
                scrollEventThrottle={16}
                onMomentumScrollEnd={handlePeriodScroll}
                onScrollEndDrag={handlePeriodScroll}
                showsVerticalScrollIndicator={false}
                snapToInterval={50}
                snapToAlignment="start"
                decelerationRate="fast"
              >
                <View style={{ height: 75 }} />
                {periods.map((period) => (
                  <TouchableOpacity key={period} style={styles.wheelItem} onPress={() => setSelectedPeriod(period)}>
                    <Text style={[
                      styles.wheelItemText,
                      period === selectedPeriod && styles.wheelItemSelected
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 75 }} />
              </ScrollView>
            </View>
          </View>

          {/* Selected Time Display */}
          <View style={styles.displayBox}>
            <Text style={styles.selectedTimeLabel}>Selected Time</Text>
            <Text style={styles.selectedTime}>{selectedHour}:{selectedMinute} {selectedPeriod}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    height: 250,
  },
  wheelColumn: {
    width: 70,
    alignItems: 'center',
  },
  wheelLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMid,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wheel: {
    height: 200,
    width: 70,
  },
  wheelItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textLight,
  },
  wheelItemSelected: {
    fontSize: 24,
    color: Colors.teal,
    fontWeight: '700',
  },
  colonColumn: {
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
    marginBottom: 50,
  },
  colon: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  displayBox: {
    backgroundColor: Colors.teal,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  selectedTimeLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedTime: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
    marginTop: Spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.charcoal,
  },
  confirmBtn: {
    backgroundColor: Colors.teal,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});
