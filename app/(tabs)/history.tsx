import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';

export default function HistoryScreen() {
  return (
    <View style={[styles.container, { backgroundColor: NeutralColors.background }]}>
      <Text style={[styles.title, { color: PrimaryColors.main }]}>Calendar</Text>
      <Text style={[styles.subtitle, { color: NeutralColors.textSecondary }]}>Your calendar view will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
});


