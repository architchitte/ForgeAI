import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Repository } from '../../types/repository';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';
import { GraduationCapIcon } from '../common/AppIcons';
import { LikeButton } from '../common/LikeButton';
import { DesktopFrame, PhoneFrame } from '../screenshot/ScreenshotFrames';
import { getScreenshotUrl } from '../../services/screenshots';
import { ProjectScreenshot } from '../../types/screenshot';
import { TechnologyBadges } from '../technology/TechnologyDisplay';
import { ProjectTechnology } from '../../services/technologies';
import { PressableScale } from '../animation/PressableScale';
import { FadeInView } from '../animation/FadeInView';
import { staggerDelay } from '../animation/motion';

/**
 * The project card used by the Discover feed and by founder profiles:
 * plain / desktop-screenshot / mobile-screenshot layouts, technology
 * badges, Active pill and like button (hold → who liked).
 */

// Only the first screenful of cards gets an entrance animation.
const ANIMATED_CARD_LIMIT = 8;
// Phone-frame width on mobile-screenshot cards (~30% of the screen): wide
// enough to fill the card's height beside the details, never dominating it.
const CARD_PHONE_MIN_WIDTH = 104;
const CARD_PHONE_MAX_WIDTH = 132;

export interface ProjectCardProps {
  item: Repository;
  index: number;
  onPress: (repo: Repository) => void;
  /** Undefined until like state has loaded for this card. */
  likeCount?: number;
  liked: boolean;
  likePending: boolean;
  onToggleLike: (repositoryId: string) => void;
  /** Hold the like button → who liked this project. */
  onShowLikers: (repositoryId: string) => void;
  /** The project's screenshot, if it has one. */
  screenshot?: ProjectScreenshot;
  /** Structured technologies; undefined/empty falls back to `framework`. */
  technologies?: ProjectTechnology[];
}

/**
 * Memoized so typing in search / toggling filters only re-renders cards
 * whose data actually changed.
 */
export const ProjectCard = React.memo<ProjectCardProps>(({
  item,
  index,
  onPress,
  likeCount,
  liked,
  likePending,
  onToggleLike,
  onShowLikers,
  screenshot,
  technologies,
}) => {
  // A screenshot that fails to load falls back to the plain card layout.
  const [screenshotFailed, setScreenshotFailed] = useState<boolean>(false);
  const screenshotPath = screenshot?.storage_path;
  useEffect(() => setScreenshotFailed(false), [screenshotPath]);
  const screenshotUri =
    screenshotPath && !screenshotFailed ? getScreenshotUrl(screenshotPath) : null;
  const layout: 'plain' | 'desktop' | 'mobile' = screenshotUri
    ? screenshot!.screenshot_type
    : 'plain';

  // Never fall back to the submitter's email — it is private.
  const studentDisplayName =
    item.student_name && item.student_name.trim().length > 0
      ? item.student_name.trim()
      : COMMUNITY_MEMBER_LABEL;

  const { width: windowWidth } = useWindowDimensions();
  const phoneWidth = Math.min(
    CARD_PHONE_MAX_WIDTH,
    Math.max(CARD_PHONE_MIN_WIDTH, Math.round(windowWidth * 0.3))
  );

  const creatorSubtitle = item.university
    ? `${studentDisplayName} · ${item.university}`
    : studentDisplayName;


  // Shared pieces, arranged differently per layout below.
  const header = (
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleCol}>
        <Text style={styles.cardAppName} numberOfLines={layout === 'mobile' ? 2 : 1}>
          {item.app_name}
        </Text>
        <View style={styles.authorRow}>
          <View style={styles.authorIcon}>
            <GraduationCapIcon size={14} color={STITCH_COLORS.primaryContainer} />
          </View>
          {/* Wraps onto more lines so long university names stay fully visible */}
          <Text style={styles.cardAuthor}>{creatorSubtitle}</Text>
        </View>
      </View>
    </View>
  );

  // AI technologies: first three + "+N" (legacy: framework text)
  const techBadges = (
    <TechnologyBadges technologies={technologies} legacyFramework={item.framework} />
  );

  // Active status & like. The whole card is the button that opens the project.
  const footer = (
    <View style={[styles.cardFooter, layout === 'mobile' && styles.cardFooterWrap]}>
      <View style={styles.footerLeft}>
        <View style={styles.activeStatusPill}>
          <View style={styles.activeDot} />
          <Text style={styles.activeStatusText}>Active</Text>
        </View>
        <LikeButton
          repositoryId={item.id}
          count={likeCount}
          liked={liked}
          pending={likePending}
          onToggle={onToggleLike}
          onLongPress={onShowLikers}
        />
      </View>
    </View>
  );

  return (
    <FadeInView delay={staggerDelay(index)} disabled={index >= ANIMATED_CARD_LIMIT}>
    <PressableScale
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      pressedScale={0.98}
      testID={`repository-card-${item.id}`}
      accessibilityHint="Opens the project details"
    >
      {layout === 'mobile' ? (
        // Mobile showcase: every detail in the left column; the phone preview
        // fills the right side for the full height of the card.
        <View style={styles.mobileCardRow}>
          <View style={styles.mobileCardInfo}>
            <View>
              {header}
              <Text style={styles.oneLiner} numberOfLines={4}>
                {item.one_liner}
              </Text>
              {techBadges}
            </View>
            {footer}
          </View>
          <PhoneFrame
            uri={screenshotUri!}
            width={phoneWidth}
            thumbnail
            style={styles.mobileCardPhone}
            onError={() => setScreenshotFailed(true)}
            accessibilityLabel={`${item.app_name} mobile screenshot`}
          />
        </View>
      ) : (
        <>
          {header}
          {/* Description */}
          <Text style={styles.oneLiner} numberOfLines={2}>
            {item.one_liner}
          </Text>
          {layout === 'desktop' && (
            // Desktop showcase: wide browser-window preview under the copy.
            <DesktopFrame
              uri={screenshotUri!}
              compact
              thumbnail
              style={styles.desktopPreview}
              onError={() => setScreenshotFailed(true)}
              accessibilityLabel={`${item.app_name} desktop screenshot`}
            />
          )}
          {techBadges}
          {footer}
        </>
      )}
    </PressableScale>
    </FadeInView>
  );
});
ProjectCard.displayName = 'ProjectCard';

const styles = StyleSheet.create({
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  activeStatusText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  authorIcon: {
    marginTop: 1, // align with the first text line
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 3,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  cardAppName: {
    fontSize: 18,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  cardAuthor: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#171717',
  },
  cardFooterWrap: {
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleCol: {
    flex: 1,
    marginRight: 10,
  },
  desktopPreview: {
    marginBottom: 12,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileCardInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  mobileCardPhone: {
    alignSelf: 'center',
  },
  mobileCardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  oneLiner: {
    fontSize: 13.5,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
    lineHeight: 19,
    marginBottom: 12,
  },
});
