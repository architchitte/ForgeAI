import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FadeInView } from '../../../components/animation/FadeInView';
import { PressableScale } from '../../../components/animation/PressableScale';
import { ChevronDownIcon } from '../../../components/common/AppIcons';
import { Avatar } from '../../../components/common/Avatar';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';
import { ChatEmptyState } from '../components/ChatEmptyState';
import { ChatTopBar } from '../components/ChatTopBar';
import { DateSeparator } from '../components/DateSeparator';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { useChatThread } from '../hooks/useChatThread';
import { useHardwareBack } from '../hooks/useHardwareBack';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { ChatUser } from '../types';
import { ThreadItem, buildThreadItems, messageKey } from '../utils/threadItems';

interface ChatThreadScreenProps {
  conversationId: string;
  onBack: () => void;
}

/** Within this distance of the latest message we follow new messages. */
const NEAR_LATEST_PX = 120;

const ConversationIntro: React.FC<{ user: ChatUser; compact?: boolean }> = ({ user, compact }) => (
  <View style={[styles.intro, compact && styles.introCompact]}>
    <Avatar uri={user.avatarUrl} name={user.isDeleted ? null : user.fullName} size={compact ? 52 : 68} />
    <Text style={styles.introName}>{user.fullName}</Text>
    {user.institution ? <Text style={styles.introMeta}>{user.institution}</Text> : null}
    <Text style={styles.introHint}>
      {compact ? 'This is the beginning of your conversation.' : 'Say hi and start the conversation.'}
    </Text>
  </View>
);

