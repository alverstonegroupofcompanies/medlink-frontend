import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import API from '../api';
import { BlogCard } from '@/components/blog-card';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { ScreenSafeArea } from '@/components/screen-safe-area';

export default function HospitalBlogsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      const response = await API.get('/blogs');
      if (response.data.status) {
        setBlogs(response.data.blogs || []);
      }
    } catch (error: any) {
      console.error('Error loading blogs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBlogs();
  };

  const handleBlogPress = (blog: any) => {
    router.push({
      pathname: '/blog-detail',
      params: {
        blogId: blog.id.toString(),
        title: blog.title,
        description: blog.full_description,
        imageUrl: blog.image_url || '',
        date: blog.formatted_date,
        time: blog.formatted_time,
      },
    });
  };

  return (
    <ScreenSafeArea backgroundColor="#fff" statusBarStyle="dark-content">
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Our Blogs</Text>
          <View style={{ width: 24 }} />
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : blogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No blogs available</Text>
            <Text style={styles.emptySubtext}>Check back later for updates</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {blogs.map((blog) => (
              <BlogCard
                key={blog.id}
                blog={blog}
                onPress={() => handleBlogPress(blog)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
});

