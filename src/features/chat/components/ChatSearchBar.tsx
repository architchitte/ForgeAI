import React, { useState } from 'react';
import { StyleProp, StyleSheet, TextInput, ViewStyle } from 'react-native';
import { FocusBorderView } from '../../../components/animation/FocusBorderView';
import { PressableScale } from '../../../components/animation/PressableScale';
import { CloseIcon, SearchIcon } from '../../../components/common/AppIcons';
import { STITCH_COLORS } from '../../../constants/theme';
import { FONTS } from '../../../constants/typography';

interface ChatSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Same field treatment as the Search tab. */
export const ChatSearchBar: React.FC<ChatSearchBarProps> = ({
  value,
  onChangeText,
  placeholder,
  autoFocus,
  style,
}) => {
  const [focused, setFocused] = useState<boolean>(false);
  return (
    <FocusBorderView focused={focused} style={[styles.box, style]}>
      <SearchIcon size={16} color={STITCH_COLORS.outline} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={STITCH_COLORS.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={placeholder}
      />
      {value.length > 0 && (
        <PressableScale
          onPress={() => onChangeText('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.6}
          accessibilityLabel="Clear search"
        >
          <CloseIcon size={14} color={STITCH_COLORS.outline} />
        </PressableScale>
      )}
    </FocusBorderView>
  );
};

const styles = StyleSheet.create({
  box: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#000000',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
    paddingVertical: 0,
  },
});
