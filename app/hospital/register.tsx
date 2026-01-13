import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';

/**
 * OLD HOSPITAL REGISTRATION SCREEN - DEPRECATED
 * This file redirects to the new 3-step OTP registration flow.
 * The new registration is at: /register/hospital/step1-email
 */
export default function HospitalRegisterScreen() {
  useEffect(() => {
    // Redirect to new registration flow
    router.replace('/register/hospital/step1-email');
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={PrimaryColors.main} />
      <Text style={styles.text}>Redirecting to new registration...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748b',
  },
});
