import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  SectionList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import {
  CUSTOM_CATEGORY_ID,
  CUSTOM_CATEGORY_LABEL,
  MAX_TECHNOLOGIES,
  SelectedTechnology,
  TECH_CATEGORIES,
  TECHNOLOGIES,
  Technology,
  normalizeTechName,
  toSelected,
} from '../../constants/technologies';
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
} from '../common/AppIcons';
import { PressableScale } from '../animation/PressableScale';
import { FocusBorderView } from '../animation/FocusBorderView';

// ---------------------------------------------------------------------------
// Chips (also used read-only elsewhere)
// ---------------------------------------------------------------------------

interface TechChipProps {
  tech: SelectedTechnology;
  onRemove?: () => void;
  disabled?: boolean;
}

/** Compact technology chip; custom entries get a dashed border. */
export const TechChip: React.FC<TechChipProps> = ({ tech, onRemove, disabled }) => (
  <View style={[styles.chip, tech.isCustom && styles.chipCustom]}>
    <Text style={styles.chipText} numberOfLines={1}>
      {tech.name}
    </Text>
    {onRemove && (
      <PressableScale
        onPress={onRemove}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 8 }}
        activeOpacity={0.6}
        pressedScale={0.85}
        accessibilityLabel={`Remove ${tech.name}`}
      >
        <CloseIcon size={12} color="#A1A1A1" />
      </PressableScale>
    )}
  </View>
);

// ---------------------------------------------------------------------------
// Selector field + picker sheet
// ---------------------------------------------------------------------------

interface TechnologySelectorProps {
  value: SelectedTechnology[];
  onChange: (next: SelectedTechnology[]) => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  /** Small-caps label variant used inside the edit modal. */
  compactLabel?: boolean;
}

interface Row {
  /** Unique per section: a technology can appear under two categories. */
  key: string;
  tech: Technology;
}

interface Section {
  key: string;
  title: string;
  data: Row[];
}

const matches = (tech: Technology, q: string) =>
  !q ||
  normalizeTechName(tech.name).includes(q) ||
  (tech.aliases ?? []).some((a) => normalizeTechName(a).includes(q));

/**
 * Searchable, categorized multi-select for AI technologies — catalogue
 * entries only (no free-text entry). Custom entries already saved on a
 * project (e.g. a legacy framework value) are still shown and removable. Selections live
 * in the parent's state, so they survive closing/reopening the sheet,
 * searching and switching categories.
 */
