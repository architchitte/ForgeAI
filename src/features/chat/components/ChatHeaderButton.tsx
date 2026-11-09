import React from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { PressableScale } from '../../../components/animation/PressableScale';
import { ChatIcon } from '../../../components/common/AppIcons';
import { STITCH_COLORS } from '../../../constants/theme';
import { useUnreadTotal } from '../hooks/useUnreadTotal';
import { UnreadBadge } from './UnreadBadge';

interface ChatHeaderButtonProps {
  onPress: () => void;
  /** True while a chat screen is showing. */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** App-bar entry point to Chats, with the total unread badge. */
export const ChatHeaderButton: React.FC<ChatHeaderButtonProps> = ({ onPress, active = false, style }) => {
  const unread = useUnreadTotal();
  return (
    <PressableScale
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
      pressedScale={0.92}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      accessibilityLabel={unread > 0 ? `Chats, ${unread} unread` : 'Chats'}
      accessibilityState={{ selected: active }}
    >
      <ChatIcon size={20} color={active ? STITCH_COLORS.primary : '#EDEDED'} />
      <UnreadBadge count={unread} ringColor="#000000" style={styles.badge} />
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
  },
});
