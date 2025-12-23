import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock } from 'lucide-react-native';

interface StopwatchTimerProps {
  startTime: string; // ISO string
  endTime?: string | null; // Optional ISO string
}

export function StopwatchTimer({ startTime, endTime }: StopwatchTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Safe parse function for SQL timestamp format (YYYY-MM-DD HH:mm:ss)
    const parseDate = (dateStr: string) => {
      if (!dateStr) return 0;
      // Replace space with T for ISO format compliance on mobile
      const safeStr = dateStr.replace(' ', 'T'); 
      return new Date(safeStr).getTime();
    };

    const start = parseDate(startTime);
    
    // If endTime is provided, just show the fixed duration
    if (endTime) {
      const end = parseDate(endTime);
      setElapsed(Math.max(0, end - start));
      return;
    }
    
    // Update immediately
    const updateElapsed = () => {
      const now = new Date().getTime();
      setElapsed(Math.max(0, now - start));
    };
    
    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

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
