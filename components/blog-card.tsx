import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Calendar, Clock, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32; // 16px padding on each side
const IMAGE_HEIGHT = 200;
const CARD_HEIGHT = IMAGE_HEIGHT + 180; // Fixed height for consistency
const IS_SMALL_SCREEN = width < 400; // Hide short summary on small screens

interface BlogCardProps {
  blog: {
    id: number;
    title: string;
    short_description: string;
    full_description: string;
    image_url: string | null;
    formatted_date: string;
    formatted_time: string;
    created_at: string;
  };
  onPress: () => void;
}

export function BlogCard({ blog, onPress }: BlogCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Blog Image */}
      {blog.image_url ? (
        <Image
          source={{ uri: blog.image_url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>No Image</Text>
        </View>
      )}

      {/* Card Content */}
      <View style={styles.content}>
        {/* Date and Time */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.metaText}>{blog.formatted_date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={14} color="#6B7280" />
            <Text style={styles.metaText}>{blog.formatted_time}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {blog.title}
        </Text>

        {/* Description - Hide short description on small screens */}
        {(!IS_SMALL_SCREEN || expanded) && (
          <Text style={styles.description} numberOfLines={expanded ? 10 : 3}>
            {expanded ? blog.full_description : blog.short_description}
          </Text>
        )}

        {/* Read More Button */}
        {!expanded && (
          <TouchableOpacity
            style={styles.readMoreButton}
            onPress={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
          >
            <Text style={styles.readMoreText}>Read More</Text>
            <ChevronRight size={16} color="#2563EB" />
          </TouchableOpacity>
        )}

        {expanded && (
          <TouchableOpacity
            style={styles.readMoreButton}
            onPress={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
          >
            <Text style={styles.readMoreText}>Show Less</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  image: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  content: {
    padding: 16,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
    flex: 1,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: 8,
  },
  readMoreText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    marginRight: 4,
  },
});

