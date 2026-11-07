import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONTS } from '../../constants/typography';
import {
  CATEGORY_LABEL,
  CUSTOM_CATEGORY_ID,
  TECH_CATEGORIES,
} from '../../constants/technologies';
import { ProjectTechnology } from '../../services/technologies';

/**
 * Read-only technology display. Projects without technology rows (legacy
 * projects, or before the migration) fall back to their existing
 * repositories.framework text — nothing is inferred or invented.
 */

const FEED_LIMIT = 3;

interface TechnologyBadgesProps {
  technologies?: ProjectTechnology[];
  legacyFramework?: string | null;
}

/** Feed card: first three technologies + "+N". */
export const TechnologyBadges: React.FC<TechnologyBadgesProps> = ({
  technologies,
  legacyFramework,
}) => {
  const names =
    technologies && technologies.length > 0
      ? technologies.map((t) => ({ name: t.technology_name, custom: t.is_custom }))
      : legacyFramework?.trim()
        ? [{ name: legacyFramework.trim(), custom: false }]
        : [];
  if (names.length === 0) return null;

  const shown = names.slice(0, FEED_LIMIT);
  const extra = names.length - shown.length;

  return (
    <View style={styles.badgeRow} accessibilityLabel={`Technologies: ${names.map((n) => n.name).join(', ')}`}>
      {shown.map((n, i) => (
        <View key={`${n.name}-${i}`} style={[styles.badge, n.custom && styles.badgeCustom]}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {n.name}
          </Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={[styles.badge, styles.moreBadge]}>
          <Text style={styles.moreText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
};

interface TechnologyGroupsProps {
  technologies?: ProjectTechnology[];
  legacyFramework?: string | null;
}

const CATEGORY_ORDER = [...TECH_CATEGORIES.map((c) => c.id as string), CUSTOM_CATEGORY_ID];

/** Detail page: all technologies grouped by category (custom last). */
export const TechnologyGroups: React.FC<TechnologyGroupsProps> = ({
  technologies,
  legacyFramework,
}) => {
  if (!technologies || technologies.length === 0) {
    const legacy = legacyFramework?.trim();
    if (!legacy) return <Text style={styles.emptyText}>No technologies listed.</Text>;
    return (
      <View style={styles.group}>
        <Text style={styles.groupLabel}>Framework</Text>
        <View style={styles.groupChips}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{legacy}</Text>
          </View>
        </View>
      </View>
    );
  }

  const groups = new Map<string, ProjectTechnology[]>();
  for (const t of technologies) {
    const key = CATEGORY_LABEL[t.category] ? t.category : CUSTOM_CATEGORY_ID;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
  }
  const ordered = CATEGORY_ORDER.filter((id) => groups.has(id));

  return (
    <View style={styles.groups}>
      {ordered.map((categoryId) => (
        <View key={categoryId} style={styles.group}>
          <Text style={styles.groupLabel}>{CATEGORY_LABEL[categoryId]}</Text>
          <View style={styles.groupChips}>
            {groups.get(categoryId)!.map((t) => (
              <View key={t.id} style={[styles.chip, t.is_custom && styles.chipCustom]}>
                <Text style={styles.chipText}>{t.technology_name}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    maxWidth: '100%',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
  },
  badgeCustom: {
    borderStyle: 'dashed',
    borderColor: '#333333',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  moreBadge: {
    backgroundColor: '#0A0A0A',
  },
  moreText: {
    fontSize: 11,
    fontFamily: FONTS.mono.medium,
    color: '#737373',
  },
  groups: {
    gap: 14,
  },
  group: {
    gap: 7,
  },
  groupLabel: {
    fontSize: 10.5,
    fontFamily: FONTS.sans.semibold,
    color: '#737373',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  groupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
  },
  chipCustom: {
    borderStyle: 'dashed',
    borderColor: '#454545',
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
});
