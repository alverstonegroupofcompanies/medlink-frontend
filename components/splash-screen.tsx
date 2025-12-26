import { useEffect, useState } from 'react';
import { StyleSheet, Animated, SafeAreaView, Platform, StatusBar, Image } from 'react-native';
import { ThemedView } from './themed-view';

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
      <ThemedView style={styles.container} lightColor="#ffffff" darkColor="#ffffff">
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
          <Image 
            source={require('../assets/images/splash-logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
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
    backgroundColor: '#ffffff',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  logo: {
    width: '80%',
    height: '60%',
    maxWidth: 400,
  },
});

