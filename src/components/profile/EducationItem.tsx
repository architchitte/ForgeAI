import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '../../constants/typography';
import { PublicEducation, degreeLabel } from '../../types/profile';
import { EditIcon, TrashIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';

interface EducationItemProps {
  education: PublicEducation;
  /** Position in the sorted list (1-based). */
  position: number;
  /** Owner actions; omit for read-only (publisher profile). */
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}

const yearsLabel = (e: PublicEducation) =>
  e.graduation_year ? `${e.start_year}–${e.graduation_year}` : `${e.start_year}–Present`;

/** One qualification card: "M.Tech — AI", "University A · 2026–2028", status. */
export const EducationItem: React.FC<EducationItemProps> = ({
  education: e,
  position,
  onEdit,
  onDelete,
  disabled,
}) => {
  const ongoing = e.status === 'pursuing';
  return (
    <View style={styles.card}>
      <View style={styles.indexBadge}>
        <Text style={styles.indexText}>{position}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.title}>
          {degreeLabel(e)} — {e.specialization}
        </Text>
        <Text style={styles.meta}>
          {e.institution_name} · {yearsLabel(e)}
        </Text>
        <View style={[styles.status, ongoing && styles.statusOngoing]}>
          {ongoing && <View style={styles.liveDot} />}
          <Text style={[styles.statusText, ongoing && styles.statusTextOngoing]}>
            {ongoing ? 'Currently Pursuing' : 'Completed'}
          </Text>
        </View>
      </View>
      {(onEdit || onDelete) && (
        <View style={styles.actions}>
          {onEdit && (
            <PressableScale
              style={styles.iconButton}
              onPress={onEdit}
              disabled={disabled}
              activeOpacity={0.6}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityLabel={`Edit ${degreeLabel(e)}`}
            >
              <EditIcon size={13} color="#EDEDED" />
            </PressableScale>
          )}
          {onDelete && (
            <PressableScale
              style={styles.iconButton}
              onPress={onDelete}
              disabled={disabled}
              activeOpacity={0.6}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              accessibilityLabel={`Delete ${degreeLabel(e)}`}
            >
              <TrashIcon size={13} color="#EDEDED" />
            </PressableScale>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  indexText: {
    fontSize: 11,
    fontFamily: FONTS.mono.medium,
    color: '#A1A1A1',
  },
  title: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  meta: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 17,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  status: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
  },
  statusOngoing: {
    borderColor: '#454545',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  statusTextOngoing: {
    color: '#EDEDED',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
