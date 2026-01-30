import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { HintPopover } from '@/components/HintPopover';
import { PASSWORD_MIN_LENGTH } from '@/utils/passwordValidation';

interface PasswordRulesHintProps {
  visible: boolean;
  password: string;
  onClose: () => void;
}

function RuleRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      {ok ? <CheckCircle size={18} color="#16A34A" /> : <XCircle size={18} color="#DC2626" />}
      <Text style={[styles.ruleText, !ok && styles.ruleTextBad]}>{text}</Text>
    </View>
  );
}

export function PasswordRulesHint({ visible, password, onClose }: PasswordRulesHintProps) {
  const pwd = password ?? '';
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
  const hasMinLen = pwd.length >= PASSWORD_MIN_LENGTH;

  return (
    <HintPopover visible={visible} title="Password must:" onClose={onClose}>
      <RuleRow ok={hasLower} text="Have at least one lowercase letter" />
      <RuleRow ok={hasUpper} text="Have at least one uppercase letter" />
      <RuleRow ok={hasNumber} text="Have at least one number" />
      <RuleRow ok={hasSymbol} text="Have at least one symbol (e.g., @$!%*?&)" />
      <RuleRow ok={hasMinLen} text={`Be at least ${PASSWORD_MIN_LENGTH} characters`} />
      <Text style={styles.tip}>Tip: tap the hint anytime while typing.</Text>
    </HintPopover>
  );
}

const styles = StyleSheet.create({
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
    lineHeight: 20,
  },
  ruleTextBad: {
    color: '#991B1B',
  },
  tip: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});

