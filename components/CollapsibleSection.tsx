import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { ModernCard } from './modern-card';
import { ModernColors, Spacing, BorderRadius } from '@/constants/modern-theme';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  iconColor?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onPress?: () => void;
}

export function CollapsibleSection({
  title,
  subtitle,
  icon: Icon,
  iconColor = ModernColors.primary.main,
  children,
  defaultExpanded = false,
  onPress,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [animation] = useState(new Animated.Value(defaultExpanded ? 1 : 0));

  const toggle = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.timing(animation, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsExpanded(!isExpanded);
    if (onPress) {
      onPress();
    }
  };

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const maxHeightInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1000],
  });

  return (
    <ModernCard variant="elevated" padding="md" style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
            <Icon size={20} color={iconColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && (
              <Text style={styles.subtitle}>{subtitle}</Text>
            )}
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <ChevronDown size={20} color={ModernColors.text.secondary} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.content,
          {
            maxHeight: maxHeightInterpolate,
            opacity: animation,
          },
        ]}
      >
        {isExpanded && (
          <View style={styles.contentInner}>
            {children}
          </View>
        )}
      </Animated.View>
    </ModernCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: ModernColors.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: ModernColors.text.secondary,
  },
  content: {
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  contentInner: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ModernColors.border,
  },
});
