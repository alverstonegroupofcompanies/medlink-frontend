import { useEffect, useState } from 'react';
import { StyleSheet, Animated, SafeAreaView, Platform, StatusBar } from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { DoctorPrimaryColors } from '@/constants/doctor-theme';

export function AppSplashScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Animate splash screen appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container} lightColor="#ffffff" darkColor="#151718">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <ThemedText style={styles.title} lightColor={DoctorPrimaryColors.darkText} darkColor="#4fc3f7">
            Alverstone
          </ThemedText>
          <ThemedText style={styles.subtitle} lightColor={DoctorPrimaryColors.darkText} darkColor="#4fc3f7">
            MedLink
          </ThemedText>
        </Animated.View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
    lineHeight: 52,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 3,
    opacity: 0.9,
    lineHeight: 36,
    textAlign: 'center',
  },
});

