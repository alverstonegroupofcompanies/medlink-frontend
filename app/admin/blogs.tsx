import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api';
import { Plus, Edit, Trash2, Eye, EyeOff, ArrowLeft, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function AdminBlogs() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    short_description: '',
    full_description: '',
    is_published: true,
  });
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkAuth();
    loadBlogs();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  };

  const loadBlogs = async () => {
    try {
      const response = await API.get('/admin/blogs');
      if (response.data.status) {
        setBlogs(response.data.blogs || []);
      }
    } catch (error: any) {
      console.error('Error loading blogs:', error);
      Alert.alert('Error', 'Failed to load blogs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBlogs();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.short_description || !formData.full_description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setUploading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('short_description', formData.short_description);
      formDataToSend.append('full_description', formData.full_description);
      formDataToSend.append('is_published', formData.is_published ? '1' : '0');

      if (image) {
        const filename = image.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formDataToSend.append('image', {
          uri: image,
          name: filename || 'blog-image.jpg',
          type,
        } as any);
      }

      if (editingBlog) {
        await API.put(`/admin/blogs/${editingBlog.id}`, formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Success', 'Blog updated successfully');
      } else {
        await API.post('/admin/blogs', formDataToSend, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert('Success', 'Blog created successfully');
      }

      setShowForm(false);
      setEditingBlog(null);
      setFormData({
        title: '',
        short_description: '',
        full_description: '',
        is_published: true,
      });
      setImage(null);
      loadBlogs();
    } catch (error: any) {
      console.error('Error saving blog:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save blog');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (blog: any) => {
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      short_description: blog.short_description,
      full_description: blog.full_description,
      is_published: blog.is_published,
    });
    setImage(blog.image_url || null);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Blog', 'Are you sure you want to delete this blog?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.delete(`/admin/blogs/${id}`);
            Alert.alert('Success', 'Blog deleted successfully');
            loadBlogs();
          } catch (error: any) {
            Alert.alert('Error', 'Failed to delete blog');
          }
        },
      },
    ]);
  };

  const togglePublish = async (blog: any) => {
    try {
      await API.put(`/admin/blogs/${blog.id}`, {
        is_published: !blog.is_published,
      });
      loadBlogs();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update blog status');
    }
  };

  if (showForm) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            setShowForm(false);
            setEditingBlog(null);
            setFormData({
              title: '',
              short_description: '',
              full_description: '',
              is_published: true,
            });
            setImage(null);
          }}>
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingBlog ? 'Edit Blog' : 'Create Blog'}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Enter blog title"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Short Description * (Max 500 chars)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.short_description}
              onChangeText={(text) => setFormData({ ...formData, short_description: text })}
              placeholder="Short description for card preview"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            <Text style={styles.charCount}>
              {formData.short_description.length}/500
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { minHeight: 150 }]}
              value={formData.full_description}
              onChangeText={(text) => setFormData({ ...formData, full_description: text })}
              placeholder="Full blog description"
              multiline
              numberOfLines={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blog Image</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <ImageIcon size={40} color="#9CA3AF" />
                  <Text style={styles.imagePlaceholderText}>Tap to select image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setFormData({ ...formData, is_published: !formData.is_published })}
            >
              <View style={[styles.checkboxBox, formData.is_published && styles.checkboxChecked]}>
                {formData.is_published && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Publish immediately</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {editingBlog ? 'Update Blog' : 'Create Blog'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blog Management</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Plus size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {blogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blogs yet</Text>
              <TouchableOpacity style={styles.createButton} onPress={() => setShowForm(true)}>
                <Plus size={20} color="#fff" />
                <Text style={styles.createButtonText}>Create First Blog</Text>
              </TouchableOpacity>
            </View>
          ) : (
            blogs.map((blog) => (
              <View key={blog.id} style={styles.blogCard}>
                {blog.image_url && (
                  <Image source={{ uri: blog.image_url }} style={styles.blogImage} />
                )}
                <View style={styles.blogContent}>
                  <View style={styles.blogHeader}>
                    <Text style={styles.blogTitle} numberOfLines={2}>
                      {blog.title}
                    </Text>
                    <TouchableOpacity onPress={() => togglePublish(blog)}>
                      {blog.is_published ? (
                        <Eye size={20} color="#10B981" />
                      ) : (
                        <EyeOff size={20} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.blogDate}>
                    {new Date(blog.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.blogDescription} numberOfLines={2}>
                    {blog.short_description}
                  </Text>
                  <View style={styles.blogActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(blog)}
                    >
                      <Edit size={16} color="#2563EB" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDelete(blog.id)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  blogCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  blogImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  blogContent: {
    padding: 16,
  },
  blogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  blogTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  blogDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  blogDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
    lineHeight: 20,
  },
  blogActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },
  imagePicker: {
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

