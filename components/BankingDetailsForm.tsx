import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';
import API from '@/app/api';

interface BankingDetailsFormProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    bank_account_holder_name?: string;
    bank_account_number?: string;
    bank_ifsc_code?: string;
    bank_name?: string;
    bank_branch?: string;
    upi_id?: string;
  };
}

export const BankingDetailsForm: React.FC<BankingDetailsFormProps> = ({
  visible,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bank_account_holder_name: initialData?.bank_account_holder_name || '',
    bank_account_number: initialData?.bank_account_number || '',
    bank_ifsc_code: initialData?.bank_ifsc_code || '',
    bank_name: initialData?.bank_name || '',
    bank_branch: initialData?.bank_branch || '',
    upi_id: initialData?.upi_id || '',
  });

  const validateIFSC = (ifsc: string) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.bank_account_holder_name.trim()) {
      Alert.alert('Error', 'Please enter account holder name');
      return;
    }

    if (!formData.bank_account_number.trim()) {
      Alert.alert('Error', 'Please enter account number');
      return;
    }

    if (!formData.bank_ifsc_code.trim()) {
      Alert.alert('Error', 'Please enter IFSC code');
      return;
    }

    if (!validateIFSC(formData.bank_ifsc_code)) {
      Alert.alert('Error', 'Please enter a valid IFSC code (e.g., SBIN0001234)');
      return;
    }

    setLoading(true);

    try {
      const response = await API.post('/doctor/banking-details', {
        ...formData,
        bank_ifsc_code: formData.bank_ifsc_code.toUpperCase(),
      });

      if (response.data.success) {
        // Refresh wallet data first
        await onSuccess();
        
        // Close modal
        onClose();
        
        // Show success message after modal closes
        setTimeout(() => {
          Alert.alert('Success', 'Banking details saved successfully');
        }, 300);
      }
    } catch (error: any) {
      console.error('Save banking details error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to save banking details'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Banking Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.label}>Account Holder Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.bank_account_holder_name}
            onChangeText={(text) =>
              setFormData({ ...formData, bank_account_holder_name: text })
            }
            placeholder="Enter full name as per bank account"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Account Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.bank_account_number}
            onChangeText={(text) =>
              setFormData({ ...formData, bank_account_number: text })
            }
            placeholder="Enter account number"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />

          <Text style={styles.label}>IFSC Code *</Text>
          <TextInput
            style={styles.input}
            value={formData.bank_ifsc_code}
            onChangeText={(text) =>
              setFormData({ ...formData, bank_ifsc_code: text.toUpperCase() })
            }
            placeholder="e.g., SBIN0001234"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            maxLength={11}
          />

          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            value={formData.bank_name}
            onChangeText={(text) =>
              setFormData({ ...formData, bank_name: text })
            }
            placeholder="Enter bank name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Branch</Text>
          <TextInput
            style={styles.input}
            value={formData.bank_branch}
            onChangeText={(text) =>
              setFormData({ ...formData, bank_branch: text })
            }
            placeholder="Enter branch name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>UPI ID (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.upi_id}
            onChangeText={(text) =>
              setFormData({ ...formData, upi_id: text })
            }
            placeholder="e.g., yourname@paytm"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Save Banking Details</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            * Required fields. Your banking details are encrypted and secure.
          </Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
});
