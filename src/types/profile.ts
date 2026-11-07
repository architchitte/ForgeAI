/** Row shape of public.profiles (public to signed-in users). */
export interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_path: string | null;
  updated_at: string;
  created_at?: string;
}

/** Row shape of public.profile_details (owner-only). */
export interface ProfileDetails {
  id: string;
  city: string | null;
  country: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export const NAME_MAX = 80;
export const COLLEGE_MAX = 120;
export const PLACE_MAX = 80;
export const BIO_MAX = 300;

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

export const DEGREE_OPTIONS = [
  'B.E.',
  'B.Tech',
  'B.Sc',
  'BCA',
  'B.Arch',
  'BBA',
  'B.Com',
  'M.E.',
  'M.Tech',
  'M.Sc',
  'MCA',
  'MBA',
  'PhD',
  'Diploma',
  'Other',
] as const;
export type DegreeOption = (typeof DEGREE_OPTIONS)[number];

/** Suggestions only — any specialization can be typed. */
export const SPECIALIZATION_SUGGESTIONS = [
  'Information Technology',
  'Computer Science',
  'Artificial Intelligence',
  'Machine Learning',
  'Data Science',
  'Computer Engineering',
  'Electronics and Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Cybersecurity',
];

export type EducationStatus = 'pursuing' | 'completed';

/** Row shape of public.profile_education (owner-only). */
export interface Education {
  id: string;
  user_id: string;
  degree: DegreeOption;
  custom_degree: string | null;
  specialization: string;
  institution_name: string;
  start_year: number;
  graduation_year: number | null;
  status: EducationStatus;
  created_at: string;
  updated_at: string;
}

/** Editable fields (form → insert/update). */
export interface EducationInput {
  degree: DegreeOption;
  custom_degree: string | null;
  specialization: string;
  institution_name: string;
  start_year: number;
  graduation_year: number | null;
  status: EducationStatus;
}

export const DEGREE_CUSTOM_MAX = 60;
export const SPECIALIZATION_MAX = 80;
export const INSTITUTION_MAX = 120;
export const MIN_YEAR = 1950;
export const MAX_YEAR = 2100;

export const degreeLabel = (e: Pick<Education, 'degree' | 'custom_degree'>): string =>
  e.degree === 'Other' ? e.custom_degree?.trim() || 'Other' : e.degree;

/**
 * LinkedIn-style order:
 *  1. Currently pursuing first — latest start year first.
 *  2. Then completed — latest graduation year first (ties: latest start).
 * Status is the source of truth; an ongoing degree never turns "completed"
 * just because its expected graduation year has passed.
 */
type SortableEducation = Pick<Education, 'status' | 'start_year' | 'graduation_year'> & {
  created_at?: string;
};

export const sortEducation = <T extends SortableEducation>(items: T[]): T[] =>
  [...items].sort((a, b) => {
    const newer = (b.created_at ?? '').localeCompare(a.created_at ?? '');
    if (a.status !== b.status) return a.status === 'pursuing' ? -1 : 1;
    if (a.status === 'pursuing') return b.start_year - a.start_year || newer;
    return (
      (b.graduation_year ?? 0) - (a.graduation_year ?? 0) ||
      b.start_year - a.start_year ||
      newer
    );
  });

/** Education as shown publicly (no ids). */
export type PublicEducation = Pick<
  Education,
  | 'degree'
  | 'custom_degree'
  | 'specialization'
  | 'institution_name'
  | 'start_year'
  | 'graduation_year'
  | 'status'
> & { created_at?: string };

/** A project publisher's public profile (from get_project_publisher). */
export interface PublisherProfile {
  has_account: boolean;
  /** Account id (same as public.profiles.id) — used to follow; never an email. */
  user_id?: string | null;
  /** Their project ids (get_user_profile only). */
  project_ids?: string[];
  display_name: string | null;
  avatar_path: string | null;
  college: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  education: PublicEducation[];
}

export interface EducationFormErrors {
  degree?: string;
  custom_degree?: string;
  specialization?: string;
  institution_name?: string;
  start_year?: string;
  graduation_year?: string;
}

/** Raw form values (years typed as text). */
export interface EducationFormValues {
  degree: DegreeOption | null;
  customDegree: string;
  specialization: string;
  institution: string;
  startYear: string;
  graduationYear: string;
  status: EducationStatus;
}

const parseYear = (raw: string): number | null => {
  const t = raw.trim();
  if (!/^\d{4}$/.test(t)) return null;
  const n = Number(t);
  return n >= MIN_YEAR && n <= MAX_YEAR ? n : null;
};

/**
 * Validates the education form. Returns field errors, or the cleaned input
 * when valid. `existing` is used to catch accidental duplicates.
 */
export const validateEducation = (
  v: EducationFormValues,
  existing: Education[],
  editingId: string | null
): { errors: EducationFormErrors; input: EducationInput | null } => {
  const errors: EducationFormErrors = {};
  const customDegree = v.customDegree.trim().replace(/\s+/g, ' ');
  const specialization = v.specialization.trim().replace(/\s+/g, ' ');
  const institution = v.institution.trim().replace(/\s+/g, ' ');

  if (!v.degree) errors.degree = 'Select a degree.';
  if (v.degree === 'Other') {
    if (!customDegree) errors.custom_degree = 'Enter your degree.';
    else if (customDegree.length > DEGREE_CUSTOM_MAX) {
      errors.custom_degree = `Keep it under ${DEGREE_CUSTOM_MAX} characters.`;
    }
  }
  if (!specialization) errors.specialization = 'Enter your specialization.';
  else if (specialization.length > SPECIALIZATION_MAX) {
    errors.specialization = `Keep it under ${SPECIALIZATION_MAX} characters.`;
  }
  if (!institution) errors.institution_name = 'Enter your institution.';
  else if (institution.length > INSTITUTION_MAX) {
    errors.institution_name = `Keep it under ${INSTITUTION_MAX} characters.`;
  }

  const start = parseYear(v.startYear);
  if (start === null) errors.start_year = `Enter a 4-digit year (${MIN_YEAR}–${MAX_YEAR}).`;

  const gradRaw = v.graduationYear.trim();
  let grad: number | null = null;
  if (gradRaw) {
    grad = parseYear(gradRaw);
    if (grad === null) errors.graduation_year = `Enter a 4-digit year (${MIN_YEAR}–${MAX_YEAR}).`;
  } else if (v.status === 'completed') {
    errors.graduation_year = 'Completed qualifications need a graduation year.';
  }
  if (start !== null && grad !== null && grad < start) {
    errors.graduation_year = 'Graduation year cannot be earlier than the start year.';
  }
  if (v.status === 'completed' && grad !== null && grad > new Date().getFullYear()) {
    errors.graduation_year = 'A completed qualification cannot graduate in the future. Choose Currently Pursuing instead.';
  }

  if (Object.keys(errors).length > 0 || !v.degree || start === null) {
    return { errors, input: null };
  }

  const input: EducationInput = {
    degree: v.degree,
    custom_degree: v.degree === 'Other' ? customDegree : null,
    specialization,
    institution_name: institution,
    start_year: start,
    graduation_year: grad,
    status: v.status,
  };

  const key = (e: Pick<EducationInput, 'degree' | 'custom_degree' | 'specialization' | 'institution_name' | 'start_year'>) =>
    [e.degree, (e.custom_degree || '').toLowerCase(), e.specialization.toLowerCase(), e.institution_name.toLowerCase(), e.start_year].join('|');
  if (existing.some((e) => e.id !== editingId && key(e) === key(input))) {
    return {
      errors: { institution_name: 'This qualification is already on your profile.' },
      input: null,
    };
  }

  return { errors: {}, input };
};
