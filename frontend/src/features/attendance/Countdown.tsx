/**
 * Countdown — penghitung mundur (3-2-1 preparing, atau bar recording).
 */
import { View, Text, StyleSheet } from 'react-native';

interface CountdownProps {
  value: number;
  /** 'prepare' = angka besar, 'recording' = bar progres */
  mode: 'prepare' | 'recording';
  total?: number;
}

export function Countdown({ value, mode, total = 5 }: CountdownProps) {
  if (mode === 'prepare') {
    return (
      <View style={styles.prepareContainer}>
        <Text style={styles.prepareNumber}>{value}</Text>
      </View>
    );
  }

  const progress = Math.max(0, Math.min(1, value / total));

  return (
    <View style={styles.recordingContainer}>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.recordingText}>
        Merekam… {value}s
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  prepareContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  prepareNumber: {
    fontSize: 96,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  recordingContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#ef4444',
    borderRadius: 4,
  },
  recordingText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
});
