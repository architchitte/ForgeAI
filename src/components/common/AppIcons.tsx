import React from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { STITCH_COLORS } from '../../constants/theme';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * 1. Mail / Envelope Icon
 * Uses Feather "mail" for authentic outline envelope
 */
export const MailIcon: React.FC<IconProps> = ({
  size = 18,
  color = STITCH_COLORS.outline,
}) => <Feather name="mail" size={size} color={color} />;

/**
 * 2. Lock / Padlock Icon
 */
export const LockIcon: React.FC<IconProps> = ({
  size = 18,
  color = STITCH_COLORS.outline,
}) => <Feather name="lock" size={size} color={color} />;

/**
 * 3. Eye / Visibility Icon
 */
export const EyeIcon: React.FC<IconProps> = ({
  size = 18,
  color = STITCH_COLORS.outline,
}) => <Feather name="eye" size={size} color={color} />;

/**
 * 4. EyeOff / Hidden Password Icon
 */
export const EyeOffIcon: React.FC<IconProps> = ({
  size = 18,
  color = STITCH_COLORS.outline,
}) => <Feather name="eye-off" size={size} color={color} />;

/**
 * 5. User / Profile Icon
 */
export const UserIcon: React.FC<IconProps> = ({
  size = 18,
  color = STITCH_COLORS.outline,
}) => <Feather name="user" size={size} color={color} />;

/**
 * 6. Graduation Cap / Academic Icon
 */
export const GraduationCapIcon: React.FC<IconProps> = ({
  size = 18,
  color = STITCH_COLORS.outline,
}) => <Ionicons name="school-outline" size={size} color={color} />;

/**
 * 7. Check Circle Icon
 */
export const CheckCircleIcon: React.FC<
  IconProps & { checked?: boolean; activeColor?: string }
> = ({
  size = 16,
  color = STITCH_COLORS.outline,
  activeColor = STITCH_COLORS.emerald,
  checked = false,
}) => (
  <Feather
    name="check-circle"
    size={size}
    color={checked ? activeColor : color}
  />
);

/**
 * 8. Shield Check Icon
 */
export const ShieldCheckIcon: React.FC<IconProps> = ({
  size = 18,
  color = STITCH_COLORS.outline,
}) => <Feather name="shield" size={size} color={color} />;

/**
 * 9. Arrow Right Icon (->)
 */
export const ArrowRightIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#FFFFFF',
}) => <Feather name="arrow-right" size={size} color={color} />;

/**
 * 10. Arrow Left Icon (<-)
 */
export const ArrowLeftIcon: React.FC<IconProps> = ({
  size = 16,
  color = STITCH_COLORS.onSurface,
}) => <Feather name="arrow-left" size={size} color={color} />;

/**
 * 11. Log Out Icon
 */
export const LogOutIcon: React.FC<IconProps> = ({
  size = 16,
  color = STITCH_COLORS.error,
}) => <Feather name="log-out" size={size} color={color} />;

/**
 * 12. Search Icon
 */
export const SearchIcon: React.FC<IconProps> = ({
  size = 17,
  color = STITCH_COLORS.outline,
}) => <Feather name="search" size={size} color={color} />;

/**
 * 13. Copy Icon
 */
export const CopyIcon: React.FC<IconProps> = ({
  size = 15,
  color = STITCH_COLORS.primaryContainer,
}) => <Feather name="copy" size={size} color={color} />;

/**
 * 14. Edit Icon
 */
export const EditIcon: React.FC<IconProps> = ({
  size = 14,
  color = STITCH_COLORS.onSurface,
}) => <Feather name="edit-2" size={size} color={color} />;

/**
 * 15. Cloud Icon
 */
export const CloudIcon: React.FC<IconProps> = ({
  size = 16,
  color = STITCH_COLORS.outline,
}) => <Feather name="cloud" size={size} color={color} />;

/**
 * 16. Hierarchy / Tree Icon
 */
export const AccountTreeIcon: React.FC<IconProps> = ({
  size = 16,
  color = STITCH_COLORS.outline,
}) => <Feather name="layers" size={size} color={color} />;

/**
 * 17. Rocket Icon (Community Showcase & Blueprint Submission)
 */
export const RocketIcon: React.FC<IconProps> = ({
  size = 16,
  color = '#FFFFFF',
}) => <Ionicons name="rocket-outline" size={size} color={color} />;

/**
 * 18. Trash / Delete Icon
 */
export const TrashIcon: React.FC<IconProps> = ({
  size = 14,
  color = STITCH_COLORS.error,
}) => <Feather name="trash-2" size={size} color={color} />;



/**
 * 19. Heart / Like Icon — filled when `filled` (liked), outline otherwise
 */
export const HeartIcon: React.FC<IconProps & { filled?: boolean }> = ({
  size = 16,
  color = STITCH_COLORS.onSurfaceVariant,
  filled = false,
}) => <Ionicons name={filled ? 'heart' : 'heart-outline'} size={size} color={color} />;

/**
 * 20. Comment / Message Icon
 */
export const CommentIcon: React.FC<IconProps> = ({
  size = 16,
  color = STITCH_COLORS.onSurfaceVariant,
}) => <Feather name="message-circle" size={size} color={color} />;
