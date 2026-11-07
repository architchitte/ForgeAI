import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { CloseIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { FadeInView } from '../animation/FadeInView';
import { ScreenshotPickerSection } from './ScreenshotPickerSection';
import { PickedScreenshot, ProjectScreenshot, ScreenshotType } from '../../types/screenshot';

interface ScreenshotManagerModalProps {
  visible: boolean;
  existing: ProjectScreenshot | null;
  busy: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onUpload: (type: ScreenshotType, picked: PickedScreenshot) => Promise<string | null>;
}

/** Owner-only sheet to add or replace the project's single screenshot. */
export const ScreenshotManagerModal: React.FC<ScreenshotManagerModalProps> = ({
  visible,
  existing,
  busy,
  onClose,
  onUpload,
}) => {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ScreenshotType>(existing?.screenshot_type ?? 'desktop');
  const [picked, setPicked] = useState<PickedScreenshot | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fresh state each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setType(existing?.screenshot_type ?? 'desktop');
    setPicked(null);
    setUploadError(null);
  }, [visible, existing?.screenshot_type]);

  const handleUpload = async () => {
    if (!picked || busy) return;
    setUploadError(null);
    const err = await onUpload(type, picked);
    if (err) setUploadError(err);
  };

  const handleClose = () => {
    if (!busy) onClose();
  };

  const isReplace = !!existing;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <FadeInView offset={48} style={[styles.sheet, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{isReplace ? 'Replace Screenshot' : 'Add Screenshot'}</Text>
              <Text style={styles.subtitle}>
                {isReplace
                  ? 'Your current screenshot stays live until the new one finishes uploading.'
                  : 'Show the community what your project looks like.'}
              </Text>
            </View>
            <PressableScale
              style={[styles.closeButton, busy && styles.disabled]}
              onPress={handleClose}
              disabled={busy}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              accessibilityLabel="Close"
            >
              <CloseIcon size={16} color="#FFFFFF" />
            </PressableScale>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ScreenshotPickerSection
              type={type}
              onTypeChange={setType}
              picked={picked}
              onPickedChange={(p) => {
                setPicked(p);
                setUploadError(null);
              }}
              disabled={busy}
              hideHeading
            />
            {uploadError && <Text style={styles.errorText}>{uploadError}</Text>}
          </ScrollView>

          <PressableScale
            style={[styles.uploadButton, (!picked || busy) && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={!picked || busy}
            activeOpacity={0.85}
            pressedScale={0.98}
            accessibilityState={{ disabled: !picked || busy, busy }}
          >
            {busy ? (
              <View style={styles.uploadingRow}>
                <ActivityIndicator size="small" color="#000000" />
                <Text style={styles.uploadButtonText}>Uploading…</Text>
              </View>
            ) : (
              <Text style={styles.uploadButtonText}>
                {isReplace ? 'Upload & Replace' : 'Upload Screenshot'}
              </Text>
            )}
          </PressableScale>
        </FadeInView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.error,
  },
  uploadButton: {
    height: 46,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.35,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  disabled: {
    opacity: 0.4,
  },
});
