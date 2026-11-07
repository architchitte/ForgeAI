import React, { useState } from 'react';
import { Modal, View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { CloseIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';

interface ScreenshotViewerProps {
  uri: string | null;
  label: string;
  visible: boolean;
  onClose: () => void;
}

/** Full-screen screenshot viewer; the whole image is always visible (contain). */
export const ScreenshotViewer: React.FC<ScreenshotViewerProps> = ({
  uri,
  label,
  visible,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [failed, setFailed] = useState<boolean>(false);

  return (
    <Modal
      visible={visible && !!uri}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={() => {
        setLoading(true);
        setFailed(false);
      }}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
          <View style={styles.header}>
            <Text style={styles.label}>{label}</Text>
            <PressableScale
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Close screenshot"
            >
              <CloseIcon size={18} color="#FFFFFF" />
            </PressableScale>
          </View>

          <View style={styles.imageArea}>
            {uri && !failed && (
              <Image
                source={{ uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
                onLoadEnd={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setFailed(true);
                }}
                accessibilityLabel={label}
              />
            )}
            {loading && !failed && <ActivityIndicator size="large" color={STITCH_COLORS.outline} />}
            {failed && <Text style={styles.failedText}>This screenshot could not be loaded.</Text>}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.97)',
  },
  safe: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageArea: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedText: {
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
});
