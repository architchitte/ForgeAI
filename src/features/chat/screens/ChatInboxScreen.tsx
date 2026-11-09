import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItem, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '../../../components/animation/PressableScale';
import { ArrowLeftIcon, ChatIcon, ComposeIcon } from '../../../components/common/AppIcons';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';
import { ChatEmptyState } from '../components/ChatEmptyState';
import { ChatSearchBar } from '../components/ChatSearchBar';
import { ConversationRow } from '../components/ConversationRow';
import { useConversations } from '../hooks/useConversations';
import { useHardwareBack } from '../hooks/useHardwareBack';
import { Conversation } from '../types';

interface ChatInboxScreenProps {
  onBack: () => void;
  onOpenConversation: (conversationId: string) => void;
  onNewChat: () => void;
}

const norm = (v: string | null | undefined) => (v || '').toLocaleLowerCase().trim();

export const ChatInboxScreen: React.FC<ChatInboxScreenProps> = ({ onBack, onOpenConversation, onNewChat }) => {
  const { conversations, currentUserId, loading, refreshing, error, refresh } = useConversations();
  const [query, setQuery] = useState<string>('');
  const deferredQuery = useDeferredValue(query);
  useHardwareBack(onBack);

  // Client-side filter over loaded conversations (name or last message).
  const shown = useMemo(() => {
    const q = norm(deferredQuery);
    if (!q) return conversations;
    return conversations.filter(
      (c) => norm(c.participant.fullName).includes(q) || norm(c.lastMessage?.body).includes(q)
    );
  }, [conversations, deferredQuery]);

  const handlePress = useCallback((c: Conversation) => onOpenConversation(c.id), [onOpenConversation]);

  const renderItem = useCallback<ListRenderItem<Conversation>>(
    ({ item }) => <ConversationRow conversation={item} currentUserId={currentUserId} onPress={handlePress} />,
    [currentUserId, handlePress]
  );

  const hasConversations = conversations.length > 0;

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <PressableScale
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Back"
          >
            <ArrowLeftIcon size={18} color={STITCH_COLORS.primary} />
          </PressableScale>
          <Text style={styles.title} accessibilityRole="header">Chats</Text>
          <PressableScale
            style={styles.newButton}
            onPress={onNewChat}
            activeOpacity={0.8}
            pressedScale={0.94}
            accessibilityLabel="New chat"
          >
            <ComposeIcon size={16} color={STITCH_COLORS.onSurface} />
          </PressableScale>
        </View>
        {hasConversations && (
          <ChatSearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name or message"
            style={styles.search}
          />
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.spinner} color={STITCH_COLORS.onSurfaceVariant} />
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={12}
          windowSize={7}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={STITCH_COLORS.primary}
              colors={[STITCH_COLORS.primary]}
            />
          }
          ListEmptyComponent={
            error ? (
              <ChatEmptyState title="Could not load chats" message={error} actionLabel="Try again" onAction={refresh} />
            ) : hasConversations ? (
              <ChatEmptyState
                title={`No chats match “${query.trim()}”`}
                message="Try a different name or a word from the conversation."
              />
            ) : (
              <ChatEmptyState
                icon={<ChatIcon size={22} color="#EDEDED" />}
                title="No conversations yet"
                message="Message founders and builders on Forge to swap ideas, give feedback or team up."
                actionLabel="Start a chat"
                onAction={onNewChat}
              />
            )
          }
        />
      )}
    </View>
  );
};

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: STITCH_COLORS.background },
  top: { paddingHorizontal: 16, paddingTop: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { paddingVertical: 6, paddingRight: 2 },
  title: { flex: 1, fontSize: 26, fontFamily: FONTS.sans.semibold, color: '#FFFFFF', letterSpacing: -0.5 },
  newButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: { marginTop: 12, marginBottom: 4 },
  spinner: { marginTop: 40 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },
  separator: { height: 1, backgroundColor: '#111111', marginLeft: 58 },
});