export const ChatThreadScreen: React.FC<ChatThreadScreenProps> = ({ conversationId, onBack }) => {
  const {
    conversation,
    messages,
    currentUserId,
    loading,
    loadingOlder,
    hasOlder,
    error,
    loadOlder,
    send,
    retry,
  } = useChatThread(conversationId);
  useHardwareBack(onBack);
  const keyboard = useKeyboardInset();

  const listRef = useRef<FlatList<ThreadItem>>(null);
  const nearLatest = useRef(true);
  const [showNewPill, setShowNewPill] = useState<boolean>(false);

  const items = useMemo(() => buildThreadItems(messages, currentUserId), [messages, currentUserId]);

  const scrollToLatest = useCallback(() => {
    // Inverted list: offset 0 is the newest message.
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, []);

  // Only touches state when crossing the threshold, not on every scroll frame.
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const near = e.nativeEvent.contentOffset.y < NEAR_LATEST_PX;
    if (near === nearLatest.current) return;
    nearLatest.current = near;
    if (near) setShowNewPill(false);
  }, []);

  // Incoming messages: follow them only if the reader is already at the bottom.
  const newest = messages[0];
  const newestKey = newest ? messageKey(newest) : null;
  const prevNewestKey = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevNewestKey.current;
    prevNewestKey.current = newestKey;
    if (!prev || !newestKey || prev === newestKey || !newest) return;
    if (newest.senderId === currentUserId) return; // own sends scroll in handleSend
    if (nearLatest.current) scrollToLatest();
    else setShowNewPill(true);
    // Keyed on the newest message only; other values are read fresh.
  }, [newestKey]);

  const handleSend = useCallback(
    (text: string) => {
      const accepted = send(text);
      if (accepted) {
        nearLatest.current = true;
        setShowNewPill(false);
        scrollToLatest();
      }
      return accepted;
    },
    [send, scrollToLatest]
  );

  const handleAttachment = useCallback(() => {
    Alert.alert('Attachments', 'Sharing files and images in chats is coming soon.');
  }, []);

  const renderItem = useCallback<ListRenderItem<ThreadItem>>(
    ({ item }) =>
      item.kind === 'date' ? (
        <DateSeparator label={item.label} />
      ) : (
        <MessageBubble
          message={item.message}
          isOwn={item.isOwn}
          joinsOlder={item.joinsOlder}
          joinsNewer={item.joinsNewer}
          onRetry={retry}
        />
      ),
    [retry]
  );

  const participant = conversation?.participant ?? null;

  return (
    <View style={styles.screen}>
      <ChatTopBar
        onBack={onBack}
        backLabel="Back to chats"
        title={participant?.fullName ?? (loading ? ' ' : 'Conversation')}
        subtitle={participant?.institution}
        avatar={
          participant
            ? { uri: participant.avatarUrl, name: participant.isDeleted ? '' : participant.fullName }
            : null
        }
      />

      <View ref={keyboard.ref} collapsable={false} style={[styles.flex, { paddingBottom: keyboard.inset }]}>
        <View style={styles.flex}>
          {loading ? (
            <ActivityIndicator style={styles.spinner} color={STITCH_COLORS.onSurfaceVariant} />
          ) : error && !conversation ? (
            <ChatEmptyState title="Could not open this chat" message={error} actionLabel="Back to chats" onAction={onBack} />
          ) : messages.length === 0 && participant ? (
            <FadeInView offset={6} style={styles.flex}>
              <ConversationIntro user={participant} />
            </FadeInView>
          ) : (
            <FlatList
              ref={listRef}
              data={items}
              inverted
              keyExtractor={(item) => item.key}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              onScroll={handleScroll}
              scrollEventThrottle={64}
              onEndReached={hasOlder ? loadOlder : undefined}
              onEndReachedThreshold={0.4}
              // Keeps the reader's place when messages arrive while scrolled up.
              maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: NEAR_LATEST_PX }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              initialNumToRender={16}
              maxToRenderPerBatch={12}
              windowSize={11}
              ListFooterComponent={
                loadingOlder ? (
                  <ActivityIndicator style={styles.olderSpinner} color={STITCH_COLORS.outline} />
                ) : !hasOlder && participant ? (
                  <ConversationIntro user={participant} compact />
                ) : undefined
              }
            />
          )}

          {showNewPill && (
            <FadeInView offset={6} style={styles.pillWrap} pointerEvents="box-none">
              <PressableScale
                style={styles.pill}
                onPress={() => {
                  setShowNewPill(false);
                  scrollToLatest();
                }}
                pressedScale={0.94}
                accessibilityLabel="Jump to new messages"
              >
                <ChevronDownIcon size={14} color={STITCH_COLORS.onPrimary} />
                <Text style={styles.pillText}>New message</Text>
              </PressableScale>
            </FadeInView>
          )}
        </View>

        {conversation && participant?.isDeleted ? (
          // History stays readable; the server also rejects replies.
          <View style={styles.readOnly}>
            <Text style={styles.readOnlyText}>This account was deleted. You can’t reply to this conversation.</Text>
          </View>
        ) : conversation ? (
          <MessageComposer
            onSend={handleSend}
            onAttachmentPress={handleAttachment}
            placeholder={`Message ${participant?.fullName.split(' ')[0] ?? ''}`.trim()}
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: STITCH_COLORS.background },
  spinner: { marginTop: 40 },
  listContent: { paddingTop: 10, paddingBottom: 6 },
  olderSpinner: { marginVertical: 16 },
  intro: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 56, gap: 4 },
  introCompact: { paddingTop: 24, paddingBottom: 8 },
  introName: { marginTop: 10, fontSize: 16, fontFamily: FONTS.sans.semibold, color: '#FFFFFF' },
  introMeta: { fontSize: 12.5, fontFamily: FONTS.sans.regular, color: STITCH_COLORS.onSurfaceVariant },
  introHint: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.outline,
    textAlign: 'center',
  },
  pillWrap: { position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    backgroundColor: STITCH_COLORS.primary,
  },
  pillText: { fontSize: 12.5, fontFamily: FONTS.sans.semibold, color: STITCH_COLORS.onPrimary },
  readOnly: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#171717',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 12.5,
    lineHeight: 18,
    fontFamily: FONTS.sans.regular,
    color: STITCH_COLORS.outline,
    textAlign: 'center',
  },
});
