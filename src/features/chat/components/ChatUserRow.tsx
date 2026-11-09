import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../../components/animation/PressableScale';
import { ArrowRightIcon } from '../../../components/common/AppIcons';
import { Avatar } from '../../../components/common/Avatar';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';
import { ChatUser } from '../types';

interface ChatUserRowProps {
  user: ChatUser;
  onPress: (user: ChatUser) => void;
  disabled?: boolean;
}

const ChatUserRowBase: React.FC<ChatUserRowProps> = ({ user, onPress, disabled }) => (
  <PressableScale
    style={[styles.row, disabled && styles.disabled]}
    onPress={() => onPress(user)}
    disabled={disabled}
    activeOpacity={0.85}
    pressedScale={0.985}
    accessibilityLabel={`Message ${user.fullName}${user.institution ? `, ${user.institution}` : ''}`}
  >
    <Avatar uri={user.avatarUrl} name={user.fullName} size={42} />
    <View style={styles.body}>
      <Text style={styles.name} numberOfLines={1}>{user.fullName}</Text>
      {user.institution ? (
        <Text style={styles.institution} numberOfLines={1}>{user.institution}</Text>
      ) : null}
    </View>
    <ArrowRightIcon size={14} color={STITCH_COLORS.outline} />
  </PressableScale>
);

export const ChatUserRow = React.memo(ChatUserRowBase);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  disabled: { opacity: 0.5 },
  body: { flex: 1, minWidth: 0 },
  name: { fontSize: 14.5, fontFamily: FONTS.sans.semibold, color: '#FFFFFF' },
  institution: { marginTop: 2, fontSize: 12, fontFamily: FONTS.sans.regular, color: STITCH_COLORS.onSurfaceVariant },
});
