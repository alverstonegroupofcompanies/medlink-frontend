import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Lock, Eye, CheckCircle } from 'lucide-react-native';
import { PrimaryColors, NeutralColors } from '@/constants/theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';

export default function TermsAndConditionsScreen() {
  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={PrimaryColors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Privacy Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={24} color={PrimaryColors.main} />
              <Text style={styles.sectionTitle}>Privacy & Data Protection</Text>
            </View>
            
            <View style={styles.paragraph}>
              <Text style={styles.paragraphTitle}>1. Doctor Contact Information Privacy</Text>
              <Text style={styles.paragraphText}>
                To protect the privacy and security of doctors on our platform, the following rules apply:
              </Text>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    <Text style={styles.bold}>Pending Applications:</Text> When doctors apply to job requirements, their full mobile phone numbers are <Text style={styles.bold}>masked</Text> and only visible as partially hidden (e.g., ******6770) to protect their privacy.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    <Text style={styles.bold}>Approved Applications Only:</Text> Full mobile phone numbers are only revealed to hospitals <Text style={styles.bold}>after</Text> the hospital approves the doctor's application. This ensures that contact information is only shared with hospitals that have officially accepted the doctor.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    <Text style={styles.bold}>Rejected Applications:</Text> If a hospital rejects a doctor's application, the phone number remains masked and is never revealed.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    This privacy measure protects doctors from unsolicited contact and ensures their personal information is only shared with hospitals that have committed to working with them.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Data Usage Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Lock size={24} color={PrimaryColors.main} />
              <Text style={styles.sectionTitle}>Data Usage & Sharing</Text>
            </View>
            
            <View style={styles.paragraph}>
              <Text style={styles.paragraphTitle}>2. Information Sharing Policies</Text>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    Profile information, qualifications, and professional details may be visible to hospitals when doctors apply, but contact information (phone numbers) is protected until approval.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    Once an application is approved, the hospital gains access to the doctor's full contact information to facilitate job coordination.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    Doctors consent to this information sharing policy by using our platform and submitting applications.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* User Responsibilities */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CheckCircle size={24} color={PrimaryColors.main} />
              <Text style={styles.sectionTitle}>User Responsibilities</Text>
            </View>
            
            <View style={styles.paragraph}>
              <Text style={styles.paragraphTitle}>3. Platform Usage Guidelines</Text>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    All users must provide accurate information during registration and profile updates.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    Hospitals must only use contact information for legitimate job-related communication after approval.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    Misuse of contact information or harassment is strictly prohibited and may result in account suspension.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Security Measures */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Eye size={24} color={PrimaryColors.main} />
              <Text style={styles.sectionTitle}>Security & Protection</Text>
            </View>
            
            <View style={styles.paragraph}>
              <Text style={styles.paragraphTitle}>4. Our Commitment to Privacy</Text>
              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    We implement technical and organizational measures to protect user data and ensure secure information sharing.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    Phone number masking is automatically enforced by our system and cannot be bypassed.
                  </Text>
                </View>
                <View style={styles.bulletItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.bulletText}>
                    We monitor platform usage to detect and prevent misuse of contact information.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Acceptance */}
          <View style={styles.section}>
            <View style={styles.paragraph}>
              <Text style={styles.paragraphTitle}>5. Acceptance of Terms</Text>
              <Text style={styles.paragraphText}>
                By using Alverstone MedLink, you acknowledge that you have read, understood, and agree to these Terms & Conditions, including our privacy protection measures for contact information.
              </Text>
              <Text style={styles.paragraphText}>
                These terms may be updated from time to time, and continued use of the platform constitutes acceptance of any modifications.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last Updated: November 24, 2025
            </Text>
            <Text style={styles.footerText}>
              Alverstone MedLink - Connecting Healthcare Professionals
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: NeutralColors.background,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  paragraph: {
    marginBottom: 20,
  },
  paragraphTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginBottom: 12,
  },
  paragraphText: {
    fontSize: 15,
    lineHeight: 24,
    color: NeutralColors.textPrimary,
    marginBottom: 12,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 16,
    color: PrimaryColors.main,
    marginRight: 12,
    marginTop: 2,
    fontWeight: '700',
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: NeutralColors.textPrimary,
  },
  bold: {
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: NeutralColors.textTertiary,
    marginBottom: 8,
    textAlign: 'center',
  },
});



