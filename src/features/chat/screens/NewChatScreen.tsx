import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ListRenderItem, StyleSheet, Text, View } from 'react-native';
import { SearchIcon } from '../../../components/common/AppIcons';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';
import { ChatEmptyState } from '../components/ChatEmptyState';
import { ChatSearchBar } from '../components/ChatSearchBar';
import { ChatTopBar } from '../components/ChatTopBar';
import { ChatUserRow } from '../components/ChatUserRow';
import { MIN_USER_QUERY_LENGTH, useChatUsers, useStartConversation } from '../hooks/useChatUsers';
import { useHardwareBack } from '../hooks/useHardwareBack';
import { ChatUser } from '../types';

interface NewChatScreenProps {
  onBack: () => void;
  onOpenConversation: (conversationId: string) => void;
}

export const NewChatScreen: React.FC<NewChatScreenProps> = ({ onBack, onOpenConversation }) => {
  const [query, setQuery] = useState<string>('');
  const { users, loading, error } = useChatUsers(query);
  const { start, starting } = useStartConversation();
  useHardwareBack(onBack);

  const handleSelect = useCallback(
    async (user: ChatUser) => {
      const r = await start(user.id);
      if (r.error || !r.data) {
        Alert.alert('Could not open chat', r.error || 'Please try again.');
        return;
      }
      onOpenConversation(r.data.id);
    },
    [start, onOpenConversation]
  );

  const renderItem = useCallback<ListRenderItem<ChatUser>>(
    ({ item }) => <ChatUserRow user={item} onPress={handleSelect} disabled={starting} />,
    [handleSelect, starting]
  );

  const q = query.trim();

  return (
    <View style={styles.screen}>
      <ChatTopBar onBack={onBack} backLabel="Back to chats" />
      <View style={styles.top}>
        <Text style={styles.title} accessibilityRole="header">New chat</Text>
        <ChatSearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or institution"
          style={styles.search}
        />
        {!loading && users.length > 0 && <Text style={styles.sectionLabel}>Results</Text>}
      </View>

      {loading && users.length === 0 ? (
        <ActivityIndicator style={styles.spinner} color={STITCH_COLORS.onSurfaceVariant} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            error ? (
              <ChatEmptyState title="Could not load people" message={error} />
            ) : q.length < MIN_USER_QUERY_LENGTH ? (
              <ChatEmptyState
                icon={<SearchIcon size={20} color="#EDEDED" />}
                title="Find people on Forge"
                message="Search by name or college to start a conversation."
              />
            ) : (
              <ChatEmptyState
                icon={<SearchIcon size={20} color="#EDEDED" />}
                title={`No one matches “${q}”`}
                message="Check the spelling, or search by college or institution instead."
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
  top: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 26, fontFamily: FONTS.sans.semibold, color: '#FFFFFF', letterSpacing: -0.5 },
  search: { marginTop: 12 },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 2,
    fontSize: 11,
    fontFamily: FONTS.mono.medium,
    color: STITCH_COLORS.outline,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  spinner: { marginTop: 40 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1 },
  separator: { height: 1, backgroundColor: '#111111', marginLeft: 54 },
});
