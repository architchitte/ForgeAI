import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import {
  DEGREE_CUSTOM_MAX,
  DEGREE_OPTIONS,
  DegreeOption,
  Education,
  EducationFormErrors,
  EducationFormValues,
  EducationInput,
  INSTITUTION_MAX,
  SPECIALIZATION_MAX,
  SPECIALIZATION_SUGGESTIONS,
  validateEducation,
} from '../../types/profile';
import { Input } from '../common/Input';
import { SearchIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { FormSheet } from './FormSheet';

interface EducationEditorModalProps {
  visible: boolean;
  /** Record being edited, or null to add a new one. */
  editing: Education | null;
  existing: Education[];
  saving: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onSave: (input: EducationInput) => Promise<string | null>;
  onDelete?: () => void;
}

const emptyForm = (): EducationFormValues => ({
  degree: null,
  customDegree: '',
  specialization: '',
  institution: '',
  startYear: '',
  graduationYear: '',
  status: 'completed',
});

const fromRecord = (e: Education): EducationFormValues => ({
  degree: e.degree,
  customDegree: e.custom_degree ?? '',
  specialization: e.specialization,
  institution: e.institution_name,
  startYear: String(e.start_year),
  graduationYear: e.graduation_year ? String(e.graduation_year) : '',
  status: e.status,
});

/** Add / edit one qualification. */
export const EducationEditorModal: React.FC<EducationEditorModalProps> = ({
  visible,
  editing,
  existing,
  saving,
  onClose,
  onSave,
  onDelete,
}) => {
  const [form, setForm] = useState<EducationFormValues>(emptyForm);
  const [degreeQuery, setDegreeQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setForm(editing ? fromRecord(editing) : emptyForm());
    setDegreeQuery('');
    setSubmitted(false);
    setServerError(null);
  }, [visible, editing]);

  const set = <K extends keyof EducationFormValues>(key: K, value: EducationFormValues[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setServerError(null);
  };

  const { errors } = useMemo(
    () => validateEducation(form, existing, editing?.id ?? null),
    [form, existing, editing]
  );
  const shown: EducationFormErrors = submitted ? errors : {};

  const degrees = useMemo(() => {
    const q = degreeQuery.trim().toLowerCase().replace(/\./g, '');
    return q ? DEGREE_OPTIONS.filter((d) => d.toLowerCase().replace(/\./g, '').includes(q)) : DEGREE_OPTIONS;
  }, [degreeQuery]);

  const specQuery = form.specialization.trim().toLowerCase();
  const specSuggestions = SPECIALIZATION_SUGGESTIONS.filter(
    (s) => s.toLowerCase() !== specQuery && (!specQuery || s.toLowerCase().includes(specQuery))
  ).slice(0, 6);

  const handleSave = async () => {
    setSubmitted(true);
    const result = validateEducation(form, existing, editing?.id ?? null);
    if (!result.input) return;
    const err = await onSave(result.input);
    if (err) setServerError(err);
  };

  const pursuing = form.status === 'pursuing';

  return (
    <FormSheet
      visible={visible}
      title={editing ? 'Edit Qualification' : 'Add Qualification'}
      subtitle="Degrees, diplomas and doctorates — add as many as you have."
      onClose={onClose}
      submitLabel={editing ? 'Save Changes' : 'Add Qualification'}
      onSubmit={handleSave}
      submitting={saving}
      destructiveLabel={editing && onDelete ? 'Delete' : undefined}
      onDestructive={onDelete}
    >
      {serverError && <Text style={styles.serverError}>{serverError}</Text>}

      {/* Status */}
      <Text style={styles.label}>Status</Text>
      <View style={styles.segment} accessibilityRole="radiogroup">
        {(['pursuing', 'completed'] as const).map((s) => {
          const on = form.status === s;
          return (
            <PressableScale
              key={s}
              style={[styles.segmentItem, on && styles.segmentItemOn]}
              onPress={() => set('status', s)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                {s === 'pursuing' ? 'Currently Pursuing' : 'Completed'}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {/* Degree */}
      <Text style={[styles.label, styles.spaced]}>Degree *</Text>
      <View style={styles.searchBox}>
        <SearchIcon size={14} color={STITCH_COLORS.outline} />
        <TextInput
          style={styles.searchInput}
          value={degreeQuery}
          onChangeText={setDegreeQuery}
          placeholder="Search degrees"
          placeholderTextColor={STITCH_COLORS.placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search degrees"
        />
      </View>
      <View style={styles.chips}>
        {degrees.map((d: DegreeOption) => {
          const on = form.degree === d;
          return (
            <PressableScale
              key={d}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => set('degree', on ? null : d)}
              activeOpacity={0.8}
              pressedScale={0.95}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{d}</Text>
            </PressableScale>
          );
        })}
        {degrees.length === 0 && (
          <Text style={styles.hint}>No match — choose “Other” to type your degree.</Text>
        )}
      </View>
      {shown.degree && <Text style={styles.fieldError}>{shown.degree}</Text>}

      {form.degree === 'Other' && (
        <Input
          label="Your degree *"
          value={form.customDegree}
          onChangeText={(t) => set('customDegree', t)}
          placeholder="e.g. B.Des, LLB, MBBS"
          maxLength={DEGREE_CUSTOM_MAX + 10}
          autoCapitalize="words"
          error={shown.custom_degree}
        />
      )}

      {/* Specialization */}
      <View style={styles.spaced} />
      <Input
        label="Specialization *"
        value={form.specialization}
        onChangeText={(t) => set('specialization', t)}
        placeholder="e.g. Information Technology"
        maxLength={SPECIALIZATION_MAX + 10}
        autoCapitalize="words"
        error={shown.specialization}
      />
      {specSuggestions.length > 0 && (
        <View style={styles.suggestions}>
          {specSuggestions.map((s) => (
            <PressableScale
              key={s}
              style={styles.suggestion}
              onPress={() => set('specialization', s)}
              activeOpacity={0.8}
              pressedScale={0.95}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </PressableScale>
          ))}
        </View>
      )}

      {/* Institution */}
      <Input
        label="Institution *"
        value={form.institution}
        onChangeText={(t) => set('institution', t)}
        placeholder="e.g. VESIT"
        maxLength={INSTITUTION_MAX + 10}
        autoCapitalize="words"
        error={shown.institution_name}
      />

      {/* Years */}
      <View style={styles.yearRow}>
        <Input
          label="Start year *"
          value={form.startYear}
          onChangeText={(t) => set('startYear', t.replace(/\D/g, ''))}
          placeholder="2022"
          keyboardType="number-pad"
          maxLength={4}
          error={shown.start_year}
          containerStyle={styles.yearField}
        />
        <Input
          label={pursuing ? 'Expected graduation' : 'Graduation year *'}
          value={form.graduationYear}
          onChangeText={(t) => set('graduationYear', t.replace(/\D/g, ''))}
          placeholder={pursuing ? 'Optional' : '2026'}
          keyboardType="number-pad"
          maxLength={4}
          error={shown.graduation_year}
          containerStyle={styles.yearField}
        />
      </View>
      {pursuing && (
        <Text style={styles.hint}>
          Shown as ongoing until you mark it Completed — even after the expected year.
        </Text>
      )}
    </FormSheet>
  );
};

const styles = StyleSheet.create({
  serverError: {
    marginBottom: 10,
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.error,
  },
  label: {
    marginBottom: 6,
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  spaced: {
    marginTop: 14,
  },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#000000',
  },
  segmentItem: {
    flex: 1,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemOn: {
    backgroundColor: '#FFFFFF',
  },
  segmentText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  segmentTextOn: {
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  searchBox: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#000000',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
    paddingVertical: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#000000',
  },
  chipOn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  chipText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  chipTextOn: {
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#FFFFFF',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: -2,
    marginBottom: 8,
  },
  suggestion: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#333333',
  },
  suggestionText: {
    fontSize: 11.5,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  yearRow: {
    flexDirection: 'row',
    gap: 10,
  },
  yearField: {
    flex: 1,
    width: undefined,
  },
  hint: {
    marginTop: 2,
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
});
