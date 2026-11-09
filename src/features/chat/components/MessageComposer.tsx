import React, { useCallback, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FocusBorderView } from '../../../components/animation/FocusBorderView';
import { PressableScale } from '../../../components/animation/PressableScale';
import { PaperclipIcon, SendIcon, SmileIcon } from '../../../components/common/AppIcons';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';

/** Placeholder quick-pick until a real emoji picker is added. */
const QUICK_EMOJI = ['👍', '😄', '🎉', '🔥', '🙏', '👀', '💡', '🚀', '❤️', '😅'];
const MAX_LENGTH = 4000;

interface MessageComposerProps {
  /** Return true when the message was accepted (the composer then clears). */
  onSend: (text: string) => boolean;
  onAttachmentPress: () => void;
  placeholder?: string;
}

/**
 * Text state lives here, not in the screen, so typing never re-renders the
 * message list.
 */
const MessageComposerBase: React.FC<MessageComposerProps> = ({
  onSend,
  onAttachmentPress,
  placeholder = 'Message',
}) => {
  const [text, setText] = useState<string>('');
  const [focused, setFocused] = useState<boolean>(false);
  const [emojiOpen, setEmojiOpen] = useState<boolean>(false);
  const canSend = text.trim().length > 0;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    if (onSend(text)) setText('');
  }, [canSend, onSend, text]);

  const insertEmoji = (emoji: string) => {
    setText((t) => (t + emoji).slice(0, MAX_LENGTH));
  };

  return (
    <View style={styles.wrap}>
      {emojiOpen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.emojiRow}
        >
          {QUICK_EMOJI.map((e) => (
            <PressableScale
              key={e}
              style={styles.emojiChip}
              onPress={() => insertEmoji(e)}
              pressedScale={0.88}
              accessibilityLabel={`Insert ${e}`}
            >
              <Text style={styles.emoji}>{e}</Text>
            </PressableScale>
          ))}
        </ScrollView>
      )}

      <View style={styles.row}>
        <PressableScale
          style={styles.iconButton}
          onPress={onAttachmentPress}
          activeOpacity={0.6}
          pressedScale={0.9}
          accessibilityLabel="Add attachment"
        >
          <PaperclipIcon size={19} color={STITCH_COLORS.onSurfaceVariant} />
        </PressableScale>

        <FocusBorderView focused={focused} style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={STITCH_COLORS.placeholder}
            multiline
            maxLength={MAX_LENGTH}
            textAlignVertical="center"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel="Message"
          />
          <PressableScale
            style={styles.emojiToggle}
            onPress={() => setEmojiOpen((o) => !o)}
            activeOpacity={0.6}
            pressedScale={0.9}
            accessibilityLabel={emojiOpen ? 'Hide emoji' : 'Show emoji'}
            accessibilityState={{ expanded: emojiOpen }}
          >
            <SmileIcon size={19} color={emojiOpen ? STITCH_COLORS.primary : STITCH_COLORS.onSurfaceVariant} />
          </PressableScale>
        </FocusBorderView>

        <PressableScale
          style={[styles.send, !canSend && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.85}
          pressedScale={0.9}
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
        >
          <SendIcon size={18} color={canSend ? STITCH_COLORS.onPrimary : STITCH_COLORS.outline} />
        </PressableScale>
      </View>
    </View>
  );
};

export const MessageComposer = React.memo(MessageComposerBase);

const CONTROL = 40;

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: '#171717',
    backgroundColor: STITCH_COLORS.background,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
  },
  emojiRow: { gap: 6, paddingHorizontal: 12, paddingTop: 8 },
  emojiChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  iconButton: { width: CONTROL - 4, height: CONTROL, alignItems: 'center', justifyContent: 'center' },
  inputBox: {
    flex: 1,
    minHeight: CONTROL,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#0A0A0A',
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    minHeight: CONTROL - 2,
    maxHeight: 128,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
  },
  emojiToggle: { width: CONTROL - 2, height: CONTROL - 2, alignItems: 'center', justifyContent: 'center' },
  send: {
    width: CONTROL,
    height: CONTROL,
    borderRadius: CONTROL / 2,
    backgroundColor: STITCH_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: '#1F1F1F' },
});
