import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';
import { UserIcon } from './AppIcons';

interface AvatarProps {
  uri?: string | null;
  /** Used for initials; the neutral label gets a user icon instead. */
  name?: string | null;
  size?: number;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

/** Round avatar: picture → initials → user icon (never a broken image). */
export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 36 }) => {
  const [failed, setFailed] = useState<boolean>(false);
  useEffect(() => setFailed(false), [uri]);
  const clean = name?.trim() || '';
  const initials = clean && clean !== COMMUNITY_MEMBER_LABEL ? initialsOf(clean) : '';
  const dims = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.wrap, dims]}>
      {uri && !failed ? (
        <Image source={{ uri }} style={dims} onError={() => setFailed(true)} />
      ) : initials ? (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>{initials}</Text>
      ) : (
        <UserIcon size={Math.round(size * 0.45)} color={STITCH_COLORS.onSurfaceVariant} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
  },
});
