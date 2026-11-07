import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { COMMUNITY_MEMBER_LABEL } from '../../constants/identity';
import { CATEGORY_LABEL, TECHNOLOGY_BY_ID, normalizeTechName } from '../../constants/technologies';
import { RepositorySummary } from '../../types/repository';
import { fetchRepositorySummariesCached } from '../../services/repositories';
import {
  ProjectTechnology,
  fetchTechnologiesForRepositories,
} from '../../services/technologies';
import { Avatar } from '../../components/common/Avatar';
import {
  ArrowRightIcon,
  CloseIcon,
  GraduationCapIcon,
  SearchIcon,
} from '../../components/common/AppIcons';
import { PressableScale } from '../../components/animation/PressableScale';
import { FocusBorderView } from '../../components/animation/FocusBorderView';
import { TechnologyBadges } from '../../components/technology/TechnologyDisplay';

/**
 * Search across projects, founders, institutes and technologies. Like the
 * old Discover search this is a client-side substring match over loaded
 * data (two batched requests) — not semantic search.
 */

type Scope = 'all' | 'projects' | 'founders' | 'institutes' | 'technologies';
const SCOPES: { id: Scope; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'projects', label: 'Projects' },
  { id: 'founders', label: 'Founders' },
  { id: 'institutes', label: 'Institutes' },
  { id: 'technologies', label: 'Technologies' },
];
const ALL_PREVIEW = 3;
const LIST_CAP = 100;

interface Founder {
  key: string;
  name: string;
  college: string;
  projects: RepositorySummary[];
}
interface Institute {
  key: string;
  name: string;
  projectIds: Set<string>;
  founderKeys: Set<string>;
}
interface TechAgg {
  id: string;
  name: string;
  category: string;
  repoIds: Set<string>;
}
type Refinement = { kind: 'institute' | 'technology'; key: string; label: string };

const norm = (v: string | null | undefined) => normalizeTechName(v || '');
const founderName = (r: RepositorySummary) => r.student_name?.trim() || COMMUNITY_MEMBER_LABEL;

