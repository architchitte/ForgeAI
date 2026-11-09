import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../../components/animation/PressableScale';
import { Avatar } from '../../../components/common/Avatar';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';
import { Conversation } from '../types';
import { formatConversationTime } from '../utils/chatTime';
import { UnreadBadge } from './UnreadBadge';

interface ConversationRowProps {
  conversation: Conversation;
  currentUserId: string;
  onPress: (conversation: Conversation) => void;
}

const ConversationRowBase: React.FC<ConversationRowProps> = ({ conversation, currentUserId, onPress }) => {
  const { participant, lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;
  const own = lastMessage?.senderId === currentUserId;
  // Single-line preview: collapse line breaks.
  const preview = lastMessage ? lastMessage.body.replace(/\s*\n\s*/g, ' ') : '';
  const time = lastMessage ? formatConversationTime(lastMessage.createdAt) : '';

  return (
    <PressableScale
      style={styles.row}
      onPress={() => onPress(conversation)}
      activeOpacity={0.85}
      pressedScale={0.985}
      accessibilityLabel={`${participant.fullName}${unread ? `, ${unreadCount} unread` : ''}. ${own ? 'You: ' : ''}${preview}. ${time}`}
    >
      <Avatar uri={participant.avatarUrl} name={participant.isDeleted ? null : participant.fullName} size={46} />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={styles.name} numberOfLines={1}>{participant.fullName}</Text>
          <Text style={[styles.time, unread && styles.timeUnread]}>{time}</Text>
        </View>
        <View style={styles.line}>
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={1}>
            {own ? <Text style={styles.you}>You: </Text> : null}
            {preview}
          </Text>
          <UnreadBadge count={unreadCount} />
        </View>
      </View>
    </PressableScale>
  );
};

export const ConversationRow = React.memo(ConversationRowBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 14.5, fontFamily: FONTS.sans.semibold, color: '#FFFFFF' },
  time: { fontSize: 11.5, fontFamily: FONTS.sans.regular, color: STITCH_COLORS.outline },
  timeUnread: { fontFamily: FONTS.sans.medium, color: '#EDEDED' },
  preview: { flex: 1, fontSize: 13, lineHeight: 18, fontFamily: FONTS.sans.regular, color: STITCH_COLORS.onSurfaceVariant },
  previewUnread: { fontFamily: FONTS.sans.medium, color: '#EDEDED' },
  you: { color: STITCH_COLORS.outline },
});
