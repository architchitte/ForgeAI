import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  type TextInputInstance,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useProjectComments } from '../../hooks/useProjectComments';
import { validateCommentContent } from '../../services/engagement';
import { COMMENT_MAX_LENGTH, ProjectComment } from '../../types/engagement';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { CommentIcon, EditIcon, HeartIcon, TrashIcon, UserIcon } from '../common/AppIcons';
import { LikersSheet } from '../engagement/LikersSheet';
import { PressableScale } from '../animation/PressableScale';
import { FadeInView } from '../animation/FadeInView';
import { FocusBorderView } from '../animation/FocusBorderView';
import { staggerDelay } from '../animation/motion';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';
import { getAvatarUrl } from '../../services/ownProfile';

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

/** Commenter picture; falls back to initials, then a generic icon. */
const CommentAvatar: React.FC<{ uri: string | null; initials: string; name: string }> = ({
  uri,
  initials,
  name,
}) => {
  const [failed, setFailed] = useState<boolean>(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <View style={styles.commentAvatar}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={styles.commentAvatarImg}
          onError={() => setFailed(true)}
          accessibilityLabel={`${name}'s profile picture`}
        />
      ) : initials ? (
        <Text style={styles.commentAvatarText}>{initials}</Text>
      ) : (
        <UserIcon size={13} color={STITCH_COLORS.onSurfaceVariant} />
      )}
    </View>
  );
};

interface CommentEditorProps {
  initialValue: string;
  saving: boolean;
  /** Resolves to an error message, or null on success. */
  onSave: (content: string) => Promise<string | null>;
  onCancel: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Primary button label (default "Save"; replies use "Reply"). */
  submitLabel?: string;
  placeholder?: string;
}

/**
 * Inline editor shown inside the comment's own card, separate from the
 * new-comment composer. Save is enabled only for a valid, changed comment.
 * Also used as the reply composer.
 */
const CommentEditor: React.FC<CommentEditorProps> = ({
  initialValue,
  saving,
  onSave,
  onCancel,
  onFocus,
  onBlur,
  submitLabel = 'Save',
  placeholder = 'Edit your comment…',
}) => {
  const [value, setValue] = useState<string>(initialValue);
  const [focused, setFocused] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const trimmed = value.trim();
  const validationError = validateCommentContent(value);
  const unchanged = trimmed === initialValue.trim();
  const canSave = !validationError && !unchanged && !saving;
  const remaining = COMMENT_MAX_LENGTH - trimmed.length;
  const shownError = saveError || validationError;

  const handleSave = async () => {
    if (!canSave) return;
    setSaveError(null);
    const err = await onSave(value);
    if (err) setSaveError(err);
  };

  return (
    <View>
      <FocusBorderView
        focused={focused}
        hasError={Boolean(shownError)}
        style={styles.editor}
      >
        <TextInput
          style={styles.editorInput}
          value={value}
          onChangeText={(t) => {
            setValue(t);
            if (saveError) setSaveError(null);
          }}
          autoFocus
          editable={!saving}
          multiline
          maxLength={COMMENT_MAX_LENGTH}
          textAlignVertical="top"
          autoCapitalize="sentences"
          placeholder={placeholder}
          placeholderTextColor={STITCH_COLORS.placeholder}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          accessibilityLabel="Edit comment"
        />
      </FocusBorderView>

      <View style={styles.editorFooter}>
        <Text style={styles.counterText}>
          {trimmed.length >= COUNTER_THRESHOLD ? `${remaining} characters left` : ''}
        </Text>
        <PressableScale
          style={[styles.editorCancel, saving && styles.disabled]}
          onPress={onCancel}
          disabled={saving}
          activeOpacity={0.7}
          accessibilityLabel="Cancel editing"
        >
          <Text style={styles.editorCancelText}>Cancel</Text>
        </PressableScale>
        <PressableScale
          style={[styles.editorSave, !canSave && styles.postButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
          pressedScale={0.96}
          accessibilityState={{ disabled: !canSave, busy: saving }}
          accessibilityLabel={`${submitLabel} comment`}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.postButtonText}>{submitLabel}</Text>
          )}
        </PressableScale>
      </View>

      {shownError && <Text style={styles.inlineError}>{shownError}</Text>}
    </View>
  );
};

