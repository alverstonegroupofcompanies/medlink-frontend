import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { VibrantColors, VibrantShadows } from '@/constants/vibrant-theme';

interface Props {
  children: React.ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ErrorBoundary caught an error:', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <AlertCircle size={32} color={VibrantColors.error.main} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We ran into an issue loading this section. Please try again.
            </Text>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <RefreshCw size={16} color="#fff" />
              <Text style={styles.buttonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: VibrantColors.neutral.white,
    borderRadius: 20,
    ...VibrantShadows.soft,
  },
  title: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: VibrantColors.neutral.gray900,
  },
  message: {
    marginTop: 8,
    textAlign: 'center',
    color: VibrantColors.neutral.gray600,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: VibrantColors.primary.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
});
















