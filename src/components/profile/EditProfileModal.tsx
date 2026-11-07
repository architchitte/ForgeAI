import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { BIO_MAX, COLLEGE_MAX, NAME_MAX, PLACE_MAX } from '../../types/profile';
import { Input } from '../common/Input';
import { FormSheet } from './FormSheet';

export interface PersonalInfoValues {
  fullName: string;
  college: string;
  city: string;
  country: string;
  bio: string;
}

interface EditProfileModalProps {
  visible: boolean;
  initial: PersonalInfoValues;
  saving: boolean;
  onClose: () => void;
  /** Resolves to an error message, or null on success. */
  onSave: (values: PersonalInfoValues) => Promise<string | null>;
}

type Errors = Partial<Record<keyof PersonalInfoValues, string>>;

const validate = (v: PersonalInfoValues): Errors => {
  const e: Errors = {};
  if (!v.fullName.trim()) e.fullName = 'Full name is required.';
  else if (v.fullName.trim().length > NAME_MAX) e.fullName = `Keep it under ${NAME_MAX} characters.`;
  if (v.college.trim().length > COLLEGE_MAX) e.college = `Keep it under ${COLLEGE_MAX} characters.`;
  if (v.city.trim().length > PLACE_MAX) e.city = `Keep it under ${PLACE_MAX} characters.`;
  if (v.country.trim().length > PLACE_MAX) e.country = `Keep it under ${PLACE_MAX} characters.`;
  if (v.bio.trim().length > BIO_MAX) e.bio = `Your bio can be at most ${BIO_MAX} characters.`;
  return e;
};

/** Edit Profile: name, college, city, country, bio — pre-filled. */
export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  initial,
  saving,
  onClose,
  onSave,
}) => {
  const [values, setValues] = useState<PersonalInfoValues>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setValues(initial);
    setSubmitted(false);
    setServerError(null);
    // Re-seed only when the sheet opens.
  }, [visible]);

  const errors = validate(values);
  const shown: Errors = submitted ? errors : { bio: errors.bio };
  const set = (key: keyof PersonalInfoValues, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setServerError(null);
  };

  const handleSave = async () => {
    setSubmitted(true);
    if (Object.keys(validate(values)).length > 0) return;
    const err = await onSave(values);
    if (err) setServerError(err);
  };

  const bioLength = values.bio.trim().length;

  return (
    <FormSheet
      visible={visible}
      title="Edit Profile"
      subtitle="This is how you appear across Forge."
      onClose={onClose}
      submitLabel="Save Profile"
      onSubmit={handleSave}
      submitting={saving}
    >
      {serverError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{serverError}</Text>
        </View>
      )}
      <Input
        label="Full name *"
        value={values.fullName}
        onChangeText={(t) => set('fullName', t)}
        placeholder="Your full name"
        autoCapitalize="words"
        maxLength={NAME_MAX + 10}
        error={shown.fullName}
        testID="profile-name-input"
      />
      <Input
        label="College / University"
        value={values.college}
        onChangeText={(t) => set('college', t)}
        placeholder="e.g. VESIT, Mumbai University"
        autoCapitalize="words"
        maxLength={COLLEGE_MAX + 10}
        error={shown.college}
        helperText="Shown on your profile and your published projects."
        testID="profile-college-input"
      />
      <View style={styles.row}>
        <Input
          label="City"
          value={values.city}
          onChangeText={(t) => set('city', t)}
          placeholder="Optional"
          autoCapitalize="words"
          maxLength={PLACE_MAX + 10}
          error={shown.city}
          containerStyle={styles.half}
        />
        <Input
          label="Country"
          value={values.country}
          onChangeText={(t) => set('country', t)}
          placeholder="Optional"
          autoCapitalize="words"
          maxLength={PLACE_MAX + 10}
          error={shown.country}
          containerStyle={styles.half}
        />
      </View>
      <Input
        label="Bio"
        rightLabel={`${bioLength}/${BIO_MAX}`}
        value={values.bio}
        onChangeText={(t) => set('bio', t)}
        placeholder="A short professional introduction — what you build and what you're learning."
        multiline
        numberOfLines={4}
        maxLength={BIO_MAX + 20}
        autoCapitalize="sentences"
        error={shown.bio}
        testID="profile-bio-input"
      />
    </FormSheet>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
    width: undefined,
  },
  errorBox: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#454545',
    backgroundColor: '#111111',
  },
  errorBoxText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.onSurface,
  },
});
