import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { PressableScale } from '../../components/animation/PressableScale';
import { BlueprintFormData, BlueprintFormErrors } from '../../types/blueprint';
import { createRepository } from '../../services/repositories';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { RocketIcon } from '../../components/navigation/NavIcons';
import { ScreenshotPickerSection } from '../../components/screenshot/ScreenshotPickerSection';
import { saveScreenshot } from '../../services/screenshots';
import { PickedScreenshot, ScreenshotType } from '../../types/screenshot';
import { TechnologySelector } from '../../components/technology/TechnologySelector';
import { SelectedTechnology, buildFrameworkSummary } from '../../constants/technologies';
import { replaceProjectTechnologies } from '../../services/technologies';

interface SubmitBlueprintScreenProps {
  onSuccess?: () => void;
}

export const SubmitBlueprintScreen: React.FC<SubmitBlueprintScreenProps> = ({
  onSuccess,
}) => {
  const { user, session } = useAuth();

  const [formData, setFormData] = useState<BlueprintFormData>({
    appName: '',
    oneLiner: '',
    orchestrationFramework: '',
    systemPrompt: '',
    deploymentUrl: '',
  });

  const [touched, setTouched] = useState<Record<keyof BlueprintFormData, boolean>>({
    appName: false,
    oneLiner: false,
    orchestrationFramework: false,
    systemPrompt: false,
    deploymentUrl: false,
  });

  const [submitted, setSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  // Optional project screenshot, uploaded only after the project is created.
  const [screenshotType, setScreenshotType] = useState<ScreenshotType>('desktop');
  const [screenshot, setScreenshot] = useState<PickedScreenshot | null>(null);

  // AI technologies (multi-select). repositories.framework receives a
  // readable summary of these for backward compatibility.
  const [technologies, setTechnologies] = useState<SelectedTechnology[]>([]);

  // Validate URL (must start with http:// or https:// and form a valid URL)
  const isValidUrl = (url: string): boolean => {
    const trimmed = url.trim();
    if (!trimmed) return false;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Compute validation errors
  const errors: BlueprintFormErrors = useMemo(() => {
    const errs: BlueprintFormErrors = {};

    if (!formData.appName.trim()) {
      errs.appName = 'App Name is required.';
    }

    if (!formData.oneLiner.trim()) {
      errs.oneLiner = 'One-Liner is required.';
    } else if (formData.oneLiner.length > 140) {
      errs.oneLiner = 'One-Liner must not exceed 140 characters.';
    }

    // Still required (the MVP form requires a framework), now as >= 1 technology.
    if (technologies.length === 0) {
      errs.orchestrationFramework = 'Select at least one AI technology or framework.';
    }

    if (!formData.systemPrompt.trim()) {
      errs.systemPrompt = 'Project Description is required.';
    }

    if (!formData.deploymentUrl.trim()) {
      errs.deploymentUrl = 'Active Deployment Runtime URL is required.';
    } else if (!isValidUrl(formData.deploymentUrl)) {
      errs.deploymentUrl = 'Please enter a valid HTTP or HTTPS deployment URL.';
    }

    return errs;
  }, [formData, technologies]);

  const isFormValid = Object.keys(errors).length === 0;

  const handleFieldChange = (field: keyof BlueprintFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (submitError) setSubmitError(null);
    if (submitSuccess) setSubmitSuccess(false);
  };

  const handleReset = () => {
    setFormData({
      appName: '',
      oneLiner: '',
      orchestrationFramework: '',
      systemPrompt: '',
      deploymentUrl: '',
    });
    setTouched({
      appName: false,
      oneLiner: false,
      orchestrationFramework: false,
      systemPrompt: false,
      deploymentUrl: false,
    });
    setSubmitted(false);
    setScreenshotType('desktop');
    setScreenshot(null);
    setTechnologies([]);
  };

  const handlePublish = async () => {
    setSubmitted(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    // 1. Verify all required fields are valid
    if (!isFormValid) {
      setTouched({
        appName: true,
        oneLiner: true,
        orchestrationFramework: true,
        systemPrompt: true,
        deploymentUrl: true,
      });
      return;
    }

    // 2. Verify valid authenticated Supabase session exists
    if (!session || !user) {
      const authErr = 'You must be signed in to publish a blueprint.';
      setSubmitError(authErr);
      Alert.alert('Authentication Required', authErr);
      return;
    }

    // 3. Prevent duplicate in-flight submissions
    if (isSubmitting) return;

    // 4. Obtain authenticated user's email
    const studentEmail = user.email || session.user?.email;
    if (!studentEmail) {
      const emailErr = 'Authenticated user email could not be determined.';
      setSubmitError(emailErr);
      Alert.alert('Error', emailErr);
      return;
    }

    // 5. Populate student_name and university only if available in metadata
    const studentName =
      (user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.user_name)?.toString() || null;
    const university =
      user.user_metadata?.university?.toString() || null;

    try {
      setIsSubmitting(true);

      const result = await createRepository({
        app_name: formData.appName.trim(),
        one_liner: formData.oneLiner.trim(),
        framework: buildFrameworkSummary(technologies),
        system_prompt: formData.systemPrompt.trim(),
        agent_execution_url: formData.deploymentUrl.trim(),
        student_email: studentEmail,
        student_name: studentName,
        university: university,
      });

      if (result.error) {
        setSubmitError(result.error);
        Alert.alert('Publication Failed', result.error);
        return;
      }

      // Technologies + optional screenshot. The project is already published,
      // so failures here never undo the submission — the owner can fix them
      // from Profile → Edit / the project page.
      let screenshotNote = '';
      if (result.data?.id) {
        const techs = await replaceProjectTechnologies(result.data.id, technologies);
        if (techs.error) {
          screenshotNote += `\n\nThe technology list could not be saved (${techs.error}). You can update it from your Profile.`;
        }
      }
      if (screenshot && result.data?.id) {
        const shot = await saveScreenshot({
          repositoryId: result.data.id,
          userId: user.id,
          picked: screenshot,
          type: screenshotType,
          existing: null,
        });
        if (shot.error) {
          screenshotNote += `\n\nThe screenshot could not be uploaded (${shot.error}). You can add it from the project page.`;
        }
      }

      setSubmitSuccess(true);
      Alert.alert(
        'Blueprint Published! 🚀',
        `"${formData.appName}" has been successfully published to the Forge repository.${screenshotNote}`,
        [{ text: 'OK' }]
      );

      // Reset form on success
      handleReset();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('[SubmitBlueprint] Unexpected error:', err);
      const msg = err?.message || 'Failed to submit blueprint.';
      setSubmitError(msg);
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldError = (field: keyof BlueprintFormData): string | null => {
    if (submitted || touched[field]) {
      return errors[field] || null;
    }
    return null;
  };

  const oneLinerCharCount = formData.oneLiner.length;

  return (
    <View style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.pingBeacon} />
              <Text style={styles.badgeText}>Application Blueprint</Text>
            </View>
            <Text style={styles.title}>Submit Project</Text>
            <Text style={styles.subtitle}>
              Publish your student AI application to the Forge showcase repository.
            </Text>
          </View>

          {/* Form Surface Card */}
          <View style={styles.card}>
            {submitSuccess && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>
                  ✓ Blueprint published successfully to Supabase!
                </Text>
              </View>
            )}

            {submitError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            )}

            {/* Field 1: App Name */}
            <View style={styles.formGroup}>
              <Input
                label="App Name *"
                value={formData.appName}
                onChangeText={(text) => handleFieldChange('appName', text)}
                placeholder="e.g., CampusSyllabus Copilot"
                error={getFieldError('appName')}
                autoCapitalize="words"
                containerStyle={styles.inputContainer}
                testID="blueprint-app-name-input"
              />
            </View>

            {/* Field 2: One-Liner (0/140) */}
            <View style={styles.formGroup}>
              <Input
                label="One-Liner *"
                value={formData.oneLiner}
                onChangeText={(text) => handleFieldChange('oneLiner', text)}
                placeholder="Brief description of what your AI agent accomplishes..."
                maxLength={150}
                multiline
                numberOfLines={3}
                rightLabel={`${oneLinerCharCount}/140`}
                error={getFieldError('oneLiner')}
                containerStyle={styles.inputContainer}
                testID="blueprint-one-liner-input"
              />
            </View>

            {/* Field 3: AI Technologies & Frameworks (multi-select) */}
            <View style={styles.formGroup}>
              <TechnologySelector
                value={technologies}
                onChange={(next) => {
                  setTechnologies(next);
                  setTouched((prev) => ({ ...prev, orchestrationFramework: true }));
                  if (submitError) setSubmitError(null);
                  if (submitSuccess) setSubmitSuccess(false);
                }}
                error={getFieldError('orchestrationFramework')}
                disabled={isSubmitting}
                required
              />
            </View>

            {/* Field 4: Project Description (stored in system_prompt) */}
            <View style={styles.formGroup}>
              <Input
                label="Project Description *"
                value={formData.systemPrompt}
                onChangeText={(text) => handleFieldChange('systemPrompt', text)}
                placeholder="Describe what your project does, who it's for, and how it works..."
                multiline
                numberOfLines={6}
                autoCapitalize="sentences"
                error={getFieldError('systemPrompt')}
                helperText="Leave a blank line to start a new paragraph."
                containerStyle={styles.inputContainer}
                testID="blueprint-system-prompt-input"
              />
            </View>

            {/* Field 5: Active Deployment Runtime URL */}
            <View style={styles.formGroup}>
              <Input
                label="Active Deployment Runtime URL *"
                value={formData.deploymentUrl}
                onChangeText={(text) =>
                  handleFieldChange('deploymentUrl', text)
                }
                placeholder="Streamlit, Vercel, or Deployed Application Link"
                keyboardType="url"
                autoCapitalize="none"
                error={getFieldError('deploymentUrl')}
                helperText="Must be a valid HTTP or HTTPS endpoint accessible by external clients."
                containerStyle={styles.inputContainer}
                testID="blueprint-deployment-url-input"
              />
            </View>

            {/* Optional: Project Screenshot */}
            <View style={styles.formGroup}>
              <ScreenshotPickerSection
                type={screenshotType}
                onTypeChange={setScreenshotType}
                picked={screenshot}
                onPickedChange={setScreenshot}
                disabled={isSubmitting}
                optional
              />
            </View>

            {/* Submit Action */}
            <Button
              title="Publish Blueprint"
              onPress={handlePublish}
              loading={isSubmitting}
              disabled={isSubmitting || !isFormValid}
              rightIcon={<RocketIcon size={16} color="#000000" />}
              style={styles.publishBtn}
              testID="blueprint-publish-button"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    marginBottom: 8,
    gap: 6,
  },
  pingBeacon: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#262626',
  },
  successBanner: {
    backgroundColor: '#111111',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFFFFF',
  },
  successBannerText: {
    color: '#EDEDED',
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
  },
  errorBanner: {
    backgroundColor: '#1F1F1F',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#737373',
  },
  errorBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
  },
  formGroup: {
    marginBottom: 16,
  },
  inputContainer: {
    marginVertical: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
    marginBottom: 6,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: FONTS.sans.medium,
  },
  publishIcon: {
    fontSize: 16,
    fontFamily: FONTS.sans.regular,
    color: '#000000',
  },
  publishBtn: {
    marginTop: 8,
  },
});
