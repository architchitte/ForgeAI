import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { PressableScale } from '../animation/PressableScale';

interface ScreenshotImageProps {
  uri: string;
  /** Called if the image fails to load, so callers can hide the frame entirely. */
  onError?: () => void;
  /** Feed thumbnails: decode at view size to save memory on Android. */
  thumbnail?: boolean;
  accessibilityLabel?: string;
}

/**
 * Screenshot image that always fits entirely inside its frame
 * (`contain` — never cropped, never stretched) with a loading indicator.
 */
const ScreenshotImage: React.FC<ScreenshotImageProps> = ({
  uri,
  onError,
  thumbnail,
  accessibilityLabel,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  return (
    <>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        resizeMethod={thumbnail ? 'resize' : 'auto'}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          onError?.();
        }}
        accessible
        accessibilityLabel={accessibilityLabel}
      />
      {loading && (
        <View style={[StyleSheet.absoluteFill, styles.loading]} pointerEvents="none">
          <ActivityIndicator size="small" color={STITCH_COLORS.outline} />
        </View>
      )}
    </>
  );
};

interface FrameProps {
  uri: string;
  onPress?: () => void;
  onError?: () => void;
  thumbnail?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const FramePressable: React.FC<{ onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string; children: React.ReactNode }> = ({
  onPress,
  style,
  label,
  children,
}) =>
  onPress ? (
    <PressableScale
      style={style}
      onPress={onPress}
      activeOpacity={0.9}
      pressedScale={0.985}
      accessibilityRole="imagebutton"
      accessibilityLabel={label ? `${label}, open larger` : 'Open screenshot'}
    >
      {children}
    </PressableScale>
  ) : (
    <View style={style}>{children}</View>
  );

/**
 * Desktop preview: a minimal browser-window chrome over a 16:9 viewport,
 * so the screenshot reads as a miniature website / dashboard.
 */
export const DesktopFrame: React.FC<FrameProps & { compact?: boolean }> = ({
  uri,
  onPress,
  onError,
  thumbnail,
  style,
  compact,
  accessibilityLabel = 'Desktop screenshot',
}) => (
  <FramePressable onPress={onPress} style={[styles.desktop, style]} label={accessibilityLabel}>
    <View style={[styles.chrome, compact && styles.chromeCompact]}>
      <View style={[styles.dot, { backgroundColor: '#262626' }]} />
      <View style={[styles.dot, { backgroundColor: '#333333' }]} />
      <View style={[styles.dot, { backgroundColor: '#454545' }]} />
      <View style={styles.addressBar} />
    </View>
    <View style={styles.viewport16x9}>
      <ScreenshotImage
        uri={uri}
        onError={onError}
        thumbnail={thumbnail}
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  </FramePressable>
);

/**
 * Mobile preview: a phone-shaped bezel around a 9:16 screen. Width is set
 * by the caller so the portrait image never dominates the layout.
 */
export const PhoneFrame: React.FC<FrameProps & { width: number }> = ({
  uri,
  onPress,
  onError,
  thumbnail,
  style,
  width,
  accessibilityLabel = 'Mobile screenshot',
}) => {
  const bezel = Math.max(3, Math.round(width * 0.035));
  const radius = Math.round(width * 0.14);
  return (
    <FramePressable
      onPress={onPress}
      style={[
        styles.phone,
        { width, borderRadius: radius, padding: bezel, paddingTop: bezel * 2.2 },
        style,
      ]}
      label={accessibilityLabel}
    >
      <View
        style={[
          styles.notch,
          {
            top: bezel * 0.7,
            left: (width - width * 0.22) / 2 - 1, // minus the 1px border
            width: width * 0.22,
            height: bezel * 0.8,
          },
        ]}
      />
      <View style={[styles.phoneScreen, { borderRadius: radius - bezel }]}>
        <ScreenshotImage
          uri={uri}
          onError={onError}
          thumbnail={thumbnail}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    </FramePressable>
  );
};

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktop: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
    overflow: 'hidden',
  },
  chrome: {
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    backgroundColor: '#111111',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  chromeCompact: {
    height: 18,
    gap: 4,
    paddingHorizontal: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  addressBar: {
    flex: 1,
    height: 8,
    marginLeft: 8,
    marginRight: 24,
    borderRadius: 4,
    backgroundColor: '#1A1A1A',
  },
  viewport16x9: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  phone: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  notch: {
    position: 'absolute',
    borderRadius: 4,
    backgroundColor: '#262626',
  },
  phoneScreen: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
});
