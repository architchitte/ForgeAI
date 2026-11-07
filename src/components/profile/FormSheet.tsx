import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { CloseIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';

interface FormSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Primary action (e.g. Save). */
  submitLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  /** Optional destructive action shown left of the primary button. */
  destructiveLabel?: string;
  onDestructive?: () => void;
  children: React.ReactNode;
}

/**
 * Full-screen form used by the profile editors. Android renders a Modal in
 * its own edge-to-edge window, so it gets its own SafeAreaProvider (clear
 * of notch / nav bar) and keyboard padding on both platforms (the window
 * does not resize for the keyboard when drawn edge-to-edge).
 */
export const FormSheet: React.FC<FormSheetProps> = ({
  visible,
  title,
  subtitle,
  onClose,
  submitLabel,
  onSubmit,
  submitting,
  submitDisabled,
  destructiveLabel,
  onDestructive,
  children,
}) => {
  const close = () => {
    if (!submitting) onClose();
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom', 'left', 'right']}>
          <KeyboardAvoidingView style={styles.flex} behavior="padding">
            <View style={styles.header}>
              <View style={styles.flex}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <PressableScale
                style={[styles.closeButton, submitting && styles.disabled]}
                onPress={close}
                disabled={submitting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
                accessibilityLabel="Close"
              >
                <CloseIcon size={16} color="#FFFFFF" />
              </PressableScale>
            </View>

            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>

            <View style={styles.footer}>
              {destructiveLabel && onDestructive ? (
                <PressableScale
                  style={[styles.destructiveButton, submitting && styles.disabled]}
                  onPress={onDestructive}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.destructiveText}>{destructiveLabel}</Text>
                </PressableScale>
              ) : null}
              <PressableScale
                style={[styles.submitButton, (submitDisabled || submitting) && styles.submitDisabled]}
                onPress={onSubmit}
                disabled={submitDisabled || submitting}
                activeOpacity={0.85}
                pressedScale={0.98}
                accessibilityState={{ disabled: submitDisabled || submitting, busy: submitting }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text style={styles.submitText}>{submitLabel}</Text>
                )}
              </PressableScale>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sheet: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    paddingBottom: 32,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#171717',
  },
  submitButton: {
    flex: 1,
    height: 46,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.35,
  },
  submitText: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  destructiveButton: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveText: {
    fontSize: 14,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  disabled: {
    opacity: 0.4,
  },
});
