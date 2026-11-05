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
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { BlueprintFormData, BlueprintFormErrors } from '../../types/blueprint';
import { createRepository } from '../../services/repositories';

const FRAMEWORK_SUGGESTIONS = [
  'LangChain',
  'LlamaIndex',
  'CrewAI',
  'AutoGen',
  'Custom',
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
      const msg = err?.message || 'An unexpected error occurred while publishing.';
      setSubmitError(msg);
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTag}>
              <Text style={styles.headerTagText}>MVP Application Blueprint</Text>
            </View>
            <Text style={styles.title}>Submit Blueprint</Text>
            <Text style={styles.subtitle}>
              Publish your student-built AI application to the ForgeAI repository.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Feedback Banners */}
            {submitSuccess ? (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>
                  Blueprint published successfully to public.repositories!
                </Text>
              </View>
            ) : null}

            {submitError ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{submitError}</Text>
              </View>
            ) : null}

            {/* Field 1: App Name */}
            <Input
              label="App Name *"
              value={formData.appName}
              onChangeText={(text) => handleFieldChange('appName', text)}
              placeholder="e.g., StudyBuddy AI"
              error={(touched.appName || submitted) ? errors.appName : null}
              testID="blueprint-app-name-input"
            />

            {/* Field 2: One-Liner (140 max) */}
            <Input
              label="One-Liner *"
              value={formData.oneLiner}
              onChangeText={(text) => handleFieldChange('oneLiner', text)}
              placeholder="A concise summary of what your agent accomplishes..."
              maxLength={140}
              rightLabel={`${formData.oneLiner.length}/140`}
              error={(touched.oneLiner || submitted) ? errors.oneLiner : null}
              helperText="Maximum 140 characters describing core functionality."
              testID="blueprint-one-liner-input"
            />

            {/* Field 3: Orchestration Framework */}
            <View style={styles.frameworkContainer}>
              <Input
                label="Orchestration Framework *"
                value={formData.orchestrationFramework}
                onChangeText={(text) =>
                  handleFieldChange('orchestrationFramework', text)
                }
                placeholder="e.g., LangChain, LlamaIndex, CrewAI"
                error={
                  (touched.orchestrationFramework || submitted)
                    ? errors.orchestrationFramework
                    : null
                }
                testID="blueprint-framework-input"
              />
              <Text style={styles.chipHeader}>Suggested frameworks:</Text>
              <View style={styles.chipsRow}>
                {FRAMEWORK_SUGGESTIONS.map((framework) => {
                  const isSelected =
                    formData.orchestrationFramework.trim().toLowerCase() ===
                    framework.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={framework}
                      style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                      ]}
                      onPress={() =>
                        handleFieldChange('orchestrationFramework', framework)
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {framework}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Field 4: Complete System Prompt */}
            <Input
              label="Complete System Prompt *"
              value={formData.systemPrompt}
              onChangeText={(text) => handleFieldChange('systemPrompt', text)}
              placeholder="Paste the full, unaltered instructions that guide your agent's reasoning..."
              multiline
              numberOfLines={6}
              error={
                (touched.systemPrompt || submitted) ? errors.systemPrompt : null
              }
              helperText="The complete system prompt powering your application."
              testID="blueprint-system-prompt-input"
            />

            {/* Field 5: Active Deployment Runtime URL */}
            <Input
              label="Active Deployment Runtime URL *"
              value={formData.deploymentUrl}
              onChangeText={(text) => handleFieldChange('deploymentUrl', text)}
              placeholder="https://your-agent.up.railway.app"
              keyboardType="url"
              autoCapitalize="none"
              error={
                (touched.deploymentUrl || submitted)
                  ? errors.deploymentUrl
                  : null
              }
              helperText="Direct public endpoint where the agent is running."
              testID="blueprint-deployment-url-input"
            />

            {/* Form Validation Summary Notice if Invalid */}
            {!isFormValid && submitted ? (
              <View style={styles.validationNotice}>
                <Text style={styles.validationNoticeText}>
                  Please complete all required fields with valid values before
                  publishing.
                </Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.actionButtons}>
              <Button
                title={isSubmitting ? 'Publishing...' : 'Publish Blueprint'}
                onPress={handlePublish}
                disabled={!isFormValid || isSubmitting}
                loading={isSubmitting}
                style={!isFormValid || isSubmitting ? styles.disabledButton : undefined}
                testID="blueprint-publish-button"
              />

              {(formData.appName ||
                formData.oneLiner ||
                formData.orchestrationFramework ||
                formData.systemPrompt ||
                formData.deploymentUrl) && !isSubmitting ? (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resetButtonText}>Clear Form</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 20,
  },
  headerTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 8,
  },
  headerTagText: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  frameworkContainer: {
    marginBottom: 16,
  },
  chipHeader: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
    marginTop: -8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#1D4ED8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  validationNotice: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  validationNoticeText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
  },
  successBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtons: {
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  resetButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  resetButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
