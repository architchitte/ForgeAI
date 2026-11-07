import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  type TextInputInstance,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useProjectComments } from '../../hooks/useProjectComments';
import { validateCommentContent } from '../../services/engagement';
import { COMMENT_MAX_LENGTH, ProjectComment } from '../../types/engagement';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { CommentIcon, EditIcon, TrashIcon, UserIcon } from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { FadeInView } from '../animation/FadeInView';
import { FocusBorderView } from '../animation/FocusBorderView';
import { staggerDelay } from '../animation/motion';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';

/**
 * Other commenters are labelled from public.profiles (display names only —
 * emails and auth metadata stay private); without a profile name they get a
 * neutral label. The signed-in user's own comments use their own metadata
 * name, so a fresh rename shows immediately.
 */
const FALLBACK_DISPLAY_NAME = COMMUNITY_MEMBER_LABEL;
// Show the remaining-characters counter once the comment gets long.
const COUNTER_THRESHOLD = COMMENT_MAX_LENGTH - 300;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)}d ago`;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// updated_at is set on edit; treat sub-second differences as "not edited".
const wasEdited = (c: ProjectComment): boolean =>
  new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1000;

interface CommentsSectionProps {
  repositoryId: string;
  /** Called with the composer's y offset inside this section when it gains focus. */
  onComposerFocus?: (offsetY: number) => void;
  onComposerBlur?: () => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  repositoryId,
  onComposerFocus,
  onComposerBlur,
}) => {
  const { user } = useAuth();
  const {
    comments,
    displayNames,
    total,
    loading,
    error,
    mutating,
    hasMore,
    loadingMore,
    loadMoreError,
    refresh,
    loadMore,
    addComment,
    editComment,
    removeComment,
  } = useProjectComments(repositoryId);

  const [draft, setDraft] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focused, setFocused] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputRef = useRef<TextInputInstance>(null);
  const composerY = useRef(0);

  const ownDisplayName = useMemo<string>(() => {
    const meta = user?.user_metadata ?? {};
    const name: string = String(meta.full_name || meta.name || meta.user_name || '').trim();
    return name.length > 0 ? name : 'You';
  }, [user]);

  const trimmedLength = draft.trim().length;
  const validationError = trimmedLength > 0 ? validateCommentContent(draft) : null;
  const canSubmit = !!user && trimmedLength > 0 && !validationError && !mutating;

  const resetComposer = () => {
    setDraft('');
    setEditingId(null);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (trimmedLength === 0) setSubmitError('Comment cannot be empty.');
      return;
    }
    setSubmitError(null);
    const err = editingId ? await editComment(editingId, draft) : await addComment(draft);
    if (err) {
      setSubmitError(err);
      return;
    }
    resetComposer();
    inputRef.current?.blur();
  };

  const startEditing = (comment: ProjectComment) => {
    if (mutating) return;
    setEditingId(comment.id);
    setDraft(comment.content);
    setSubmitError(null);
    inputRef.current?.focus();
  };

  const confirmDelete = (comment: ProjectComment) => {
    if (mutating) return;
    Alert.alert('Delete comment?', 'This comment will be permanently removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(comment.id);
          const err = await removeComment(comment.id);
          setDeletingId(null);
          if (err) {
            Alert.alert('Could not delete comment', err);
          } else if (editingId === comment.id) {
            resetComposer();
          }
        },
      },
    ]);
  };

  const renderComment = (comment: ProjectComment, index: number) => {
    const isOwn = !!user && comment.user_id === user.id;
    const profileName = displayNames[comment.user_id];
    const displayName = isOwn ? ownDisplayName : profileName || FALLBACK_DISPLAY_NAME;
    const hasRealName = isOwn ? ownDisplayName !== 'You' : !!profileName;
    const initials = hasRealName
      ? displayName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0].toUpperCase())
          .join('')
      : '';
    const isDeleting = deletingId === comment.id;
    const isBeingEdited = editingId === comment.id;

    return (
      <FadeInView key={comment.id} delay={staggerDelay(index)} offset={4}>
        <View
          style={[
            styles.commentCard,
            isBeingEdited && styles.commentCardEditing,
            isDeleting && styles.commentCardDeleting,
          ]}
        >
          <View style={styles.commentHeader}>
            <View style={styles.commentAvatar}>
              {initials ? (
                <Text style={styles.commentAvatarText}>{initials}</Text>
              ) : (
                <UserIcon size={13} color={STITCH_COLORS.onSurfaceVariant} />
              )}
            </View>
            <View style={styles.commentMeta}>
              <View style={styles.commentNameRow}>
                <Text style={styles.commentName} numberOfLines={1}>
                  {displayName}
                </Text>
                {isOwn && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>You</Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentTime}>
                {formatTimestamp(comment.created_at)}
                {wasEdited(comment) ? ' · edited' : ''}
              </Text>
            </View>

            {isOwn && (
              <View style={styles.commentActions}>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
                ) : (
                  <>
                    <PressableScale
                      style={[styles.iconAction, mutating && styles.disabled]}
                      onPress={() => startEditing(comment)}
                      disabled={mutating}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      activeOpacity={0.6}
                      accessibilityLabel="Edit comment"
                    >
                      <EditIcon size={13} color={STITCH_COLORS.onSurfaceVariant} />
                    </PressableScale>
                    <PressableScale
                      style={[styles.iconAction, mutating && styles.disabled]}
                      onPress={() => confirmDelete(comment)}
                      disabled={mutating}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      activeOpacity={0.6}
                      accessibilityLabel="Delete comment"
                    >
                      <TrashIcon size={13} color={STITCH_COLORS.onSurfaceVariant} />
                    </PressableScale>
                  </>
                )}
              </View>
            )}
          </View>

          <Text style={styles.commentBody}>{comment.content}</Text>
        </View>
      </FadeInView>
    );
  };

  const remaining = COMMENT_MAX_LENGTH - draft.trim().length;

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <CommentIcon size={15} color={STITCH_COLORS.onSurface} />
          <Text style={styles.sectionTitle}>Comments</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{loading ? '–' : total}</Text>
        </View>
      </View>

      {/* Composer */}
      <View
        onLayout={(e) => {
          composerY.current = e.nativeEvent.layout.y;
        }}
      >
        {editingId && (
          <View style={styles.editingBanner}>
            <Text style={styles.editingBannerText}>Editing your comment</Text>
            <PressableScale
              onPress={resetComposer}
              disabled={mutating}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.6}
            >
              <Text style={styles.editingCancel}>Cancel</Text>
            </PressableScale>
          </View>
        )}

        <FocusBorderView
          focused={focused}
          hasError={Boolean(validationError || submitError)}
          style={styles.composer}
        >
          <TextInput
            ref={inputRef}
            style={styles.composerInput}
            value={draft}
            onChangeText={(t) => {
              setDraft(t);
              if (submitError) setSubmitError(null);
            }}
            placeholder={user ? 'Share feedback on this project…' : 'Sign in to comment'}
            placeholderTextColor={STITCH_COLORS.placeholder}
            editable={!!user && !mutating}
            multiline
            maxLength={COMMENT_MAX_LENGTH}
            textAlignVertical="top"
            autoCapitalize="sentences"
            onFocus={() => {
              setFocused(true);
              onComposerFocus?.(composerY.current);
            }}
            onBlur={() => {
              setFocused(false);
              onComposerBlur?.();
            }}
            accessibilityLabel={editingId ? 'Edit comment' : 'Write a comment'}
          />

          <View style={styles.composerFooter}>
            <Text
              style={[styles.counterText, remaining < 0 && styles.counterTextOver]}
            >
              {draft.trim().length >= COUNTER_THRESHOLD
                ? `${remaining} characters left`
                : ''}
            </Text>
            <PressableScale
              style={[styles.postButton, !canSubmit && styles.postButtonDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              activeOpacity={0.8}
              pressedScale={0.96}
              accessibilityState={{ disabled: !canSubmit, busy: mutating }}
            >
              {mutating && !deletingId ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.postButtonText}>{editingId ? 'Save' : 'Post'}</Text>
              )}
            </PressableScale>
          </View>
        </FocusBorderView>

        {(submitError || validationError) && (
          <Text style={styles.inlineError}>{submitError || validationError}</Text>
        )}
      </View>

      {/* List / states */}
      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
          <Text style={styles.stateText}>Loading comments…</Text>
        </View>
      ) : error && comments.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>{error}</Text>
          <PressableScale style={styles.retryButton} onPress={refresh} activeOpacity={0.7}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </PressableScale>
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>No comments yet</Text>
          <Text style={styles.stateText}>Be the first to share feedback on this project.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {error && <Text style={styles.inlineError}>{error}</Text>}
          {comments.map(renderComment)}
          {loadMoreError && <Text style={styles.inlineError}>{loadMoreError}</Text>}
          {hasMore && (
            <PressableScale
              style={[styles.loadMoreButton, loadingMore && styles.disabled]}
              onPress={loadMore}
              disabled={loadingMore}
              activeOpacity={0.7}
              accessibilityState={{ busy: loadingMore, disabled: loadingMore }}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={STITCH_COLORS.onSurfaceVariant} />
              ) : (
                <Text style={styles.loadMoreText}>
                  {loadMoreError ? 'Try again' : 'Load more'} · {total - comments.length} remaining
                </Text>
              )}
            </PressableScale>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  countBadge: {
    minWidth: 24,
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  editingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  editingBannerText: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  editingCancel: {
    fontSize: 12,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  composer: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  composerInput: {
    minHeight: 64,
    maxHeight: 180,
    color: '#EDEDED',
    fontSize: 13.5,
    lineHeight: 19,
    fontFamily: FONTS.sans.regular,
    paddingVertical: 4,
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  counterText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  counterTextOver: {
    color: '#FFFFFF',
  },
  postButton: {
    minWidth: 64,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonDisabled: {
    opacity: 0.35,
  },
  postButtonText: {
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  inlineError: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.error,
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  commentCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
  },
  commentCardEditing: {
    borderColor: '#454545',
  },
  commentCardDeleting: {
    opacity: 0.5,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarText: {
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
  commentMeta: {
    flex: 1,
    minWidth: 0,
  },
  commentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentName: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  youBadge: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#333333',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  commentTime: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  iconAction: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  commentBody: {
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: FONTS.sans.regular,
    color: '#D4D4D4',
  },
  stateBox: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#171717',
    backgroundColor: '#0A0A0A',
    gap: 6,
  },
  stateTitle: {
    fontSize: 13.5,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
  },
  stateText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: STITCH_COLORS.surfaceContainerHigh,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: FONTS.sans.semibold,
    color: STITCH_COLORS.primary,
  },
  loadMoreButton: {
    height: 38,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
});
