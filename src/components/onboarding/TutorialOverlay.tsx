import React, { useEffect } from 'react';
import { View, Text, StyleSheet, BackHandler } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { TutorialStep } from '../../constants/tutorial';
import { FadeInView } from '../animation/FadeInView';
import { PressableScale } from '../animation/PressableScale';

interface TutorialOverlayProps {
  steps: TutorialStep[];
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

/**
 * Full-screen walkthrough card. The parent switches the real tab behind the
 * dimmed backdrop to match each step; this component only renders the card.
 */
export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  steps,
  stepIndex,
  onNext,
  onBack,
  onSkip,
}) => {
  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  // Android hardware back steps backwards instead of leaving the tutorial.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isFirst) onBack();
      return true;
    });
    return () => sub.remove();
  }, [isFirst, onBack]);

  if (!step) return null;

  return (
    <View style={styles.backdrop} accessibilityViewIsModal>
      <FadeInView key={step.id} offset={12} style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>{step.eyebrow}</Text>
          {!isLast && (
            <PressableScale
              onPress={onSkip}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              testID="tutorial-skip"
            >
              <Text style={styles.skipText}>Skip</Text>
            </PressableScale>
          )}
        </View>

        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>

        {step.bullets && step.bullets.length > 0 && (
          <View style={styles.bulletList}>
            {step.bullets.map((bullet) => (
              <View key={bullet} style={styles.bulletRow}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <View style={styles.dots}>
            {steps.map((s, i) => (
              <View key={s.id} style={[styles.dot, i === stepIndex && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.buttonRow}>
            {!isFirst && (
              <PressableScale
                style={styles.secondaryBtn}
                onPress={onBack}
                activeOpacity={0.8}
                testID="tutorial-back"
              >
                <Text style={styles.secondaryBtnText}>Back</Text>
              </PressableScale>
            )}
            <PressableScale
              style={styles.primaryBtn}
              onPress={onNext}
              activeOpacity={0.8}
              testID="tutorial-next"
            >
              <Text style={styles.primaryBtnText}>
                {isLast ? 'Get started' : isFirst ? 'Start tour' : 'Next'}
              </Text>
            </PressableScale>
          </View>
        </View>

        <Text style={styles.counter}>
          {stepIndex + 1} of {steps.length}
        </Text>
      </FadeInView>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 96, // sits above the bottom dock
    zIndex: 100,
    elevation: 100,
  },
  card: {
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: STITCH_COLORS.borderStrong,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: FONTS.mono.medium,
    color: STITCH_COLORS.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  skipText: {
    fontSize: 13,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.outline,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  bulletList: {
    marginTop: 12,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.onSurface,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.onSurface,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.borderEmphasis,
  },
  dotActive: {
    width: 18,
    backgroundColor: STITCH_COLORS.onSurface,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: STITCH_COLORS.primary,
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.onPrimary,
  },
  secondaryBtn: {
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: STITCH_COLORS.outlineVariant,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  counter: {
    marginTop: 12,
    fontSize: 11,
    fontFamily: FONTS.mono.regular,
    color: STITCH_COLORS.outline,
  },
});
