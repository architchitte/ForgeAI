import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { ImageIcon, MonitorIcon, SmartphoneIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { DesktopFrame, PhoneFrame } from './ScreenshotFrames';
import { ScreenshotViewer } from './ScreenshotViewer';
import { ScreenshotManagerModal } from './ScreenshotManagerModal';
import { useProjectScreenshot } from '../../hooks/useProjectScreenshot';
import { getScreenshotUrl } from '../../services/screenshots';
import { SCREENSHOT_SPECS } from '../../types/screenshot';

interface ProjectScreenshotShowcaseProps {
  repositoryId: string;
  appName: string;
  /** Owner controls are shown only when true (RLS enforces it regardless). */
  isOwner: boolean;
}

/**
 * Detail-page screenshot: wide browser frame for desktop, centred phone frame
 * for mobile; tap to open the full viewer. Owners get Replace / Remove (or
 * Add when there is none). Viewers see nothing when there's no screenshot.
 */
export const ProjectScreenshotShowcase: React.FC<ProjectScreenshotShowcaseProps> = ({
  repositoryId,
  appName,
  isOwner,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const { screenshot, loading, busy, save, remove } = useProjectScreenshot(repositoryId);
  const [viewerOpen, setViewerOpen] = useState<boolean>(false);
  const [managerOpen, setManagerOpen] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  const uri = screenshot ? getScreenshotUrl(screenshot.storage_path) : null;
  useEffect(() => setFailed(false), [uri]);

  if (loading) return null; // no placeholder flash for the many projects without one
  if (!screenshot && !isOwner) return null;

  const handleUpload = async (
    ...args: Parameters<typeof save>
  ): Promise<string | null> => {
    const { error, warning } = await save(...args);
    if (error) return error;
    setManagerOpen(false);
    if (warning) Alert.alert('Screenshot updated', warning);
    return null;
  };

  const confirmRemove = () => {
    if (busy) return;
    Alert.alert(
      'Remove screenshot?',
      'Your project will be shown without a screenshot. You can add a new one at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error, warning } = await remove();
            if (error) Alert.alert('Could not remove screenshot', error);
            else if (warning) Alert.alert('Screenshot removed', warning);
          },
        },
      ]
    );
  };

  const manager = (
    <ScreenshotManagerModal
      visible={managerOpen}
      existing={screenshot}
      busy={busy}
      onClose={() => setManagerOpen(false)}
      onUpload={handleUpload}
    />
  );

  // Owner, no screenshot yet: one unobtrusive "add" row.
  if (!screenshot) {
    return (
      <View style={styles.block}>
        <PressableScale
          style={styles.addRow}
          onPress={() => setManagerOpen(true)}
          activeOpacity={0.8}
          accessibilityLabel="Add a project screenshot"
        >
          <ImageIcon size={15} color="#EDEDED" />
          <View style={styles.addTextCol}>
            <Text style={styles.addTitle}>Add a project screenshot</Text>
            <Text style={styles.addHint}>Optional · one desktop or mobile screenshot</Text>
          </View>
        </PressableScale>
        {manager}
      </View>
    );
  }

  const spec = SCREENSHOT_SPECS[screenshot.screenshot_type];
  const isDesktop = screenshot.screenshot_type === 'desktop';
  const phoneWidth = Math.min(240, Math.round(windowWidth * 0.58));

  const ownerActions = isOwner && (
    <View style={styles.ownerActions}>
      {busy ? (
        <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
      ) : (
        <>
          <PressableScale
            onPress={() => setManagerOpen(true)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityLabel="Replace screenshot"
          >
            <Text style={styles.ownerActionText}>Replace</Text>
          </PressableScale>
          <Text style={styles.ownerActionDivider}>·</Text>
          <PressableScale
            onPress={confirmRemove}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            accessibilityLabel="Remove screenshot"
          >
            <Text style={styles.ownerActionText}>Remove</Text>
          </PressableScale>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.block}>
      <View style={styles.labelRow}>
        <View style={styles.previewChip}>
          {isDesktop ? (
            <MonitorIcon size={11} color="#A1A1A1" />
          ) : (
            <SmartphoneIcon size={11} color="#A1A1A1" />
          )}
          <Text style={styles.previewChipText}>{spec.previewLabel}</Text>
        </View>
        {ownerActions}
      </View>

      {failed ? (
        // Never show a broken image; owners still get the actions above.
        isOwner ? (
          <Text style={styles.failedText}>The screenshot could not be loaded. Try replacing it.</Text>
        ) : null
      ) : isDesktop ? (
        <DesktopFrame
          uri={uri!}
          onPress={() => setViewerOpen(true)}
          onError={() => setFailed(true)}
          accessibilityLabel={`${appName} desktop screenshot`}
        />
      ) : (
        <View style={styles.phoneStage}>
          <PhoneFrame
            uri={uri!}
            width={phoneWidth}
            onPress={() => setViewerOpen(true)}
            onError={() => setFailed(true)}
            accessibilityLabel={`${appName} mobile screenshot`}
          />
        </View>
      )}

      <ScreenshotViewer
        uri={uri}
        label={spec.previewLabel}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
      {manager}
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    minHeight: 22,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  previewChipText: {
    fontSize: 10.5,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerActionText: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  ownerActionDivider: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#454545',
  },
  phoneStage: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#171717',
    backgroundColor: '#050505',
  },
  failedText: {
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#333333',
    backgroundColor: '#050505',
  },
  addTextCol: {
    flex: 1,
  },
  addTitle: {
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  addHint: {
    marginTop: 1,
    fontSize: 11.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
});
