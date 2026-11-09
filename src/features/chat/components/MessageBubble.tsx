import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ENTER_SPRING, QUICK_TIMING } from '../../../components/animation/motion';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';
import { Message } from '../types';
import { formatClockTime } from '../utils/chatTime';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  joinsOlder: boolean;
  joinsNewer: boolean;
  onRetry?: (message: Message) => void;
}

/** Messages this recent at mount get the entrance animation. */
const FRESH_MS = 3000;
const RADIUS = 18;
const JOINED_RADIUS = 6;

const MessageBubbleBase: React.FC<MessageBubbleProps> = ({ message, isOwn, joinsOlder, joinsNewer, onRetry }) => {
  // Decided once: only messages that just arrived/sent animate in, not history.
  const [fresh] = useState(() => Date.now() - new Date(message.createdAt).getTime() < FRESH_MS);
  const enter = useSharedValue(fresh ? 0 : 1);
  const settled = useSharedValue(message.status === 'sending' ? 0 : 1);

  useEffect(() => {
    if (fresh) enter.value = withSpring(1, ENTER_SPRING);
  }, [fresh, enter]);

  useEffect(() => {
    settled.value = withTiming(message.status === 'sending' ? 0 : 1, QUICK_TIMING);
  }, [message.status, settled]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 1.4) * (0.6 + 0.4 * settled.value),
    transform: [{ translateY: (1 - enter.value) * 10 }, { scale: 0.96 + 0.04 * enter.value }],
  }));

  const failed = message.status === 'failed';
  const sending = message.status === 'sending';

  // Flatten the corners that face neighbouring bubbles from the same sender.
  const corners = isOwn
    ? {
        borderTopRightRadius: joinsOlder ? JOINED_RADIUS : RADIUS,
        borderBottomRightRadius: joinsNewer ? JOINED_RADIUS : RADIUS,
      }
    : {
        borderTopLeftRadius: joinsOlder ? JOINED_RADIUS : RADIUS,
        borderBottomLeftRadius: joinsNewer ? JOINED_RADIUS : RADIUS,
      };

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther, { marginTop: joinsOlder ? 2 : 10 }]}>
      <Animated.View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          corners,
          failed && styles.bubbleFailed,
          animatedStyle,
        ]}
        accessible
        accessibilityLabel={`${isOwn ? 'You' : 'They'} said: ${message.body}. ${formatClockTime(message.createdAt)}${sending ? ', sending' : failed ? ', not sent' : ''}`}
      >
        <Text style={[styles.body, isOwn ? styles.bodyOwn : styles.bodyOther]} selectable>
          {message.body}
        </Text>
        <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
          {sending ? 'Sending…' : formatClockTime(message.createdAt)}
        </Text>
      </Animated.View>
      {failed && (
        <Pressable
          onPress={() => onRetry?.(message)}
          hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Message not sent. Tap to retry"
        >
          <Text style={styles.failedText}>Not sent · Tap to retry</Text>
        </Pressable>
      )}
    </View>
  );
};

export const MessageBubble = React.memo(MessageBubbleBase);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12 },
  rowOwn: { alignItems: 'flex-end' },
  rowOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: RADIUS,
  },
  bubbleOwn: { backgroundColor: STITCH_COLORS.primary },
  bubbleOther: {
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  bubbleFailed: { opacity: 0.6 },
  body: { fontSize: 14.5, lineHeight: 20, fontFamily: FONTS.sans.regular },
  bodyOwn: { color: STITCH_COLORS.onPrimary },
  bodyOther: { color: '#EDEDED' },
  time: { marginTop: 2, alignSelf: 'flex-end', fontSize: 10.5, fontFamily: FONTS.sans.regular },
  timeOwn: { color: '#525252' },
  timeOther: { color: STITCH_COLORS.outline },
  failedText: {
    marginTop: 4,
    fontSize: 11.5,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.onSurfaceVariant,
  },
});
