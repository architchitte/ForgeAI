import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import {
  AlertTriangleIcon,
  ImageIcon,
  MonitorIcon,
  SmartphoneIcon,
} from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { DesktopFrame, PhoneFrame } from './ScreenshotFrames';
import {
  getOrientation,
  getOrientationMismatch,
  pickScreenshotImage,
} from '../../services/screenshotFiles';
import { PickedScreenshot, SCREENSHOT_SPECS, ScreenshotType } from '../../types/screenshot';

// ---------------------------------------------------------------------------
// Type selector
// ---------------------------------------------------------------------------

interface ScreenshotTypeCardProps {
  type: ScreenshotType;
  selected: boolean;
  disabled?: boolean;
  onSelect: (type: ScreenshotType) => void;
}

const ScreenshotTypeCard: React.FC<ScreenshotTypeCardProps> = ({
  type,
  selected,
  disabled,
  onSelect,
}) => {
  const spec = SCREENSHOT_SPECS[type];
  const iconColor = selected ? '#FFFFFF' : STITCH_COLORS.onSurfaceVariant;
  return (
    <PressableScale
      style={[styles.typeCard, selected && styles.typeCardSelected, disabled && styles.disabled]}
      onPress={() => onSelect(type)}
      disabled={disabled}
      activeOpacity={0.8}
      pressedScale={0.97}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${spec.label}, ${spec.width} by ${spec.height} pixels, ${spec.aspectLabel} ${spec.orientation}`}
    >
      <View style={styles.typeCardTop}>
        {type === 'desktop' ? (
          <MonitorIcon size={17} color={iconColor} />
        ) : (
          <SmartphoneIcon size={17} color={iconColor} />
        )}
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </View>

      {/* Proportional placeholder of the recommended frame */}
      <View style={styles.placeholderArea}>
        <View style={type === 'desktop' ? styles.placeholderLandscape : styles.placeholderPortrait}>
          <Text style={styles.placeholderText}>
            {spec.width}×{spec.height}
          </Text>
        </View>
      </View>

      <Text style={[styles.typeLabel, selected && styles.typeLabelSelected]}>{spec.label}</Text>
      <Text style={styles.typeDims}>
        {spec.width} × {spec.height} px
      </Text>
      <Text style={styles.typeMeta}>
        {spec.aspectLabel} · {spec.orientation}
      </Text>
      <Text style={styles.typeDescription}>{spec.description}</Text>
    </PressableScale>
  );
};

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

interface ScreenshotPickerSectionProps {
  type: ScreenshotType;
  onTypeChange: (type: ScreenshotType) => void;
  picked: PickedScreenshot | null;
  onPickedChange: (picked: PickedScreenshot | null) => void;
  disabled?: boolean;
  /** Shows an "Optional" tag next to the title (submission form). */
  optional?: boolean;
  /** Hide the section heading when the host already shows one. */
  hideHeading?: boolean;
}

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
const ORIENTATION_LABEL = { landscape: 'Landscape', portrait: 'Portrait', square: 'Square' } as const;

/**
 * "Project Screenshot" picker: choose Desktop / Mobile, pick one image,
 * see its real dimensions and a preview in the matching frame, with a
 * warning (and one-tap switch) when the orientation doesn't match.
 */
export const ScreenshotPickerSection: React.FC<ScreenshotPickerSectionProps> = ({
  type,
  onTypeChange,
  picked,
  onPickedChange,
  disabled,
  optional,
  hideHeading,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const [picking, setPicking] = useState<boolean>(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const handlePick = async () => {
    if (picking || disabled) return;
    setPicking(true);
    setPickError(null);
    const result = await pickScreenshotImage();
    setPicking(false);
    if (result.canceled) return;
    if (result.error || !result.data) {
      setPickError(result.error || 'Could not use this image.');
      return;
    }
    onPickedChange(result.data);
  };

  const mismatch = picked ? getOrientationMismatch(type, picked.width, picked.height) : null;
  const suggestedType: ScreenshotType = type === 'desktop' ? 'mobile' : 'desktop';
  const phoneWidth = Math.min(160, Math.round(windowWidth * 0.4));

  return (
    <View>
      {!hideHeading && (
        <>
          <View style={styles.headingRow}>
            <Text style={styles.heading}>Project Screenshot</Text>
            {optional && (
              <View style={styles.optionalTag}>
                <Text style={styles.optionalTagText}>Optional</Text>
              </View>
            )}
          </View>
          <Text style={styles.subheading}>
            Show the community what your project looks like. Upload a screenshot of your deployed
            application.
          </Text>
        </>
      )}

      <View style={styles.typeRow} accessibilityRole="radiogroup">
        <ScreenshotTypeCard
          type="desktop"
          selected={type === 'desktop'}
          disabled={disabled}
          onSelect={onTypeChange}
        />
        <ScreenshotTypeCard
          type="mobile"
          selected={type === 'mobile'}
          disabled={disabled}
          onSelect={onTypeChange}
        />
      </View>

      {!picked ? (
        <PressableScale
          style={[styles.pickArea, (disabled || picking) && styles.disabled]}
          onPress={handlePick}
          disabled={disabled || picking}
          activeOpacity={0.8}
          accessibilityLabel={`Choose ${SCREENSHOT_SPECS[type].label}`}
        >
          {picking ? (
            <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
          ) : (
            <>
              <ImageIcon size={18} color="#EDEDED" />
              <Text style={styles.pickTitle}>Choose image</Text>
              <Text style={styles.pickHint}>JPG, PNG or WebP · up to 5 MB · one screenshot</Text>
            </>
          )}
        </PressableScale>
      ) : (
        <View style={styles.previewBlock}>
          <Text style={styles.previewLabel}>Preview · {SCREENSHOT_SPECS[type].previewLabel}</Text>
          <View style={styles.previewFrameWrap}>
            {type === 'desktop' ? (
              <DesktopFrame uri={picked.uri} style={styles.previewDesktop} />
            ) : (
              <PhoneFrame uri={picked.uri} width={phoneWidth} />
            )}
          </View>

          <Text style={styles.actualDims}>
            {picked.width} × {picked.height} px ·{' '}
            {ORIENTATION_LABEL[getOrientation(picked.width, picked.height)]} ·{' '}
            {formatMb(picked.sizeBytes)}
          </Text>

          {mismatch && (
            <View style={styles.warningBox}>
              <View style={styles.warningRow}>
                <AlertTriangleIcon size={14} color="#EDEDED" />
                <Text style={styles.warningText}>{mismatch}</Text>
              </View>
              <PressableScale
                style={styles.switchButton}
                onPress={() => onTypeChange(suggestedType)}
                disabled={disabled}
                activeOpacity={0.8}
              >
                <Text style={styles.switchButtonText}>
                  Switch to {SCREENSHOT_SPECS[suggestedType].label}
                </Text>
              </PressableScale>
            </View>
          )}

          <View style={styles.previewActions}>
            <PressableScale
              style={[styles.secondaryButton, (disabled || picking) && styles.disabled]}
              onPress={handlePick}
              disabled={disabled || picking}
              activeOpacity={0.7}
            >
              {picking ? (
                <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
              ) : (
                <Text style={styles.secondaryButtonText}>Choose another</Text>
              )}
            </PressableScale>
            <PressableScale
              style={[styles.secondaryButton, disabled && styles.disabled]}
              onPress={() => {
                setPickError(null);
                onPickedChange(null);
              }}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </PressableScale>
          </View>
        </View>
      )}

      {pickError && <Text style={styles.errorText}>{pickError}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heading: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
    letterSpacing: -0.1,
  },
  optionalTag: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  optionalTagText: {
    fontSize: 10,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  subheading: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 10,
    padding: 12,
  },
  typeCardSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#0A0A0A',
  },
  typeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#454545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#FFFFFF',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  placeholderArea: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  placeholderLandscape: {
    height: 44,
    aspectRatio: 16 / 9,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#454545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderPortrait: {
    height: 64,
    aspectRatio: 9 / 16,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#454545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 7.5,
    fontFamily: FONTS.mono.regular,
    color: '#737373',
  },
  typeLabel: {
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#A1A1A1',
  },
  typeLabelSelected: {
    color: '#FFFFFF',
  },
  typeDims: {
    marginTop: 3,
    fontSize: 11.5,
    fontFamily: FONTS.mono.medium,
    color: '#EDEDED',
  },
  typeMeta: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: FONTS.mono.regular,
    color: '#737373',
  },
  typeDescription: {
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  pickArea: {
    marginTop: 12,
    minHeight: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#454545',
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
  },
  pickTitle: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  pickHint: {
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  previewBlock: {
    marginTop: 12,
  },
  previewLabel: {
    marginBottom: 8,
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  previewFrameWrap: {
    alignItems: 'center',
  },
  previewDesktop: {
    width: '100%',
  },
  actualDims: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 11.5,
    fontFamily: FONTS.mono.regular,
    color: '#A1A1A1',
  },
  warningBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#454545',
    backgroundColor: '#111111',
    gap: 8,
  },
  warningRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
  },
  switchButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  switchButtonText: {
    fontSize: 12,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  previewActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  secondaryButton: {
    minWidth: 96,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.error,
  },
  disabled: {
    opacity: 0.45,
  },
});
