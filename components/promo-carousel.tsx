import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../app/api';
import { getFullImageUrl } from '@/utils/url-helper';
import { ArrowRight } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Calculate width - doubled from previous size
// Horizontal padding: 20px on each side = 40px total (matches Spacing.lg)
const HORIZONTAL_PADDING = 20; // Spacing.lg equivalent
const CARD_SPACING = 16;
// Double the previous width: previous was (SCREEN_WIDTH - 40 - 32) / 3, now double that
const BASE_CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_SPACING * 2) / 3;
const PROMO_CARD_WIDTH = BASE_CARD_WIDTH * 2; // Double the width
const CARD_HEIGHT = 200;

interface PromoCarouselProps {
  onPromoPress?: (blog: any) => void;
}

export default function PromoCarousel({ onPromoPress }: PromoCarouselProps) {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    try {
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
    return null; // Don't show anything if no promos
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
          >
            {/* Background Image */}
            {promo.image_url ? (
              <Image
                source={{ uri: getFullImageUrl(promo.image_url) }}
                style={styles.backgroundImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>📢</Text>
              </View>
            )}
            
            {/* Black Tint Overlay */}
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.tintOverlay}
            />
            
            {/* Content Overlay */}
            <View style={styles.contentOverlay}>
              {/* Title */}
              <Text style={styles.promoTitle} numberOfLines={2}>
                {promo.title}
              </Text>
              
              {/* Description */}
              <Text style={styles.promoDescription} numberOfLines={2}>
                {promo.short_description}
              </Text>
              
              {/* Know More with Arrow */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.knowMoreButton}
                  onPress={() => onPromoPress?.(promo)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.knowMoreText}>Know More</Text>
                  <ArrowRight size={20} color="#fff" />
                </TouchableOpacity>
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
    marginVertical: 20,
    marginHorizontal: 0, // Match other sections padding
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 0, // Remove padding to match other sections
    paddingLeft: HORIZONTAL_PADDING,
    paddingRight: HORIZONTAL_PADDING,
  },
  promoCard: {
    marginRight: CARD_SPACING,
    borderRadius: 20,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    zIndex: 1,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  promoDescription: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonContainer: {
    alignSelf: 'flex-start',
  },
  knowMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
  },
  knowMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