interface SearchScreenProps {
  isActive?: boolean;
  onSelectRepository: (repo: RepositorySummary) => void;
  /** Open a founder's profile (in-app screen; bottom nav stays visible). */
  onOpenProfile: (repoOfFounder: RepositorySummary) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  isActive = true,
  onSelectRepository,
  onOpenProfile,
}) => {
  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [techs, setTechs] = useState<Record<string, ProjectTechnology[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [focused, setFocused] = useState<boolean>(false);
  const [scope, setScope] = useState<Scope>('all');
  const [refinement, setRefinement] = useState<Refinement | null>(null);
  const firstLoad = useRef(true);

  // Summaries only (no descriptions), cached for a minute across tab visits;
  // technologies are re-fetched only when the project list itself changed.
  const lastLoaded = useRef<RepositorySummary[] | null>(null);
  const load = useCallback(async (force = false) => {
    const r = await fetchRepositorySummariesCached(force);
    if (r.error || !r.data) {
      setError(r.error || 'Failed to load projects.');
      return;
    }
    setError(null);
    if (r.data === lastLoaded.current) return; // cache hit: nothing changed
    lastLoaded.current = r.data;
    setRepos(r.data);
    const t = await fetchTechnologiesForRepositories(r.data.map((x) => x.id));
    if (t.data) setTechs(t.data);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    if (firstLoad.current) {
      firstLoad.current = false;
      load().finally(() => setLoading(false));
    } else {
      load(); // quiet refresh when returning to the tab
    }
  }, [isActive, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  // ---------------------------------------------------------------- indexes
  const { founders, institutes, techAggs } = useMemo(() => {
    const f = new Map<string, Founder>();
    const inst = new Map<string, Institute>();
    const t = new Map<string, TechAgg>();
    for (const r of repos) {
      const fKey = norm(r.student_email) || `repo:${r.id}`;
      const founder = f.get(fKey) ?? { key: fKey, name: founderName(r), college: '', projects: [] };
      founder.projects.push(r);
      if (!founder.college && r.university?.trim()) founder.college = r.university.trim();
      f.set(fKey, founder);

      const uni = r.university?.trim();
      if (uni) {
        const k = norm(uni);
        const i = inst.get(k) ?? { key: k, name: uni, projectIds: new Set(), founderKeys: new Set() };
        i.projectIds.add(r.id);
        i.founderKeys.add(fKey);
        inst.set(k, i);
      }

      const rows = techs[r.id] ?? [];
      if (rows.length > 0) {
        for (const row of rows) {
          const agg = t.get(row.technology_id) ?? {
            id: row.technology_id,
            name: row.technology_name,
            category: row.category,
            repoIds: new Set<string>(),
          };
          agg.repoIds.add(r.id);
          t.set(row.technology_id, agg);
        }
      } else if (r.framework?.trim()) {
        // Legacy projects: their single framework value counts as a technology.
        const k = `legacy:${norm(r.framework)}`;
        const agg = t.get(k) ?? { id: k, name: r.framework.trim(), category: 'custom', repoIds: new Set<string>() };
        agg.repoIds.add(r.id);
        t.set(k, agg);
      }
    }
    return {
      founders: Array.from(f.values()).sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name)),
      institutes: Array.from(inst.values()).sort((a, b) => b.projectIds.size - a.projectIds.size || a.name.localeCompare(b.name)),
      techAggs: Array.from(t.values()).sort((a, b) => b.repoIds.size - a.repoIds.size || a.name.localeCompare(b.name)),
    };
  }, [repos, techs]);

  // ---------------------------------------------------------------- matching
  // Filtering runs on a deferred copy of the query, so typing stays instant
  // and the heavy matching happens in a lower-priority render.
  const deferredQuery = useDeferredValue(query);
  const q = norm(deferredQuery);
  const results = useMemo(() => {
    if (!q) return { projects: [], founders: [], institutes: [], technologies: [] };
    const projectMatches = repos.filter(
      (r) =>
        norm(r.app_name).includes(q) ||
        norm(r.one_liner).includes(q) ||
        norm(r.framework).includes(q) ||
        norm(r.student_name).includes(q) ||
        norm(r.university).includes(q) ||
        (techs[r.id] ?? []).some((t) => norm(t.technology_name).includes(q))
    );
    return {
      projects: projectMatches,
      founders: founders.filter((f) => norm(f.name).includes(q) || norm(f.college).includes(q)),
      institutes: institutes.filter((i) => norm(i.name).includes(q)),
      technologies: techAggs.filter(
        (t) =>
          norm(t.name).includes(q) ||
          (TECHNOLOGY_BY_ID[t.id]?.aliases ?? []).some((a) => norm(a).includes(q))
      ),
    };
  }, [q, repos, techs, founders, institutes, techAggs]);

  const refinedProjects = useMemo(() => {
    if (!refinement) return [];
    if (refinement.kind === 'institute') {
      return repos.filter((r) => norm(r.university) === refinement.key);
    }
    const agg = techAggs.find((t) => t.id === refinement.key);
    return agg ? repos.filter((r) => agg.repoIds.has(r.id)) : [];
  }, [refinement, repos, techAggs]);

  // Founders behind the drilled-down projects (for the Founders section).
  const refinedFounders = useMemo(() => {
    if (!refinement) return [];
    const ids = new Set(refinedProjects.map((r) => r.id));
    return founders.filter((f) => f.projects.some((p) => ids.has(p.id)));
  }, [refinement, refinedProjects, founders]);

  const refineBy = (r: Refinement) => {
    setRefinement(r);
  };

  // ---------------------------------------------------------------- rows
  const ProjectRow = ({ r }: { r: RepositorySummary }) => (
    <PressableScale style={styles.card} onPress={() => onSelectRepository(r)} activeOpacity={0.85} pressedScale={0.985}>
      <Text style={styles.cardTitle} numberOfLines={1}>{r.app_name}</Text>
      <View style={styles.metaRow}>
        <GraduationCapIcon size={12} color={STITCH_COLORS.primaryContainer} />
        <Text style={styles.metaText}>
          {founderName(r)}
          {r.university?.trim() ? ` · ${r.university.trim()}` : ''}
        </Text>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{r.one_liner}</Text>
      <TechnologyBadges technologies={techs[r.id]} legacyFramework={r.framework} />
    </PressableScale>
  );

  const FounderRow = ({ f }: { f: Founder }) => (
    <PressableScale style={[styles.card, styles.rowCard]} onPress={() => onOpenProfile(f.projects[0])} activeOpacity={0.85} pressedScale={0.985}>
      <Avatar name={f.name} size={40} />
      <View style={styles.flex}>
        <Text style={styles.cardTitle} numberOfLines={1}>{f.name}</Text>
        {f.college ? <Text style={styles.metaText} numberOfLines={1}>{f.college}</Text> : null}
        <Text style={styles.countText}>
          {f.projects.length} {f.projects.length === 1 ? 'project' : 'projects'}
        </Text>
      </View>
      <ArrowRightIcon size={14} color={STITCH_COLORS.outline} />
    </PressableScale>
  );

  const InstituteRow = ({ i }: { i: Institute }) => (
    <PressableScale style={[styles.card, styles.rowCard]} onPress={() => refineBy({ kind: 'institute', key: i.key, label: i.name })} activeOpacity={0.85} pressedScale={0.985}>
      <View style={styles.iconBox}>
        <GraduationCapIcon size={16} color="#EDEDED" />
      </View>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{i.name}</Text>
        <Text style={styles.countText}>
          {i.projectIds.size} {i.projectIds.size === 1 ? 'project' : 'projects'} · {i.founderKeys.size}{' '}
          {i.founderKeys.size === 1 ? 'founder' : 'founders'}
        </Text>
      </View>
      <ArrowRightIcon size={14} color={STITCH_COLORS.outline} />
    </PressableScale>
  );

  const TechRow = ({ t }: { t: TechAgg }) => (
    <PressableScale style={[styles.card, styles.rowCard]} onPress={() => refineBy({ kind: 'technology', key: t.id, label: t.name })} activeOpacity={0.85} pressedScale={0.985}>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{t.name}</Text>
        <Text style={styles.countText}>
          {CATEGORY_LABEL[t.category] ?? 'Framework'} · {t.repoIds.size} {t.repoIds.size === 1 ? 'project' : 'projects'}
        </Text>
      </View>
      <ArrowRightIcon size={14} color={STITCH_COLORS.outline} />
    </PressableScale>
  );

  const Section = <T,>({
    title,
    items,
    sectionScope,
    render,
  }: {
    title: string;
    items: T[];
    sectionScope: Scope;
    render: (item: T) => React.ReactNode;
  }) => {
    if (items.length === 0) return null;
    const preview = scope === 'all' ? items.slice(0, ALL_PREVIEW) : items.slice(0, LIST_CAP);
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {title} <Text style={styles.sectionCount}>({items.length})</Text>
          </Text>
          {scope === 'all' && items.length > ALL_PREVIEW && (
            <PressableScale onPress={() => setScope(sectionScope)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.6}>
              <Text style={styles.seeAll}>See all</Text>
            </PressableScale>
          )}
        </View>
        <View style={styles.list}>{preview.map(render)}</View>
      </View>
    );
  };

  const total =
    results.projects.length + results.founders.length + results.institutes.length + results.technologies.length;

  // ---------------------------------------------------------------- render
  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.title}>Search</Text>
        <FocusBorderView focused={focused} style={styles.searchBox}>
          <SearchIcon size={16} color={STITCH_COLORS.outline} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setRefinement(null);
            }}
            placeholder="Projects, founders, institutes, technologies"
            placeholderTextColor={STITCH_COLORS.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel="Search"
          />
          {query.length > 0 && (
            <PressableScale onPress={() => { setQuery(''); setRefinement(null); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.6} accessibilityLabel="Clear search">
              <CloseIcon size={14} color={STITCH_COLORS.outline} />
            </PressableScale>
          )}
        </FocusBorderView>
        {!refinement && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scopes} keyboardShouldPersistTaps="handled">
            {SCOPES.map((s) => {
              const on = scope === s.id;
              return (
                <PressableScale key={s.id} style={[styles.scope, on && styles.scopeOn]} onPress={() => setScope(s.id)} activeOpacity={0.8} pressedScale={0.95} accessibilityState={{ selected: on }}>
                  <Text style={[styles.scopeText, on && styles.scopeTextOn]}>{s.label}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={STITCH_COLORS.primary} colors={[STITCH_COLORS.primary]} />}
      >
        {loading ? (
          <ActivityIndicator style={styles.spinner} color={STITCH_COLORS.onSurfaceVariant} />
        ) : error ? (
          <Text style={styles.empty}>{error}</Text>
        ) : refinement ? (
          // Institute / technology drill-down: its projects and founders
          <View>
            <View style={styles.refinementChip}>
              {refinement.kind === 'institute' ? (
                <GraduationCapIcon size={13} color={STITCH_COLORS.primaryContainer} />
              ) : null}
              <Text style={styles.refinementChipText}>{refinement.label}</Text>
              <PressableScale
                onPress={() => setRefinement(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.6}
                accessibilityLabel={`Clear ${refinement.label}`}
              >
                <CloseIcon size={13} color="#A1A1A1" />
              </PressableScale>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Projects <Text style={styles.sectionCount}>({refinedProjects.length})</Text>
              </Text>
              <View style={styles.list}>
                {refinedProjects.map((r) => <ProjectRow key={r.id} r={r} />)}
              </View>
            </View>

            {refinedFounders.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Founders <Text style={styles.sectionCount}>({refinedFounders.length})</Text>
                </Text>
                <View style={styles.list}>
                  {refinedFounders.map((f) => <FounderRow key={f.key} f={f} />)}
                </View>
              </View>
            )}
          </View>
        ) : !q ? (
          // Suggestions
          <View>
            {techAggs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Popular technologies</Text>
                <View style={styles.chips}>
                  {techAggs.slice(0, 12).map((t) => (
                    <PressableScale key={t.id} style={styles.chip} onPress={() => refineBy({ kind: 'technology', key: t.id, label: t.name })} activeOpacity={0.8} pressedScale={0.95}>
                      <Text style={styles.chipText}>{t.name}</Text>
                      <Text style={styles.chipCount}>{t.repoIds.size}</Text>
                    </PressableScale>
                  ))}
                </View>
              </View>
            )}
            {institutes.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Institutes</Text>
                <View style={styles.list}>
                  {institutes.slice(0, 5).map((i) => <InstituteRow key={i.key} i={i} />)}
                </View>
              </View>
            )}
            {techAggs.length === 0 && institutes.length === 0 && (
              <Text style={styles.empty}>Search by project name, founder, institute or technology.</Text>
            )}
          </View>
        ) : total === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No results for “{query.trim()}”</Text>
            <Text style={styles.empty}>Try a project name, a founder, an institute or a technology.</Text>
          </View>
        ) : (
          <View>
            {(scope === 'all' || scope === 'projects') && (
              <Section title="Projects" items={results.projects} sectionScope="projects" render={(r) => <ProjectRow key={r.id} r={r} />} />
            )}
            {(scope === 'all' || scope === 'founders') && (
              <Section title="Founders" items={results.founders} sectionScope="founders" render={(f) => <FounderRow key={f.key} f={f} />} />
            )}
            {(scope === 'all' || scope === 'institutes') && (
              <Section title="Institutes" items={results.institutes} sectionScope="institutes" render={(i) => <InstituteRow key={i.key} i={i} />} />
            )}
            {(scope === 'all' || scope === 'technologies') && (
              <Section title="Technologies" items={results.technologies} sectionScope="technologies" render={(t) => <TechRow key={t.id} t={t} />} />
            )}
            {scope !== 'all' &&
              results[scope as Exclude<Scope, 'all'>].length === 0 && (
                <Text style={styles.empty}>No {scope} match “{query.trim()}”.</Text>
              )}
          </View>
        )}
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  screen: { flex: 1, backgroundColor: STITCH_COLORS.background },
  top: { paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 26, fontFamily: FONTS.sans.semibold, color: '#FFFFFF', letterSpacing: -0.5 },
  searchBox: {
    marginTop: 12,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#000000',
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: FONTS.sans.regular, color: '#EDEDED', paddingVertical: 0 },
  scopes: { gap: 8, paddingVertical: 12 },
  scope: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#000000',
  },
  scopeOn: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  scopeText: { fontSize: 12.5, fontFamily: FONTS.sans.medium, color: '#A1A1A1' },
  scopeTextOn: { fontFamily: FONTS.sans.semibold, color: '#000000' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  spinner: { marginTop: 40 },
  section: { marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { flexShrink: 1, fontSize: 15, fontFamily: FONTS.sans.semibold, color: '#FFFFFF', letterSpacing: -0.2, marginBottom: 10 },
  sectionCount: { fontFamily: FONTS.sans.regular, color: '#737373' },
  seeAll: { fontSize: 12.5, fontFamily: FONTS.sans.medium, color: '#A1A1A1', marginBottom: 10 },
  list: { gap: 10 },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
  },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 14.5, fontFamily: FONTS.sans.semibold, color: '#FFFFFF' },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 3 },
  metaText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontFamily: FONTS.sans.regular, color: '#A1A1A1' },
  cardDesc: { marginTop: 6, marginBottom: 10, fontSize: 13, lineHeight: 18, fontFamily: FONTS.sans.regular, color: '#A1A1A1' },
  countText: { marginTop: 2, fontSize: 11.5, fontFamily: FONTS.sans.regular, color: '#737373' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#0A0A0A',
  },
  chipText: { fontSize: 12.5, fontFamily: FONTS.sans.medium, color: '#EDEDED' },
  chipCount: { fontSize: 11, fontFamily: FONTS.mono.medium, color: '#737373' },
  refinementChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    marginTop: 4,
    marginBottom: 16,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#111111',
  },
  refinementChipText: { flexShrink: 1, fontSize: 12.5, fontFamily: FONTS.sans.medium, color: '#EDEDED' },
  emptyBox: { marginTop: 32, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontFamily: FONTS.sans.semibold, color: '#EDEDED', textAlign: 'center' },
  empty: { marginTop: 8, fontSize: 13, lineHeight: 18, fontFamily: FONTS.sans.regular, color: '#737373', textAlign: 'center' },
});
