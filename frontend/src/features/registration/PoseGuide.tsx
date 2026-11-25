import { View, Text, StyleSheet } from 'react-native';
import type { PoseCapture } from './useFaceCapture';

interface PoseGuideProps {
  captures: PoseCapture[];
  activePoseIndex: number;
  onSelectPose: (index: number) => void;
}

const POSE_ICONS: Record<string, string> = {
  'Depan': '😐',
  'Sedikit ke kiri': '😶',
  'Sedikit ke kanan': '😶',
  'Sedikit ke atas': '🙂',
  'Sedikit ke bawah': '🙄',
};

export function PoseGuide({ captures, activePoseIndex, onSelectPose }: PoseGuideProps) {
  return (
    <View style={styles.container}>
      {captures.map((cap, index) => {
        const isActive = index === activePoseIndex;
        const isCaptured = cap.uri !== null;
        const isFailed = cap.ok === false;

        let borderColor = '#d1d5db';
        if (isActive) borderColor = '#2563eb';
        else if (isFailed) borderColor = '#dc2626';
        else if (cap.ok === true) borderColor = '#16a34a';
        else if (isCaptured) borderColor = '#f59e0b';

        return (
          <View key={cap.pose} style={styles.poseItem}>
            <View
              style={[
                styles.poseCircle,
                { borderColor },
                isActive && styles.poseCircleActive,
              ]}
            >
              <Text style={styles.poseIcon}>{POSE_ICONS[cap.pose] ?? '😐'}</Text>
              {isCaptured && (
                <View
                  style={[
                    styles.statusDot,
                    isFailed
                      ? styles.dotFail
                      : cap.ok === true
                        ? styles.dotOk
                        : styles.dotPending,
                  ]}
                >
                  <Text style={styles.dotText}>
                    {isFailed ? '✗' : cap.ok === true ? '✔' : '●'}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.poseLabel, isActive && styles.poseLabelActive]}
              numberOfLines={2}
            >
              {cap.pose}
            </Text>
            {isFailed && cap.reason && (
              <Text style={styles.poseError} numberOfLines={2}>
                {friendlyReason(cap.reason)}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function friendlyReason(reason: string): string {
  const map: Record<string, string> = {
    NO_FACE: 'Wajah tidak terdeteksi',
    MULTIPLE_FACES: 'Lebih dari 1 wajah',
    FACE_TOO_SMALL: 'Wajah terlalu kecil',
    IMAGE_BLURRY: 'Gambar buram',
  };
  return map[reason] ?? reason;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  poseItem: {
    alignItems: 'center',
    width: 60,
  },
  poseCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2.5,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  poseCircleActive: {
    backgroundColor: '#eff6ff',
  },
  poseIcon: { fontSize: 22 },
  statusDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotOk: { backgroundColor: '#16a34a' },
  dotFail: { backgroundColor: '#dc2626' },
  dotPending: { backgroundColor: '#f59e0b' },
  dotText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  poseLabel: { fontSize: 10, color: '#6b7280', textAlign: 'center' },
  poseLabelActive: { color: '#2563eb', fontWeight: '700' },
  poseError: { fontSize: 9, color: '#dc2626', textAlign: 'center', marginTop: 2 },
});
