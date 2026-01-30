import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { PASSWORD_MIN_LENGTH } from '@/utils/passwordValidation';

interface PasswordRulesInlineProps {
  password: string;
}

function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      {ok ? <CheckCircle size={16} color="#16A34A" /> : <XCircle size={16} color="#DC2626" />}
      <Text style={[styles.ruleText, !ok && styles.ruleTextBad]}>{text}</Text>
    </View>
  );
}

export function PasswordRulesInline({ password }: PasswordRulesInlineProps) {
  const pwd = password ?? '';
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
  const hasMinLen = pwd.length >= PASSWORD_MIN_LENGTH;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Password must:</Text>
      <RuleRow ok={hasLower} text="Have at least one lowercase letter" />
      <RuleRow ok={hasUpper} text="Have at least one uppercase letter" />
      <RuleRow ok={hasNumber} text="Have at least one number" />
      <RuleRow ok={hasSymbol} text="Have at least one symbol (e.g., @$!%*?&)" />
      <RuleRow ok={hasMinLen} text={`Be at least ${PASSWORD_MIN_LENGTH} characters`} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 18,
  },
  ruleTextBad: {
    color: '#991B1B',
  },
});

