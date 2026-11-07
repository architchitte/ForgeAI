import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import {
  ImageIcon,
  MonitorIcon,
  RefreshIcon,
  SmartphoneIcon,
  TrashIcon,
} from '../common/AppIcons';
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
  // Owner controls stay hidden until the owner holds the image.
  const [actionsVisible, setActionsVisible] = useState<boolean>(false);

  const uri = screenshot ? getScreenshotUrl(screenshot.storage_path) : null;
  useEffect(() => setFailed(false), [uri]);

  // Revealed controls tuck away again after a few idle seconds (not while busy).
  useEffect(() => {
    if (!actionsVisible || busy) return;
    const t = setTimeout(() => setActionsVisible(false), ACTIONS_AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [actionsVisible, busy]);

  if (loading) return null; // no placeholder flash for the many projects without one
  if (!screenshot && !isOwner) return null;

  const handleUpload = async (
    ...args: Parameters<typeof save>
  ): Promise<string | null> => {
    const { error, warning } = await save(...args);
    if (error) return error;
    setManagerOpen(false);
    setActionsVisible(false);
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
            setActionsVisible(false);
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

  const ownerActions = (
    <View style={styles.ownerActions}>
      {busy ? (
        <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
      ) : (
        <>
          <PressableScale
            style={styles.ownerIconButton}
            onPress={() => {
              setActionsVisible(false);
              setManagerOpen(true);
            }}
            activeOpacity={0.6}
            pressedScale={0.9}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityLabel="Replace screenshot"
          >
            <RefreshIcon size={14} color="#EDEDED" />
          </PressableScale>
          <PressableScale
            style={styles.ownerIconButton}
            onPress={confirmRemove}
            activeOpacity={0.6}
            pressedScale={0.9}
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            accessibilityLabel="Remove screenshot"
          >
            <TrashIcon size={14} color="#EDEDED" />
          </PressableScale>
        </>
      )}
    </View>
  );

  // Tap opens the viewer (or dismisses revealed controls); owners hold to
  // reveal Replace / Remove over the image.
  const frameHandlers = {
    onPress: () => (actionsVisible ? setActionsVisible(false) : setViewerOpen(true)),
    onLongPress: isOwner && !busy ? () => setActionsVisible(true) : undefined,
    longPressLabel: 'Show replace and remove options',
    onError: () => setFailed(true),
    overlay:
      isOwner && (actionsVisible || busy) ? (
        <View style={styles.actionsOverlay} pointerEvents="box-none">
          {ownerActions}
        </View>
      ) : undefined,
  };

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
          {/* A broken image can't be held, so owners get the buttons directly. */}
        {isOwner && failed && ownerActions}
        {isOwner && !failed && !actionsVisible && (
          <Text style={styles.holdHint}>Hold image to edit</Text>
        )}
      </View>

      {failed ? (
        // Never show a broken image.
        isOwner ? (
          <Text style={styles.failedText}>The screenshot could not be loaded. Try replacing it.</Text>
        ) : null
      ) : isDesktop ? (
        <DesktopFrame
          uri={uri!}
          {...frameHandlers}
          accessibilityLabel={`${appName} desktop screenshot`}
        />
      ) : (
        <View style={styles.phoneStage}>
          <PhoneFrame
            uri={uri!}
            width={phoneWidth}
            {...frameHandlers}
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

const ACTIONS_AUTO_HIDE_MS = 5000;

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
    gap: 8,
  },
  holdHint: {
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: '#525252',
  },
  actionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 8,
  },
  ownerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
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
