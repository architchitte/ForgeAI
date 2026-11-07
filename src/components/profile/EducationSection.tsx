import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import type { useEducation } from '../../hooks/useEducation';
import { Education, EducationInput, degreeLabel } from '../../types/profile';
import { GraduationCapIcon, PlusIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { EducationEditorModal } from './EducationEditorModal';
import { EducationItem } from './EducationItem';

/** Profile → Education: LinkedIn-style list with add / edit / delete. */
interface EducationSectionProps {
  /** Shared with the profile header (current qualification under the name). */
  education: ReturnType<typeof useEducation>;
}

export const EducationSection: React.FC<EducationSectionProps> = ({ education }) => {
  const { items, loading, error, busy, refresh, add, update, remove } = education;
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Education | null>(null);

  const openAdd = () => {
    setEditing(null);
    setEditorOpen(true);
  };
  const openEdit = (e: Education) => {
    setEditing(e);
    setEditorOpen(true);
  };

  const handleSave = async (input: EducationInput) => {
    const err = editing ? await update(editing.id, input) : await add(input);
    if (!err) setEditorOpen(false);
    return err;
  };

  const confirmDelete = (e: Education) => {
    Alert.alert(
      'Delete qualification?',
      `${degreeLabel(e)} — ${e.specialization} will be removed from your profile.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const err = await remove(e.id);
            if (err) Alert.alert('Could not delete', err);
            else setEditorOpen(false);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.heading}>Education</Text>
        <PressableScale
          style={styles.addButton}
          onPress={openAdd}
          disabled={busy}
          activeOpacity={0.8}
          accessibilityLabel="Add qualification"
        >
          <PlusIcon size={13} color="#EDEDED" />
          <Text style={styles.addText}>Add</Text>
        </PressableScale>
      </View>

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
          <PressableScale style={styles.retry} onPress={refresh} activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
          </PressableScale>
        </View>
      ) : items.length === 0 ? (
        <PressableScale style={styles.emptyCard} onPress={openAdd} activeOpacity={0.8}>
          <GraduationCapIcon size={18} color="#A1A1A1" />
          <View style={styles.flex}>
            <Text style={styles.emptyTitle}>Add your education</Text>
            <Text style={styles.emptyText}>Degrees, diplomas and current studies.</Text>
          </View>
        </PressableScale>
      ) : (
        <View style={styles.list}>
          {items.map((e, index) => (
            <EducationItem
              key={e.id}
              education={e}
              position={index + 1}
              onEdit={() => openEdit(e)}
              onDelete={() => confirmDelete(e)}
              disabled={busy}
            />
          ))}
        </View>
      )}

      <EducationEditorModal
        visible={editorOpen}
        editing={editing}
        existing={items}
        saving={busy}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
        onDelete={editing ? () => confirmDelete(editing) : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  section: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  heading: {
    fontSize: 16,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
  },
  addText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  state: {
    alignItems: 'center',
    padding: 18,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#171717',
    backgroundColor: '#0A0A0A',
  },
  stateText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
    textAlign: 'center',
  },
  retry: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
  },
  retryText: {
    fontSize: 12,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#333333',
    backgroundColor: '#050505',
  },
  emptyTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  emptyText: {
    marginTop: 1,
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  list: {
    gap: 10,
  },
});
