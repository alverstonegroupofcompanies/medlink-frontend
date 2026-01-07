import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Generate distributed starting positions for bubbles across the screen
// This will be called inside the component to ensure width/height are accurate
const generateDistributedPositions = (screenWidth: number, screenHeight: number, bubbleSize: number = 140, count: number = 4) => {
  const padding = bubbleSize / 2;
  const positions: Array<{ x: number; y: number }> = [];
  
  // Divide screen into zones to ensure good distribution, avoiding center where main logo is
  const zones = [
    { xRange: [padding, screenWidth * 0.35], yRange: [padding, screenHeight * 0.35] }, // Top-left
    { xRange: [screenWidth * 0.65, screenWidth - padding], yRange: [padding, screenHeight * 0.35] }, // Top-right
    { xRange: [padding, screenWidth * 0.35], yRange: [screenHeight * 0.65, screenHeight - padding] }, // Bottom-left
    { xRange: [screenWidth * 0.65, screenWidth - padding], yRange: [screenHeight * 0.65, screenHeight - padding] }, // Bottom-right
  ];
  
  for (let i = 0; i < count; i++) {
    const zone = zones[i % zones.length];
    const x = zone.xRange[0] + Math.random() * (zone.xRange[1] - zone.xRange[0]);
    const y = zone.yRange[0] + Math.random() * (zone.yRange[1] - zone.yRange[0]);
    positions.push({ x, y });
  }
  
  return positions;
};

// Other ventures configuration - positions will be set in component
const otherVenturesBase = [
  {
    id: 1,
    name: 'Pharmacare',
    logo: require('@/assets/images/our-ventures/AGC-Compassion-meets-excellence.png'),
    delay: 0,
  },
  {
    id: 2,
    name: 'Medcity',
    logo: require('@/assets/images/our-ventures/04.Alverstone-Medcity-03.png'),
    delay: 300,
  },
  {
    id: 3,
    name: 'Drug House',
    logo: require('@/assets/images/our-ventures/ALVERSTONE-ISO-CERTIFIED-02.png'),
    delay: 600,
  },
  {
    id: 4,
    name: 'LLC',
    logo: require('@/assets/images/our-ventures/03.LLC full blue.png'),
    delay: 900,
  },
];

export function AppSplashScreen() {
  // Calculate responsive bubble size based on screen dimensions
  // Larger bubbles for better logo visibility
  const isTablet = width >= 768;
  const bubbleSize = isTablet 
    ? Math.min(width * 0.22, 240) // Tablet: 22% of width, max 240px
    : Math.min(width * 0.28, 200); // Mobile: 28% of width, max 200px
  
  const bubblePositions = generateDistributedPositions(width, height, bubbleSize, 4);
  const otherVentures = otherVenturesBase.map((venture, index) => ({
    ...venture,
    x: bubblePositions[index].x,
    y: bubblePositions[index].y,
  }));

  // Animation values for main logo (unchanged)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  // State to track z-index for bubbles (behind main logo when near center)
  const [bubbleZIndices, setBubbleZIndices] = useState<number[]>(
    Array(4).fill(5)
  );

  // Animation values for bubbles (static - no movement)
  const bubbleAnims = useRef(
    Array(4).fill(null).map(() => ({
      fadeIn: new Animated.Value(0),
      scale: new Animated.Value(0.8),
    }))
  ).current;

  // Main logo center position (approximate)
  const mainLogoCenterX = width / 2;
  const mainLogoCenterY = height / 2;
  const mainLogoRadius = 200; // Approximate radius of main logo area

  useEffect(() => {
    // Shimmer effect (continuous) - unchanged
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

    // Floating particles - unchanged
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

    // Main animation sequence - unchanged
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

    // Floating bubbles animation for other ventures
    bubbleAnims.forEach((anim, index) => {
      const venture = otherVentures[index];
      
      // Fade in and scale up initially
      Animated.sequence([
        Animated.delay(venture.delay + 500), // Start after main logo appears
        Animated.parallel([
          Animated.timing(anim.fadeIn, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Check initial position to set z-index (bubbles stay still)
      setTimeout(() => {
        const currentX = venture.x;
        const currentY = venture.y;
        
        // Calculate distance from main logo center
        const distanceX = Math.abs(currentX - mainLogoCenterX);
        const distanceY = Math.abs(currentY - mainLogoCenterY);
        const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        
        // If bubble is near main logo (within radius), put it behind (z-index 3)
        // Otherwise, keep it in front (z-index 5)
        setBubbleZIndices(prev => {
          const newIndices = [...prev];
          newIndices[index] = distance < mainLogoRadius ? 3 : 5;
          return newIndices;
        });
      }, venture.delay + 1100);
    });
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

          {/* Static Bubbles for Other Ventures */}
          {otherVentures.map((venture, index) => {
            const anim = bubbleAnims[index];
            const bubblePadding = bubbleSize * 0.04; // 4% of bubble size for padding (small padding for better logo visibility)
            const shineSize = bubbleSize * 0.33; // 33% of bubble size for shine
            return (
              <Animated.View
                key={venture.id}
                style={[
                  styles.bubbleContainer,
                  {
                    left: venture.x,
                    top: venture.y,
                    opacity: anim.fadeIn,
                    zIndex: bubbleZIndices[index],
                    transform: [
                      {
                        scale: anim.scale,
                      },
                    ],
                  },
                ]}
              >
                <View style={[styles.bubble, { width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 2 }]}>
                  <View style={[styles.bubbleInner, { padding: bubblePadding }]}>
                    <Image
                      source={venture.logo}
                      style={styles.bubbleLogo}
                      contentFit="contain"
                    />
                  </View>
                  {/* Bubble shine effect */}
                  <View style={[styles.bubbleShine, { 
                    width: shineSize, 
                    height: shineSize, 
                    borderRadius: shineSize / 2,
                    top: -shineSize * 0.33,
                    left: -shineSize * 0.33,
                  }]} />
                </View>
              </Animated.View>
            );
          })}

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
    backgroundColor: '#0066FF',
    width: 100,
  },
  circle: {
    position: 'absolute',
    backgroundColor: '#0066FF',
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
    backgroundColor: '#0066FF',
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
  // Styles for bouncing bubbles
  bubbleContainer: {
    position: 'absolute',
    zIndex: 5,
  },
  bubble: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0066FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E6F4FE',
  },
  bubbleInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  bubbleLogo: {
    width: '100%',
    height: '100%',
  },
  bubbleShine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    opacity: 0.8,
  },
});
