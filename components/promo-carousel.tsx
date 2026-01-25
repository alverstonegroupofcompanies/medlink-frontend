import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../app/api';
import { getFullImageUrl } from '@/utils/url-helper';
import { ArrowRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Horizontal padding: 20px on each side = 40px total (matches Spacing.lg)
const HORIZONTAL_PADDING = 20; // Spacing.lg equivalent
const CARD_SPACING = 16;
// Use 75% of screen width for promo cards
const IS_LARGE_SCREEN = SCREEN_WIDTH >= 768;
const IS_MEDIUM_SCREEN = SCREEN_WIDTH >= 600 && SCREEN_WIDTH < 768; // ~7 inch devices
const CONTENT_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
// Match dashboard padding: full width inside the same horizontal padding on phones,
// and match 2-column card width on tablets/large screens.
const PROMO_CARD_WIDTH = IS_LARGE_SCREEN
  ? (CONTENT_WIDTH - CARD_SPACING) / 2
  : IS_MEDIUM_SCREEN
    ? (CONTENT_WIDTH - CARD_SPACING) / 2
    : Math.min(300, CONTENT_WIDTH); // phones: fixed ~300px card (but never wider than content)
const CARD_HEIGHT = IS_LARGE_SCREEN ? 230 : 190;
const IS_SMALL_SCREEN = SCREEN_WIDTH < 400; // Hide short summary on small screens

interface PromoCarouselProps {
  onPromoPress?: (blog: any) => void;
}

export default function PromoCarousel({ onPromoPress }: PromoCarouselProps) {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    loadPromos({ showLoader: true });
  }, []);

  // Refresh promos whenever the screen regains focus (so newly-added blogs appear without app restart)
  useFocusEffect(
    React.useCallback(() => {
      loadPromos({ showLoader: false });
    }, [])
  );

  // Also refresh when app comes back from background (debounced)
  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        loadPromos({ showLoader: false });
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  const loadPromos = async ({ showLoader }: { showLoader: boolean }) => {
    try {
      const now = Date.now();
      // Debounce to avoid refetch loops while navigating quickly
      if (!showLoader && now - lastFetchRef.current < 3000) {
        return;
      }
      lastFetchRef.current = now;

      if (showLoader) setLoading(true);
      const response = await API.get('/blogs');
      if (__DEV__) {
        console.log('📢 Promo Carousel - API Response:', response.data);
      }
      if (response.data?.status && response.data?.blogs) {
        // Backend already filters published blogs, so use all blogs from response
        const blogs = Array.isArray(response.data.blogs) ? response.data.blogs : [];
        if (__DEV__) {
          console.log('📢 Promo Carousel - Blogs received:', blogs.length);
        }
        setPromos(blogs);
      } else if (response.data?.blogs) {
        // Fallback: if response structure is different
        const blogs = Array.isArray(response.data.blogs) ? response.data.blogs : [];
        if (__DEV__) {
          console.log('📢 Promo Carousel - Blogs received (fallback):', blogs.length);
        }
        setPromos(blogs);
      } else {
        if (__DEV__) {
          console.warn('📢 Promo Carousel - No blogs in response. Response:', response.data);
        }
        setPromos([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading promos:', error);
      if (__DEV__) {
        console.error('❌ Error details:', error.response?.data || error.message);
        console.error('❌ Error status:', error.response?.status);
      }
      setPromos([]);
    } finally {
      // Always clear loading if we are currently loading.
      // (Focus/foreground refresh can run while initial load is in-flight.)
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2563EB" />
      </View>
    );
  }

  if (promos.length === 0) {
    if (__DEV__) {
      console.log('📢 Promo Carousel - No promos to display');
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No promos yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={PROMO_CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        pagingEnabled={false}
      >
        {promos.map((promo) => (
          <TouchableOpacity
            key={promo.id}
            style={[styles.promoCard, { width: PROMO_CARD_WIDTH }]}
            activeOpacity={0.9}
            onPress={() => onPromoPress?.(promo)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {/* Background Image */}
            {promo.image_url ? (
              <Image
                source={{ uri: getFullImageUrl(promo.image_url) }}
                style={styles.backgroundImage}
                resizeMode="cover"
                pointerEvents="none"
              />
            ) : (
              <View style={styles.imagePlaceholder} pointerEvents="none">
                <Text style={styles.placeholderText}>📢</Text>
              </View>
            )}
            
            {/* Black Tint Overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.tintOverlay}
              pointerEvents="none"
            />
            
            {/* Content Overlay */}
            <View style={styles.contentOverlay} pointerEvents="none">
              {/* Title */}
              <Text style={styles.promoTitle} numberOfLines={2}>
                {promo.title}
              </Text>
              
              {/* Description - Hide on small screens */}
              {!IS_SMALL_SCREEN && (
                <Text style={styles.promoDescription} numberOfLines={2}>
                  {promo.short_description}
                </Text>
              )}
              
              {/* Know More with Arrow */}
              <View style={styles.buttonContainer}>
                {/* Visual-only button; whole card is clickable to avoid nested touch issues on small screens */}
                <View style={styles.knowMoreButton}>
                  <Text style={styles.knowMoreText}>Know More</Text>
                  <ArrowRight size={20} color="#fff" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 36, // more breathing room below carousel (prevents shadow band look)
    marginHorizontal: 0, // Match other sections padding
  },
  emptyContainer: {
    marginTop: 20,
    marginBottom: 36,
    marginHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 0, // Remove padding to match other sections
    paddingLeft: HORIZONTAL_PADDING,
    paddingRight: HORIZONTAL_PADDING,
    paddingBottom: 6, // prevents carousel from feeling cramped at bottom
  },
  promoCard: {
    marginRight: CARD_SPACING,
    borderRadius: 20,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  imagePlaceholder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 64,
    opacity: 0.3,
  },
  tintOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 18,
    zIndex: 1,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 0,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  promoDescription: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
    marginBottom: 0,
    marginTop: 6,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonContainer: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  knowMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  knowMoreText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
