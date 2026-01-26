import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export function AppSplashScreen() {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(-width)).current; // Start from left
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Shimmer effect (continuous)
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating particles
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(particle1, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(particle1, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particle2, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(particle2, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particle3, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: true,
          }),
          Animated.timing(particle3, {
            toValue: 0,
            duration: 3500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Main animation sequence
    Animated.sequence([
      // Slide in from left with fade
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Bounce effect
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // Hold
      Animated.delay(400),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E6F4FE', '#FFFFFF', '#D6EAFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      >
        <View style={styles.content}>
          {/* Animated particles */}
          <Animated.View
            style={[
              styles.particle,
              styles.particle1,
              {
                opacity: particle1.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.6, 0],
                }),
                transform: [
                  {
                    translateY: particle1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -100],
                    }),
                  },
                  {
                    translateX: particle1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 50],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.particle,
              styles.particle2,
              {
                opacity: particle2.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.5, 0],
                }),
                transform: [
                  {
                    translateY: particle2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -120],
                    }),
                  },
                  {
                    translateX: particle2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -40],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.particle,
              styles.particle3,
              {
                opacity: particle3.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.7, 0],
                }),
                transform: [
                  {
                    translateY: particle3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -80],
                    }),
                  },
                  {
                    translateX: particle3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 30],
                    }),
                  },
                ],
              },
            ]}
          />

          {/* Decorative circles */}
          <Animated.View
            style={[
              styles.circle,
              styles.circle1,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.08],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.circle,
              styles.circle2,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.12],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.circle,
              styles.circle3,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.06],
                }),
              },
            ]}
          />

          {/* Main logo container with slide and fade animation */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateX: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <View style={styles.logoWrapper}>
              {/* Shimmer overlay */}
              <Animated.View
                style={[
                  styles.shimmer,
                  {
                    opacity: shimmerAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.3, 0],
                    }),
                    transform: [
                      {
                        translateX: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-width, width],
                        }),
                      },
                    ],
                  },
                ]}
              />
              
              <Image
                source={require('@/assets/images/splash-logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
          </Animated.View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.85,
    height: 140,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563EB',
    width: 100,
  },
  circle: {
    position: 'absolute',
    backgroundColor: '#2563EB',
    borderRadius: 1000,
  },
  circle1: {
    width: 500,
    height: 500,
    top: -250,
    right: -150,
  },
  circle2: {
    width: 350,
    height: 350,
    bottom: -175,
    left: -100,
  },
  circle3: {
    width: 250,
    height: 250,
    top: height * 0.3,
    left: -125,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#2563EB',
    borderRadius: 50,
  },
  particle1: {
    width: 12,
    height: 12,
    bottom: height * 0.3,
    left: width * 0.2,
  },
  particle2: {
    width: 16,
    height: 16,
    bottom: height * 0.35,
    right: width * 0.25,
  },
  particle3: {
    width: 10,
    height: 10,
    bottom: height * 0.28,
    left: width * 0.6,
  },
});