interface CommentsSectionProps {
  repositoryId: string;
  /**
   * Called when a text input in this section (composer or inline editor)
   * gains focus, with its y offset inside the section, so the parent can
   * scroll it above the keyboard.
   */
  onInputFocus?: (offsetY: number) => void;
  onInputBlur?: () => void;
  /** Opens a commenter's / liker's profile. */
  onOpenUser?: (userId: string) => void;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  repositoryId,
  onInputFocus,
  onInputBlur,
  onOpenUser,
}) => {
  const { user } = useAuth();
  const {
    comments,
    displayNames,
    avatarPaths,
    total,
    allTotal,
    replies,
    repliesSupported,
    commentLikes,
    commentLikesSupported,
    commentLikePending,
    toggleCommentLike,
    addReply,
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

  // New-comment composer (top of the section) — never used for editing.
  const [draft, setDraft] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [focused, setFocused] = useState<boolean>(false);
  const [posting, setPosting] = useState<boolean>(false);
  // Inline editing happens inside the comment's own card.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Replies: one composer at a time, under the thread's top-level comment.
  const [replyingTo, setReplyingTo] = useState<{ parentId: string; mention: string } | null>(null);
  const [postingReply, setPostingReply] = useState<boolean>(false);
  const [expandedThreads, setExpandedThreads] = useState<Record<string, true>>({});
  // Hold a comment's heart → who liked it.
  const [likersComment, setLikersComment] = useState<string | null>(null);

  const inputRef = useRef<TextInputInstance>(null);
  const composerY = useRef(0);
  // Layout offsets used to scroll a focused inline editor into view.
  const listY = useRef(0);
  const cardY = useRef<Record<string, number>>({});

  // Drop edit mode if the comment disappears (e.g. deleted elsewhere).
  useEffect(() => {
    if (!editingId) return;
    const exists =
      comments.some((c) => c.id === editingId) ||
      Object.values(replies).some((list) => list.some((r) => r.id === editingId));
    if (!exists) setEditingId(null);
  }, [comments, replies, editingId]);

  const ownDisplayName = useMemo<string>(() => {
    const meta = user?.user_metadata ?? {};
    const name: string = String(meta.full_name || meta.name || meta.user_name || '').trim();
    return name.length > 0 ? name : 'You';
  }, [user]);

  const trimmedLength = draft.trim().length;
  const validationError = trimmedLength > 0 ? validateCommentContent(draft) : null;
  const canSubmit = !!user && trimmedLength > 0 && !validationError && !mutating;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (trimmedLength === 0) setSubmitError('Comment cannot be empty.');
      return;
    }
    setSubmitError(null);
    setPosting(true);
    const err = await addComment(draft);
    setPosting(false);
    if (err) {
      setSubmitError(err);
      return;
    }
    setDraft('');
    inputRef.current?.blur();
  };

  const startEditing = (comment: ProjectComment) => {
    if (mutating) return;
    setEditingId(comment.id);
  };

  const handleSaveEdit = async (commentId: string, content: string): Promise<string | null> => {
    setSavingEdit(true);
    const err = await editComment(commentId, content);
    setSavingEdit(false);
    if (!err) setEditingId(null);
    return err;
  };

  const startReply = (parentId: string, mentionName: string | null) => {
    if (mutating) return;
    setEditingId(null);
    setReplyingTo({ parentId, mention: mentionName ? `@${mentionName} ` : '' });
    setExpandedThreads((prev) => ({ ...prev, [parentId]: true }));
  };

  const handleSendReply = async (content: string): Promise<string | null> => {
    if (!replyingTo) return null;
    setPostingReply(true);
    const err = await addReply(replyingTo.parentId, content);
    setPostingReply(false);
    if (!err) setReplyingTo(null);
    return err;
  };

  const confirmDelete = (comment: ProjectComment) => {
    if (mutating) return;
    const replyCount = comment.parent_id ? 0 : (replies[comment.id] ?? []).length;
    Alert.alert(
      comment.parent_id ? 'Delete reply?' : 'Delete comment?',
      replyCount > 0
        ? `This comment and its ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'} will be permanently removed.`
        : `This ${comment.parent_id ? 'reply' : 'comment'} will be permanently removed.`,
      [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(comment.id);
          const err = await removeComment(comment.id);
          setDeletingId(null);
          if (err) Alert.alert('Could not delete comment', err);
        },
      },
    ]);
  };

  const renderComment = (comment: ProjectComment, index: number) => {
    const isReply = !!comment.parent_id;
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
    // Uploaded picture first; your own comments can also use your Google photo.
    const avatarPath = avatarPaths[comment.user_id];
    const ownOauthPicture = isOwn
      ? ((user?.user_metadata?.avatar_url || user?.user_metadata?.picture) as string | undefined)
      : undefined;
    const avatarUri = avatarPath ? getAvatarUrl(avatarPath) : ownOauthPicture || null;
    const isDeleting = deletingId === comment.id;
    const isBeingEdited = editingId === comment.id;

    return (
      <FadeInView
        key={comment.id}
        delay={staggerDelay(index)}
        offset={4}
        onLayout={(e) => {
          cardY.current[comment.id] = e.nativeEvent.layout.y;
        }}
      >
        <View
          style={[
            styles.commentCard,
            isReply && styles.replyCard,
            isBeingEdited && styles.commentCardEditing,
            isDeleting && styles.commentCardDeleting,
          ]}
        >
          <View style={styles.commentHeader}>
            <PressableScale
              onPress={() => onOpenUser?.(comment.user_id)}
              disabled={!onOpenUser}
              activeOpacity={0.7}
              pressedScale={0.94}
              accessibilityLabel={`View ${displayName}'s profile`}
            >
              <CommentAvatar uri={avatarUri} initials={initials} name={displayName} />
            </PressableScale>
            <View style={styles.commentMeta}>
              <View style={styles.commentNameRow}>
                <Text
                  style={styles.commentName}
                  numberOfLines={1}
                  onPress={onOpenUser ? () => onOpenUser(comment.user_id) : undefined}
                  accessibilityRole={onOpenUser ? 'link' : undefined}
                >
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

            {isOwn && !isBeingEdited && (
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

          {isBeingEdited ? (
            <CommentEditor
              initialValue={comment.content}
              saving={savingEdit}
              onSave={(content) => handleSaveEdit(comment.id, content)}
              onCancel={() => setEditingId(null)}
              onFocus={() =>
                onInputFocus?.(listY.current + (cardY.current[comment.id] ?? 0))
              }
              onBlur={() => onInputBlur?.()}
            />
          ) : (
            <Text style={styles.commentBody}>{comment.content}</Text>
          )}

          {/* Like + Reply */}
          {!isBeingEdited && (commentLikesSupported || repliesSupported) && (
            <View style={styles.commentFooter}>
              {commentLikesSupported && (() => {
                const like = commentLikes[comment.id];
                const liked = like?.likedByMe ?? false;
                return (
                  <PressableScale
                    style={styles.footerAction}
                    onPress={() => toggleCommentLike(comment.id)}
                    onLongPress={() => setLikersComment(comment.id)}
                    delayLongPress={400}
                    activeOpacity={0.6}
                    pressedScale={0.9}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    accessibilityLabel={`${liked ? 'Unlike' : 'Like'} comment, ${like?.count ?? 0} likes`}
                    accessibilityHint="Hold to see who liked this comment"
                    accessibilityState={{ selected: liked, busy: !!commentLikePending[comment.id] }}
                  >
                    <HeartIcon
                      size={13}
                      filled={liked}
                      color={liked ? '#FFFFFF' : STITCH_COLORS.onSurfaceVariant}
                    />
                    <Text style={[styles.footerText, liked && styles.footerTextOn]}>
                      {like ? like.count : '–'}
                    </Text>
                  </PressableScale>
                );
              })()}
              {repliesSupported && user && (
                <PressableScale
                  style={styles.footerAction}
                  onPress={() =>
                    startReply(
                      comment.parent_id || comment.id,
                      isReply && displayName !== FALLBACK_DISPLAY_NAME ? displayName : null
                    )
                  }
                  disabled={mutating}
                  activeOpacity={0.6}
                  hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  accessibilityLabel={`Reply to ${displayName}`}
                >
                  <CommentIcon size={13} color={STITCH_COLORS.onSurfaceVariant} />
                  <Text style={styles.footerText}>Reply</Text>
                </PressableScale>
              )}
            </View>
          )}
        </View>
      </FadeInView>
    );
  };

  /** A top-level comment with its replies and (optionally) a reply composer. */
  const renderThread = (comment: ProjectComment, index: number) => {
    const threadReplies = replies[comment.id] ?? [];
    const expanded = !!expandedThreads[comment.id];
    const shown = expanded ? threadReplies : threadReplies.slice(0, 2);
    const hidden = threadReplies.length - shown.length;
    const composing = replyingTo?.parentId === comment.id;
    return (
      <View key={comment.id}>
        {renderComment(comment, index)}
        {(threadReplies.length > 0 || composing) && (
          <View style={styles.thread}>
            {shown.map((r, i) => renderComment(r, i))}
            {hidden > 0 && (
              <PressableScale
                style={styles.viewReplies}
                onPress={() => setExpandedThreads((prev) => ({ ...prev, [comment.id]: true }))}
                activeOpacity={0.6}
              >
                <Text style={styles.viewRepliesText}>
                  View {hidden} more {hidden === 1 ? 'reply' : 'replies'}
                </Text>
              </PressableScale>
            )}
            {composing && (
              <View style={[styles.commentCard, styles.replyCard]}>
                <CommentEditor
                  key={`reply-${comment.id}-${replyingTo?.mention}`}
                  initialValue={replyingTo?.mention ?? ''}
                  saving={postingReply}
                  submitLabel="Reply"
                  placeholder="Write a reply…"
                  onSave={handleSendReply}
                  onCancel={() => setReplyingTo(null)}
                  onFocus={() => onInputFocus?.(listY.current + (cardY.current[comment.id] ?? 0))}
                  onBlur={() => onInputBlur?.()}
                />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const remaining = COMMENT_MAX_LENGTH - draft.trim().length;

  return (
    <View style={styles.section}>
      <LikersSheet
        kind="comment"
        repositoryId={likersComment}
        appName="Comment likes"
        onClose={() => setLikersComment(null)}
        onOpenUser={onOpenUser}
      />
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <CommentIcon size={15} color={STITCH_COLORS.onSurface} />
          <Text style={styles.sectionTitle}>Comments</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{loading ? '–' : allTotal}</Text>
        </View>
      </View>

      {/* Composer */}
      <View
        onLayout={(e) => {
          composerY.current = e.nativeEvent.layout.y;
        }}
      >
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
            editable={!!user && !posting}
            multiline
            maxLength={COMMENT_MAX_LENGTH}
            textAlignVertical="top"
            autoCapitalize="sentences"
            onFocus={() => {
              setFocused(true);
              onInputFocus?.(composerY.current);
            }}
            onBlur={() => {
              setFocused(false);
              onInputBlur?.();
            }}
            accessibilityLabel="Write a comment"
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
              accessibilityState={{ disabled: !canSubmit, busy: posting }}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.postButtonText}>Post</Text>
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
        <View
          style={styles.list}
          onLayout={(e) => {
            listY.current = e.nativeEvent.layout.y;
          }}
        >
          {error && <Text style={styles.inlineError}>{error}</Text>}
          {comments.map(renderThread)}
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
  editor: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editorInput: {
    minHeight: 56,
    maxHeight: 180,
    color: '#EDEDED',
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: FONTS.sans.regular,
    paddingVertical: 2,
  },
  editorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  editorCancel: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorCancelText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  editorSave: {
    minWidth: 60,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
  replyCard: {
    padding: 10,
    borderRadius: 8,
  },
  thread: {
    marginTop: 8,
    marginLeft: 22,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#262626',
    gap: 8,
  },
  viewReplies: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  viewRepliesText: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 10,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerText: {
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.onSurfaceVariant,
  },
  footerTextOn: {
    color: '#FFFFFF',
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
    overflow: 'hidden',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  commentAvatarImg: {
    width: 28,
    height: 28,
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
