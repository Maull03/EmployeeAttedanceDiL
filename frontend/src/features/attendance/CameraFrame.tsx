/**
 * CameraFrame — tampilan kamera dengan overlay oval untuk layar scan.
 */
import { View, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import type { RefObject } from 'react';
import type { CameraView as CameraViewType } from 'expo-camera';

interface CameraFrameProps {
  cameraRef: RefObject<CameraViewType | null>;
}

export function CameraFrame({ cameraRef }: CameraFrameProps) {
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        mode="video"
      />
      {/* Overlay oval bingkai wajah */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.ovalBorder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ovalBorder: {
    width: '70%',
    height: '75%',
    borderRadius: 200,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    borderStyle: 'dashed',
  },
});
