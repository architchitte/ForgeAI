import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { BlueprintFormData, BlueprintFormErrors } from '../../types/blueprint';
import { createRepository } from '../../services/repositories';
import { STITCH_COLORS, STITCH_ASSETS } from '../../constants/theme';

const FRAMEWORK_SUGGESTIONS = [
  'LangGraph',
  'CrewAI',
  'DSPy',
  'AutoGen',
];

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

    if (!formData.orchestrationFramework.trim()) {
      errs.orchestrationFramework = 'Orchestration Framework is required.';
    }

    if (!formData.systemPrompt.trim()) {
      errs.systemPrompt = 'Complete System Prompt is required.';
    }

    if (!formData.deploymentUrl.trim()) {
      errs.deploymentUrl = 'Active Deployment Runtime URL is required.';
    } else if (!isValidUrl(formData.deploymentUrl)) {
      errs.deploymentUrl = 'Please enter a valid HTTP or HTTPS deployment URL.';
    }

    return errs;
  }, [formData]);

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
        framework: formData.orchestrationFramework.trim(),
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

      setSubmitSuccess(true);
      Alert.alert(
        'Blueprint Published! 🚀',
        `"${formData.appName}" has been successfully published to the ForgeAI repository.`,
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
  const isOneLinerOverLimit = oneLinerCharCount > 140;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Ambient Glow */}
          <View style={styles.ambientGlow} pointerEvents="none" />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.pingBeacon} />
              <Text style={styles.badgeText}>APPLICATION BLUEPRINT</Text>
            </View>
            <Text style={styles.title}>Submit Project</Text>
            <Text style={styles.subtitle}>
              Publish your student AI application to the ForgeAI singularity repository.
            </Text>
          </View>

          {/* Form Surface Card */}
          <View style={styles.card}>
            <View style={styles.photonLine} />

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

            {/* Field 3: Orchestration Framework */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Orchestration Framework *</Text>
              <View style={styles.chipsContainer}>
                {FRAMEWORK_SUGGESTIONS.map((fw) => {
                  const isSelected =
                    formData.orchestrationFramework.toLowerCase() ===
                    fw.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={fw}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                      onPress={() => {
                        handleFieldChange(
                          'orchestrationFramework',
                          isSelected ? '' : fw
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextActive,
                        ]}
                      >
                        {fw}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {getFieldError('orchestrationFramework') ? (
                <Text style={styles.errorText}>
                  {getFieldError('orchestrationFramework')}
                </Text>
              ) : null}
            </View>

            {/* Field 4: Complete System Prompt */}
            <View style={styles.formGroup}>
              <View style={styles.terminalLabelRow}>
                <Text style={styles.fieldLabel}>Complete System Prompt *</Text>
                <Text style={styles.terminalPromptTag}>agent_system_v1.prompt</Text>
              </View>
              <Input
                value={formData.systemPrompt}
                onChangeText={(text) => handleFieldChange('systemPrompt', text)}
                placeholder="Paste the full, exact system prompt used by your agent..."
                multiline
                numberOfLines={6}
                error={getFieldError('systemPrompt')}
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
                placeholder="https://agent.example.com/api"
                keyboardType="url"
                autoCapitalize="none"
                error={getFieldError('deploymentUrl')}
                helperText="Must be a valid HTTP or HTTPS endpoint accessible by external clients."
                containerStyle={styles.inputContainer}
                testID="blueprint-deployment-url-input"
              />
            </View>

            {/* Submit Action */}
            <Button
              title="Publish Blueprint"
              onPress={handlePublish}
              loading={isSubmitting}
              disabled={isSubmitting || !isFormValid}
              icon={<Text style={styles.publishIcon}>🚀</Text>}
              style={styles.publishBtn}
              testID="blueprint-publish-button"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  ambientGlow: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    width: 260,
    height: 180,
    borderRadius: 130,
    backgroundColor: STITCH_COLORS.primaryContainer,
    opacity: 0.1,
  },
  header: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  pingBeacon: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: STITCH_COLORS.primaryContainer,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: STITCH_COLORS.primary,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: STITCH_COLORS.onSurface,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: STITCH_COLORS.onSurfaceVariant,
    marginTop: 4,
  },
  card: {
    backgroundColor: STITCH_COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest + '60',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  photonLine: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: STITCH_COLORS.primaryContainer,
    opacity: 0.7,
  },
  successBanner: {
    backgroundColor: '#064E3B',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: STITCH_COLORS.success,
  },
  successBannerText: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: STITCH_COLORS.errorContainer,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: STITCH_COLORS.error,
  },
  errorBannerText: {
    color: STITCH_COLORS.onSurface,
    fontSize: 12,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  inputContainer: {
    marginVertical: 0,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: STITCH_COLORS.onSurfaceVariant,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  terminalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  terminalPromptTag: {
    fontSize: 10,
    color: STITCH_COLORS.outline,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: STITCH_COLORS.surfaceContainerHighest,
  },
  chipActive: {
    backgroundColor: STITCH_COLORS.primaryContainer,
    borderColor: STITCH_COLORS.primaryContainer,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: STITCH_COLORS.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: STITCH_COLORS.error,
    fontWeight: '500',
  },
  publishIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  publishBtn: {
    marginTop: 14,
  },
});