export const TechnologySelector: React.FC<TechnologySelectorProps> = ({
  value,
  onChange,
  error,
  disabled,
  required,
  compactLabel,
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);

  const selectedIds = useMemo(() => new Set(value.map((v) => v.id)), [value]);
  const customs = value.filter((v) => v.isCustom);
  const q = normalizeTechName(query);

  const sections: Section[] = useMemo(
    () =>
      TECH_CATEGORIES.map((cat) => ({
        key: cat.id,
        title: cat.label,
        data: TECHNOLOGIES.filter(
          (tech) => tech.categories.includes(cat.id) && matches(tech, q)
        ).map((tech) => ({ key: `${cat.id}:${tech.id}`, tech })),
      })).filter((s) => s.data.length > 0),
    [q]
  );

  const atLimit = value.length >= MAX_TECHNOLOGIES;
  const limitAlert = () =>
    Alert.alert('Limit reached', `You can select up to ${MAX_TECHNOLOGIES} technologies.`);

  const toggle = (tech: Technology) => {
    if (selectedIds.has(tech.id)) {
      onChange(value.filter((v) => v.id !== tech.id));
    } else if (atLimit) {
      limitAlert();
    } else {
      onChange([...value, toSelected(tech)]);
    }
  };

  const remove = (id: string) => onChange(value.filter((v) => v.id !== id));

  const confirmClearAll = () => {
    if (value.length === 0) return;
    Alert.alert('Clear all technologies?', `This removes all ${value.length} selections.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => onChange([]) },
    ]);
  };

  const closeSheet = () => {
    setOpen(false);
    setQuery('');
  };

  const label = 'AI Technologies & Frameworks';

  return (
    <View>
      {/* Label row */}
      <View style={styles.labelRow}>
        <Text style={compactLabel ? styles.labelCompact : styles.label}>
          {compactLabel ? label.toUpperCase() : label}
          {required ? ' *' : ''}
        </Text>
        {value.length > 0 && (
          <View style={styles.labelActions}>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{value.length} selected</Text>
            </View>
            <PressableScale
              onPress={confirmClearAll}
              disabled={disabled}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              activeOpacity={0.6}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </PressableScale>
          </View>
        )}
      </View>
      <Text style={styles.helper}>
        Select all AI frameworks, libraries, and tools used in your project.
      </Text>

      {/* Trigger */}
      <PressableScale
        style={[styles.trigger, !!error && styles.triggerError, disabled && styles.disabled]}
        onPress={() => setOpen(true)}
        disabled={disabled}
        activeOpacity={0.8}
        pressedScale={0.99}
        accessibilityLabel="Choose AI technologies"
        accessibilityHint="Opens a searchable list of technologies"
      >
        <SearchIcon size={15} color={STITCH_COLORS.outline} />
        <Text style={styles.triggerText} numberOfLines={1}>
          {value.length === 0 ? 'Search and select technologies' : 'Add or change technologies'}
        </Text>
        <ChevronDownIcon size={16} color={STITCH_COLORS.outline} />
      </PressableScale>

      {/* Selected chips */}
      {value.length > 0 && (
        <View style={styles.chipsWrap}>
          {value.map((tech) => (
            <TechChip
              key={tech.id}
              tech={tech}
              disabled={disabled}
              onRemove={() => remove(tech.id)}
            />
          ))}
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Picker sheet */}
      {/*
        Android renders a Modal in its own window, outside the app's
        SafeAreaProvider, so the sheet gets its own provider and explicit
        edge-to-edge flags — otherwise the header slides under the notch /
        status bar and the bottom under the navigation bar.
      */}
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={closeSheet}
        statusBarTranslucent
        navigationBarTranslucent
      >
        <SafeAreaProvider>
        <SafeAreaView style={styles.sheet} edges={['top', 'bottom', 'left', 'right']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.flex}>
                <Text style={styles.sheetTitle}>AI Technologies</Text>
                <Text style={styles.sheetSubtitle}>
                  {value.length === 0
                    ? 'Select every technology your project uses'
                    : `${value.length} selected`}
                </Text>
              </View>
              <PressableScale
                style={styles.doneButton}
                onPress={closeSheet}
                activeOpacity={0.85}
                accessibilityLabel="Done"
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </PressableScale>
            </View>

            {/* Search */}
            <FocusBorderView focused={searchFocused} style={styles.searchBox}>
              <SearchIcon size={15} color={STITCH_COLORS.outline} />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Search technologies…"
                placeholderTextColor={STITCH_COLORS.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                accessibilityLabel="Search technologies"
              />
              {query.length > 0 && (
                <PressableScale
                  onPress={() => setQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                  accessibilityLabel="Clear search"
                >
                  <CloseIcon size={14} color={STITCH_COLORS.outline} />
                </PressableScale>
              )}
            </FocusBorderView>

            <SectionList
              sections={sections}
              keyExtractor={(row) => row.key}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled
              initialNumToRender={24}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                customs.length > 0 ? (
                  <View>
                    <Text style={styles.sectionHeader}>{CUSTOM_CATEGORY_LABEL}</Text>
                    {customs.map((c) => (
                      <PressableScale
                        key={c.id}
                        style={styles.row}
                        onPress={() => remove(c.id)}
                        activeOpacity={0.7}
                        pressedScale={0.99}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: true }}
                        accessibilityLabel={`${c.name}, custom technology`}
                      >
                        <View style={[styles.checkbox, styles.checkboxOn]}>
                          <CheckIcon size={12} color="#000000" />
                        </View>
                        <Text style={styles.rowText}>{c.name}</Text>
                        <Text style={styles.customTag}>custom</Text>
                      </PressableScale>
                    ))}
                  </View>
                ) : undefined
              }
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>{section.title}</Text>
              )}
              renderItem={({ item: { tech: item } }) => {
                const checked = selectedIds.has(item.id);
                return (
                  <PressableScale
                    style={styles.row}
                    onPress={() => toggle(item)}
                    activeOpacity={0.7}
                    pressedScale={0.99}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={item.name}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                      {checked && <CheckIcon size={12} color="#000000" />}
                    </View>
                    <Text style={[styles.rowText, checked && styles.rowTextOn]}>{item.name}</Text>
                  </PressableScale>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No technologies match “{query.trim()}”</Text>
                  <Text style={styles.emptyText}>
                    Check the spelling, or try another name for the technology.
                  </Text>
                </View>
              }
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
    letterSpacing: -0.1,
  },
  labelCompact: {
    flexShrink: 1,
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: '#A1A1A1',
    letterSpacing: 0.6,
  },
  labelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countBadge: {
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  countBadgeText: {
    fontSize: 10.5,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  clearAllText: {
    fontSize: 11.5,
    fontFamily: FONTS.sans.medium,
    color: '#A1A1A1',
  },
  helper: {
    marginTop: 3,
    marginBottom: 8,
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
  },
  trigger: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#000000',
  },
  triggerError: {
    borderColor: '#737373',
  },
  triggerText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  chipsWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 9,
    paddingRight: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
  },
  chipCustom: {
    borderStyle: 'dashed',
    borderColor: '#454545',
  },
  chipText: {
    flexShrink: 1,
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: '#EDEDED',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: FONTS.sans.medium,
    color: STITCH_COLORS.error,
  },
  disabled: {
    opacity: 0.45,
  },

  // Sheet
  sheet: {
    flex: 1,
    backgroundColor: STITCH_COLORS.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#171717',
  },
  sheetTitle: {
    fontSize: 18,
    fontFamily: FONTS.sans.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: FONTS.sans.regular,
    color: '#A1A1A1',
  },
  doneButton: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 13,
    fontFamily: FONTS.sans.semibold,
    color: '#000000',
  },
  searchBox: {
    marginHorizontal: 16,
    marginTop: 12,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#000000',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    color: '#EDEDED',
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 32,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: STITCH_COLORS.background,
    fontSize: 11,
    fontFamily: FONTS.sans.semibold,
    color: '#737373',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  row: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#0F0F0F',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#454545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  rowText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.sans.regular,
    color: '#D4D4D4',
  },
  rowTextOn: {
    fontFamily: FONTS.sans.medium,
    color: '#FFFFFF',
  },
  customTag: {
    fontSize: 10.5,
    fontFamily: FONTS.sans.medium,
    color: '#737373',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: FONTS.sans.semibold,
    color: '#EDEDED',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 12.5,
    fontFamily: FONTS.sans.regular,
    color: '#737373',
    textAlign: 'center',
  },
});
