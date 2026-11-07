import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { useEducation } from '../../hooks/useEducation';
import { Education, EducationInput, degreeLabel } from '../../types/profile';
import { EditIcon, GraduationCapIcon, PlusIcon, TrashIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { EducationEditorModal } from './EducationEditorModal';

const yearsLabel = (e: Education) =>
  e.graduation_year ? `${e.start_year}–${e.graduation_year}` : `${e.start_year}–Present`;

/** Profile → Education: LinkedIn-style list with add / edit / delete. */
export const EducationSection: React.FC = () => {
  const { items, loading, error, busy, refresh, add, update, remove } = useEducation();
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
            <View key={e.id} style={styles.card}>
              <View style={styles.indexBadge}>
                <Text style={styles.indexText}>{index + 1}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.title}>
                  {degreeLabel(e)} — {e.specialization}
                </Text>
                <Text style={styles.meta}>
                  {e.institution_name} · {yearsLabel(e)}
                </Text>
                <View style={[styles.status, e.status === 'pursuing' && styles.statusOngoing]}>
                  {e.status === 'pursuing' && <View style={styles.liveDot} />}
                  <Text style={[styles.statusText, e.status === 'pursuing' && styles.statusTextOngoing]}>
                    {e.status === 'pursuing' ? 'Currently Pursuing' : 'Completed'}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <PressableScale
                  style={styles.iconButton}
                  onPress={() => openEdit(e)}
                  disabled={busy}
                  activeOpacity={0.6}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessibilityLabel={`Edit ${degreeLabel(e)}`}
                >
                  <EditIcon size={13} color="#EDEDED" />
                </PressableScale>
                <PressableScale
                  style={styles.iconButton}
                  onPress={() => confirmDelete(e)}
                  disabled={busy}
                  activeOpacity={0.6}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                  accessibilityLabel={`Delete ${degreeLabel(e)}`}
                >
                  <TrashIcon size={13} color="#EDEDED" />
                </PressableScale>
              </View>
            </View>
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
