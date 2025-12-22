import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';

interface StopwatchTimerProps {
  startTime: string; // ISO string
}

export function StopwatchTimer({ startTime }: StopwatchTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    
    // Update immediately
    const now = new Date().getTime();
    setElapsed(Math.max(0, now - start));

    const interval = setInterval(() => {
      const currentNow = new Date().getTime();
      setElapsed(Math.max(0, currentNow - start));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <View style={styles.container}>
      <Clock size={20} color="#fff" style={styles.icon} />
      <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669', // Success green
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  icon: {
    marginRight: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'], // Monospaced numbers
  },
});
