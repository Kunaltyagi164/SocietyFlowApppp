// src/components/DatePickerModal.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Shadow, Spacing } from '../theme';

export const DatePickerModal = ({ visible, selectedDate, onDateChange, onClose, minDate = null }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  useEffect(() => {
    if (selectedDate) {
      const [dd, mm, yyyy] = selectedDate.split('-').map(Number);
      setCurrentYear(yyyy);
      setCurrentMonth(mm - 1);
      setSelectedDay(dd);
    }
  }, [selectedDate, visible]);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const days = [];
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handleSelectDate = (day) => {
    if (!day) return;
    
    // Check if date is in the past (if minDate is not provided)
    const selectedDateObj = new Date(currentYear, currentMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDateObj < today) {
      alert('Please select today or a future date');
      return;
    }

    const ddStr = String(day).padStart(2, '0');
    const mmStr = String(currentMonth + 1).padStart(2, '0');
    const dateStr = `${ddStr}-${mmStr}-${currentYear}`;
    
    setSelectedDay(day);
    onDateChange(dateStr);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color={Colors.textMid} />
            </TouchableOpacity>
          </View>

          {/* Month/Year Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.charcoal} />
            </TouchableOpacity>
            <Text style={styles.monthYear}>{monthNames[currentMonth]} {currentYear}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.charcoal} />
            </TouchableOpacity>
          </View>

          {/* Day Names */}
          <View style={styles.dayNamesRow}>
            {dayNames.map((name) => (
              <View key={name} style={styles.dayNameCell}>
                <Text style={styles.dayName}>{name}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {days.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  day === null && styles.emptyCell,
                  day === selectedDay && styles.selectedCell,
                  day && day < new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear() && styles.disabledCell,
                ]}
                onPress={() => handleSelectDate(day)}
                disabled={day === null || (day < new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear())}
              >
                {day && (
                  <Text style={[
                    styles.dayText,
                    day === selectedDay && styles.selectedDayText,
                    day < new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear() && styles.disabledDayText,
                  ]}>
                    {day}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmBtn} onPress={onClose}>
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
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
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  navBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    ...Shadow.soft,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMid,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.lg,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  selectedCell: {
    backgroundColor: Colors.teal,
  },
  disabledCell: {
    backgroundColor: Colors.border,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.charcoal,
  },
  selectedDayText: {
    color: Colors.white,
  },
  disabledDayText: {
    color: Colors.textMid,
  },
  confirmBtn: {
    paddingVertical: Spacing.md,
    backgroundColor: Colors.teal,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
});
