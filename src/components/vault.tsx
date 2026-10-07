/**
 * Shared app components — one-to-one ports of the `kind` blocks in the prototype's VaultUI.dc.html.
 * Edit these, not the screens, to change a pattern everywhere.
 */
import React from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../icons/Icon';
import { C, R, font, shadow, tabular } from '../theme/tokens';
import { Button, Grid, IconButton, IconTile, Kv, Press, StatusChip, TextField, Txt } from './ds';
import { HeroBackground, Logo } from './art';
import { Grabber, useFooterPad, useNavBottom, useSheetDrag } from './overlay';

const tile = (size = 40, radius = 12) => ({ width: size, height: size, borderRadius: radius, backgroundColor: C.tileBg, alignItems: 'center' as const, justifyContent: 'center' as const });

// ─── HomeHero ───────────────────────────────────────────

export type HeroKpi = { label: string; value: number | string; icon: string };
export function Hero({
  title, subtitle, overviewTitle, pct, kpis, showSearch, onToggleSearch, q, onSearch, searchPlaceholder, onNotify,
}: {
  title: string; subtitle: string; overviewTitle: string; pct: string; kpis: HeroKpi[]; showSearch: boolean; onToggleSearch: () => void;
  q: string; onSearch: (v: string) => void; searchPlaceholder: string; onNotify: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ marginHorizontal: -16 }}>
      <View style={{ paddingTop: insets.top + 2, paddingHorizontal: 20, paddingBottom: 88, gap: 16, overflow: 'hidden', backgroundColor: C.navy }}>
        <HeroBackground />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 48, marginRight: -10 }}>
          <View style={{ flex: 1 }}><Logo height={27} width={92} /></View>
          <Press onPress={onToggleSearch} accessibilityLabel="Search" pressed={{ backgroundColor: C.glass }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={showSearch ? 'x' : 'search'} size={22} color="#fff" />
          </Press>
          <Press onPress={onNotify} accessibilityLabel="Notifications" pressed={{ opacity: 0.6 }} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bell" size={22} color="#fff" />
          </Press>
        </View>
        <View>
          <Txt style={[font(700, 28, 34), { color: '#fff' }]}>{title}</Txt>
          <Txt style={[font(400, 13, 18), { color: 'rgba(255,255,255,0.62)', marginTop: 2 }]}>{subtitle}</Txt>
        </View>
        {showSearch ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 16, borderRadius: R.input, backgroundColor: '#fff' }}>
            <TextInput
              autoFocus value={q} onChangeText={onSearch} placeholder={searchPlaceholder} placeholderTextColor={C.n500} returnKeyType="search"
              autoCorrect={false} selectionColor={C.primary500} style={[font(400, 14, 20), { flex: 1, color: C.text, padding: 0 }]}
            />
            <Icon name="search" size={18} color={C.n500} />
          </View>
        ) : null}
      </View>
      <View style={[{ marginTop: -60, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: R.card, padding: 16, gap: 12 }, shadow.float]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt style={[font(600, 15, 20), { flex: 1 }]}>{overviewTitle}</Txt>
          <View style={{ height: 24, paddingHorizontal: 10, borderRadius: 999, backgroundColor: C.tileBg, justifyContent: 'center' }}>
            <Txt style={[font(600, 12, 16), tabular, { color: C.tileFg }]}>{pct} complete</Txt>
          </View>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {kpis.map((k, i) => (
            <View key={k.label} style={{ flex: 1, minWidth: 0, gap: 10, paddingHorizontal: 12, paddingLeft: i ? 12 : 0, borderLeftWidth: i ? 1 : 0, borderLeftColor: C.hairline }}>
              <View style={tile(32, 10)}><Icon name={k.icon} size={18} color={C.tileFg} /></View>
              <View>
                <Txt style={[font(700, 24, 28), tabular]}>{k.value}</Txt>
                <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]} lines={1}>{k.label}</Txt>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── RecordCard ─────────────────────────────────────────

export type RecordRow = {
  customer: string; no: string; tone: string; status: string; grid: Kv[]; who: string; whatLine: string; when: string;
  dateLabel: string; dateValue: string; actText?: string; onAct?: () => void; onOpen: () => void; secondaryText?: string; onSecondary?: () => void;
};
export function RecordCard({ row, icon, showMeta = true }: { row: RecordRow; icon: string; showMeta?: boolean }) {
  return (
    <Press onPress={row.onOpen} pressed={{ transform: [{ scale: 0.985 }], opacity: 0.96 }} style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
      <View style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={tile()}><Icon name={icon} size={20} color={C.tileFg} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt style={font(600, 15, 20)} lines={1}>{row.customer}</Txt>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <View style={{ paddingVertical: 3, paddingHorizontal: 8, borderWidth: 1, borderColor: C.pillBorder, borderRadius: 999 }}>
                <Txt style={font(500, 11, 14)}>{row.no}</Txt>
              </View>
            </View>
          </View>
          <StatusChip tone={row.tone} label={row.status} size="sm" />
        </View>
        {showMeta ? (
          <>
            <View style={{ flexDirection: 'row' }}>
              {row.grid.map((g, i) => (
                <View key={i} style={{ flex: 1, minWidth: 0, paddingHorizontal: 10, paddingLeft: i ? 10 : 0, borderLeftWidth: i ? 1 : 0, borderLeftColor: C.hairline }}>
                  <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{g.label}</Txt>
                  <Txt style={[font(500, 13, 18), { marginTop: 2 }]} lines={1}>{g.value}</Txt>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: C.muted }}>
              <View style={[tile(28, 14)]}><Txt style={[font(600, 11, 13), { color: C.tileFg }]}>{initialsOf(row.who)}</Txt></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={font(500, 13, 18)} lines={1}>{row.who}</Txt>
                <Txt style={[font(400, 12, 16), { color: C.text2 }]} lines={1}>{row.whatLine}</Txt>
              </View>
              <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{row.when}</Txt>
            </View>
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, borderTopWidth: 1, borderTopColor: C.hairline }}>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="calendar" size={14} color={C.text2} />
          <Txt style={[font(400, 12, 16), { color: C.text2 }]} lines={1}>
            {row.dateLabel} <Txt style={[font(500, 12, 16), { color: C.text }]}>{row.dateValue}</Txt>
          </Txt>
        </View>
        {row.actText ? <CardLink text={row.actText} onPress={row.onAct ?? row.onOpen} /> : null}
      </View>
    </Press>
  );
}
const initialsOf = (w: string) => w.split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '—';
const CardLink = ({ text, onPress }: { text: string; onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={6} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingLeft: 8, paddingRight: 2 }, pressed && { opacity: 0.6 }]}>
    <Txt style={[font(600, 13, 18), { color: C.primary600 }]}>{text}</Txt>
    <Icon name="chevron-right" size={16} color={C.primary600} />
  </Pressable>
);

// ─── BottomNav ──────────────────────────────────────────

export type NavItem = { label: string; icon: string; on: boolean; onPress: () => void };
export function BottomNav({ items, onCreate }: { items: NavItem[]; onCreate: () => void }) {
  const bottom = useNavBottom();
  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom, zIndex: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={[{ flex: 1, height: 64, borderRadius: 32, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' }, shadow.bar]}>
        {items.map((n) => {
          const fg = n.on ? C.primary600 : C.navInk;
          return (
            <View key={n.label} style={{ flex: 1, alignItems: 'center' }}>
              <Pressable
                onPress={n.onPress}
                accessibilityRole="button"
                accessibilityLabel={n.label}
                accessibilityState={{ selected: n.on }}
                style={({ pressed }) => [{ minWidth: 64, height: 52, paddingHorizontal: 6, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 3 }, pressed && { backgroundColor: C.n100 }]}
              >
                <Icon name={n.icon} size={22} color={fg} filled={n.on} />
                <Txt style={[n.on ? font(600, 11, 14) : font(500, 11, 14), { color: fg }]}>{n.label}</Txt>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Press onPress={onCreate} accessibilityLabel="Create new" pressed={{ transform: [{ scale: 0.94 }] }} style={[{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }, shadow.fab]}>
        <Icon name="plus" size={28} color="#fff" />
      </Press>
    </View>
  );
}

// ─── DetailHeader / DetailTabs ──────────────────────────

export function DetailHeader({
  backLabel, onBack, icon, title, subtitle, status, facts, actText, actIcon, onAction,
}: {
  backLabel: string; onBack: () => void; icon: string; title: string; subtitle: string; status: string; facts: Kv[];
  actText?: string | null; actIcon?: string; onAction?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingBottom: 12, gap: 12, overflow: 'hidden', backgroundColor: C.navy }}>
      <HeroBackground />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: insets.top, paddingHorizontal: 16, minHeight: 44 }}>
        <Press onPress={onBack} accessibilityLabel="Back" pressed={{ opacity: 0.8 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, shadow.small]}>
            <Icon name="arrow-left" size={20} color={C.navy} />
          </View>
          <Txt style={[font(500, 14, 20), { color: '#fff' }]}>{backLabel}</Txt>
        </Press>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color="#fff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt style={[font(700, 18, 24), { color: '#fff' }]} lines={1}>{title}</Txt>
          <Txt style={[font(400, 12, 16), { color: 'rgba(255,255,255,0.7)' }]} lines={1}>{subtitle}</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 24, paddingHorizontal: 9, borderRadius: 999, backgroundColor: '#fff' }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary500 }} />
          <Txt style={[font(600, 11, 14), { color: C.navy }]}>{status}</Txt>
        </View>
      </View>
      <View style={{ marginHorizontal: 16, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 8 }}>
        {facts.map((f, i) => (
          <View key={i} style={{ flex: 1, minWidth: 0, paddingHorizontal: 12, borderLeftWidth: i ? 1 : 0, borderLeftColor: 'rgba(255,255,255,0.14)' }}>
            <Txt style={[font(400, 11, 14), { color: C.onDarkMuted }]} lines={1}>{f.label}</Txt>
            <Txt style={[font(600, 12, 16), { color: '#fff', marginTop: 1 }]} lines={1}>{f.value}</Txt>
          </View>
        ))}
      </View>
      {actText && onAction ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Button size="md" fullWidth leadingIcon={actIcon} onPress={onAction}>{actText}</Button>
        </View>
      ) : null}
    </View>
  );
}

export type TabItem = { key: string; label: string; icon?: string };
export function DetailTabs({ items, active, onChange }: { items: TabItem[]; active: string; onChange: (k: string) => void }) {
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#E6E8EC', backgroundColor: C.bgApp }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 8 }}>
        {items.map((t) => {
          const on = t.key === active;
          return (
            <Pressable key={t.key} onPress={() => onChange(t.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={({ pressed }) => [{ flexGrow: 1, height: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, pressed && { opacity: 0.7 }]}>
              {t.icon ? <Icon name={t.icon} size={18} color={on ? C.primary600 : C.text2} /> : null}
              <Txt style={[on ? font(600, 13, 18) : font(500, 13, 18), { color: on ? C.primary600 : C.text2 }]}>{t.label}</Txt>
              <View style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: on ? C.primary500 : 'transparent' }} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Cards ──────────────────────────────────────────────

export function NextStep({ text, title = 'Next step', icon = 'info' }: { text: string; title?: string; icon?: string }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: R.card, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={tile()}><Icon name={icon} size={20} color={C.tileFg} /></View>
      <View style={{ flex: 1, paddingTop: 1 }}>
        <Txt style={font(600, 14, 20)}>{title}</Txt>
        <Txt style={[font(400, 12, 17), { color: C.text2, marginTop: 2 }]}>{text}</Txt>
      </View>
    </View>
  );
}

export function Metric({ icon, iconBg, iconFg, label, value, unit }: { icon: string; iconBg: string; iconFg: string; label: string; value: string; unit: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: '#fff', borderRadius: R.card, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={16} color={iconFg} /></View>
        <Txt style={[font(400, 12, 16), { color: C.text2, flex: 1 }]} lines={1}>{label}</Txt>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Txt style={[font(700, 18, 24), tabular]}>{value}</Txt>
        <Txt style={[font(500, 12, 16), { color: C.text2, flexShrink: 1 }]} lines={1}>{unit}</Txt>
      </View>
    </View>
  );
}

export type Section = { icon: string; title: string; sub?: string; items: Kv[] };
export function InfoSection({ section }: { section: Section }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={tile()}><Icon name={section.icon} size={20} color={C.tileFg} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt style={font(600, 14, 20)} lines={1}>{section.title}</Txt>
          {section.sub ? <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>{section.sub}</Txt> : null}
        </View>
      </View>
      <Grid
        columnGap={16} rowGap={0}
        style={{ borderTopWidth: 1, borderTopColor: C.hairline, paddingTop: 4, paddingHorizontal: 14, paddingBottom: 10 }}
        cells={section.items.map((it, i) => (
          <View key={i} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F4F5F7' }}>
            <Txt style={[font(400, 11, 14), { color: C.text2 }]}>{it.label}</Txt>
            <Txt style={[font(500, 13, 18), { marginTop: 2 }]}>{it.value}</Txt>
          </View>
        ))}
      />
    </View>
  );
}

export type TimelineStep = { title: string; subtitle: string; timeLine: string; icon: string; cur?: boolean };
export function Timeline({ title, meta, steps }: { title: string; meta: string; steps: TimelineStep[] }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
        <Txt style={[font(600, 14, 20), { flex: 1 }]}>{title}</Txt>
        <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{meta}</Txt>
      </View>
      <View style={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 4 }}>
        {steps.map((st, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 32, alignItems: 'center' }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: st.cur ? C.primary500 : '#F2F4F7', borderWidth: st.cur ? 0 : 0 }}>
                {st.cur ? <View style={{ position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 4, borderColor: C.primary100 }} /> : null}
                <Icon name={st.icon} size={16} color={st.cur ? '#fff' : '#5A6375'} />
              </View>
              {i < steps.length - 1 ? <View style={{ flex: 1, width: 2, minHeight: 16, marginVertical: 4, borderRadius: 1, backgroundColor: '#E6E9EF' }} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingTop: 5, paddingBottom: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Txt style={[font(600, 13, 18), { flex: 1 }]}>{st.title}</Txt>
                <Txt style={[font(400, 11, 14), tabular, { color: C.text2 }]}>{st.timeLine}</Txt>
              </View>
              <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>{st.subtitle}</Txt>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export type ProgressStep = { label: string; sub: string; time: string; done: boolean; cur: boolean; lineOn: boolean };
export function ProgressSteps({ steps }: { steps: ProgressStep[] }) {
  const meta = `${steps.filter((x) => x.done).length} of ${steps.length}`;
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
        <Txt style={[font(600, 14, 20), { flex: 1 }]}>Order progress</Txt>
        <Txt style={[font(500, 12, 16), tabular, { color: C.text2 }]}>{meta}</Txt>
      </View>
      <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 2 }}>
        {steps.map((ps, i) => (
          <View key={ps.label} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 24, alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ps.done ? C.primary500 : '#fff', borderWidth: ps.done ? 0 : 2, borderColor: ps.cur ? C.primary500 : '#D5D9E0' }}>
                {ps.cur ? <View style={{ position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 4, borderColor: C.primary100 }} /> : null}
                {ps.done ? <Icon name="check" size={12} color="#fff" /> : null}
                {ps.cur ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary500 }} /> : null}
              </View>
              {i < steps.length - 1 ? <View style={{ flex: 1, width: 2, minHeight: 14, marginVertical: 4, borderRadius: 1, backgroundColor: ps.lineOn ? C.primary500 : '#E6E9EF' }} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 2, paddingBottom: 14 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={[ps.cur ? font(600, 13, 18) : ps.done ? font(500, 13, 18) : font(400, 13, 18), { color: ps.cur || ps.done ? C.text : C.text3 }]}>{ps.label}</Txt>
                <Txt style={[font(400, 11, 14), { color: C.text2, marginTop: 2 }]} lines={1}>{ps.sub}</Txt>
              </View>
              <Txt style={[font(400, 11, 18), tabular, { color: C.text2 }]}>{ps.time}</Txt>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function SectionLabel({ label, icon, form }: { label: string; icon?: string; form?: boolean }) {
  if (form) {
    return (
      <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
        <Txt style={font(600, 14, 20)} lines={1}>{label}</Txt>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 }}>
      {icon ? <Icon name={icon} size={18} color={C.primary500} /> : null}
      <Txt style={[font(500, 12, 16), { color: C.text2, flex: 1 }]} lines={1}>{label}</Txt>
    </View>
  );
}

export function CardHeader({
  icon, title, subtitle, status, statusTone = 'info', actionLabel, actionIcon = 'plus', onAction,
}: { icon: string; title: string; subtitle?: string; status?: string; statusTone?: string; actionLabel?: string; actionIcon?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: C.hairline }}>
      <IconTile name={icon} tone="primary" size={40} radius={12} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={font(600, 14, 20)} lines={1}>{title}</Txt>
        {subtitle ? <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]}>{subtitle}</Txt> : null}
      </View>
      {actionLabel ? <Button variant="outline" size="sm" leadingIcon={actionIcon} onPress={onAction}>{actionLabel}</Button> : null}
      {status ? <StatusChip tone={statusTone} label={status} size="sm" /> : null}
    </View>
  );
}

/** Read-only value box. Pass `grow` when it sits in a row next to other fields. */
export function LockedField({ label, value, icon, emphasis, aside, meta, grow }: { label: string; value: string; icon?: string; emphasis?: boolean; aside?: string; meta?: string; grow?: boolean }) {
  return (
    <View style={[{ minWidth: 0, gap: 6 }, grow && { flex: 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt style={[font(500, 12, 16), { flex: 1 }]} lines={1}>{label}</Txt>
        {aside ? <Txt style={[font(600, 11, 14), tabular, { color: C.text2 }]}>{aside}</Txt> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingLeft: 16, paddingRight: 14, borderRadius: R.input, backgroundColor: C.field }}>
        <Txt style={[emphasis ? font(500, 14, 20) : font(400, 14, 20), tabular, { flex: 1, color: emphasis ? C.text : C.text2 }]} lines={1}>{value}</Txt>
        <Icon name={icon || (emphasis ? 'shield-check' : 'lock')} size={16} color={emphasis ? C.successIcon : C.n400} />
      </View>
      {meta ? <Txt style={[font(400, 12, 16), { color: C.text2 }]} lines={1}>{meta}</Txt> : null}
    </View>
  );
}

// ─── Sheet header / footer ──────────────────────────────

export function SheetHeader({
  title, subtitle, icon, onClose, actionLabel, actionIcon, onAction, description, closeBg = '#F2F3F5',
}: {
  title: string; subtitle?: string; icon?: string; onClose: () => void; actionLabel?: string; actionIcon?: string; onAction?: () => void;
  description?: string; closeBg?: string;
}) {
  const drag = useSheetDrag();
  return (
    <View {...drag.panHandlers}>
      <Grabber />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingTop: 4, paddingHorizontal: 16, paddingBottom: 10 }}>
        {icon ? <IconTile name={icon} tone="primary" size={40} radius={12} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt style={font(600, 16, 22)} lines={1}>{title}</Txt>
          {subtitle ? <Txt style={[font(400, 12, 16), { color: C.text2, marginTop: 2 }]} lines={1}>{subtitle}</Txt> : null}
        </View>
        {actionLabel ? <Button variant="secondary" size="sm" leadingIcon={actionIcon} onPress={onAction}>{actionLabel}</Button> : null}
        <IconButton icon="x" label="Close" onPress={onClose} bg={closeBg} />
      </View>
      {description ? <Txt style={[font(400, 12, 17), { color: C.text2, paddingHorizontal: 16, paddingBottom: 12 }]}>{description}</Txt> : null}
    </View>
  );
}

export function FootNote({ note, tone = 'neutral' }: { note?: string | null; tone?: string }) {
  if (!note) return null;
  if (tone === 'warning' || tone === 'success') {
    const warn = tone === 'warning';
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
        <View style={{ marginTop: 1 }}><Icon name={warn ? 'circle-alert' : 'circle-check'} size={14} color={warn ? C.warningIcon : C.successIcon} /></View>
        <Txt style={[font(400, 12, 16), { flex: 1, color: warn ? C.warningText : C.successText }]}>{note}</Txt>
      </View>
    );
  }
  return <Txt style={[font(500, 12, 16), tabular, { color: C.text2 }]}>{note}</Txt>;
}

export function SheetFooter({
  note, noteTone, cancelLabel = 'Cancel', primaryLabel = 'Submit', primaryIcon = 'check', blocked, onCancel, onPrimary,
}: {
  note?: string | null; noteTone?: string; cancelLabel?: string; primaryLabel?: string; primaryIcon?: string; blocked?: boolean; onCancel: () => void; onPrimary: () => void;
}) {
  const pb = useFooterPad(30);
  return (
    <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: pb, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.hairline, gap: 10 }}>
      <FootNote note={note} tone={noteTone} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button variant="secondary" size="lg" fullWidth onPress={onCancel}>{cancelLabel}</Button></View>
        <View style={{ flex: 1.6 }}><Button size="lg" fullWidth leadingIcon={primaryIcon} disabled={blocked} onPress={onPrimary}>{primaryLabel}</Button></View>
      </View>
    </View>
  );
}

// ─── StatusTabs ─────────────────────────────────────────

export type StatusTab = { key: string; label: string; icon?: string; count: number };
export function StatusTabs({ items, active, onChange }: { items: StatusTab[]; active: string; onChange: (k: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 6, paddingVertical: 2, paddingHorizontal: 16 }}>
      {items.map((it) => {
        const on = it.key === active, ic = it.key !== 'All' && it.icon;
        const fg = on ? '#fff' : C.text;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [{
              height: 36, paddingLeft: ic ? 11 : 13, paddingRight: 6, borderRadius: 999, backgroundColor: on ? C.primary500 : '#fff', borderWidth: 1,
              borderColor: on ? C.primary500 : '#E9ECF1', flexDirection: 'row', alignItems: 'center', gap: 6,
            }, pressed && { opacity: 0.7 }]}
          >
            {ic ? <Icon name={it.icon!} size={14} color={fg} /> : null}
            <Txt style={[on ? font(600, 13, 16) : font(500, 13, 16), { color: fg }]}>{it.label}</Txt>
            <View style={{ minWidth: 22, height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: on ? 'rgba(255,255,255,0.24)' : '#F1F3F6', alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={[font(600, 10, 12), tabular, { color: on ? '#fff' : C.text2 }]}>{it.count}</Txt>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── BinRow (put away: package → bin) ───────────────────

export function BinRow({
  n, code, bin, barsLabel, divider, onPickBin, onScan, onViewBars,
}: { n: string; code: string; bin: string; barsLabel: string; divider?: boolean; onPickBin: () => void; onScan: () => void; onViewBars: () => void }) {
  return (
    <View style={{ gap: 10, paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: divider ? 1 : 0, borderTopColor: C.hairline }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Txt style={[font(500, 12, 16), tabular, { minWidth: 14, color: C.text2 }]}>{n}</Txt>
        <IconTile name="package" tone="primary" size={32} radius={9} />
        <Txt style={[font(500, 14, 20), tabular, { flex: 1 }]} lines={1}>{code}</Txt>
        <Button variant="secondary" size="sm" leadingIcon="eye" onPress={onViewBars}>{barsLabel}</Button>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <TextField label="Bin details" required leadingIcon="map-pin" placeholder="Select bin" value={bin} readOnly trailingIcon="chevron-down" onPress={onPickBin} style={{ flex: 1 }} />
        <IconButton icon="scan-barcode" label="Scan bin" variant="tonal" size="lg" shape="rounded" onPress={onScan} />
      </View>
    </View>
  );
}

/** Items list row used by the put away, pick and pack sheets (selectable, with a done check). */
export function SelectRow({
  name, sub, selected, done, onPress, leftBar,
}: { name: string; sub: string; selected: boolean; done: boolean; onPress: () => void; leftBar?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingRight: 14, paddingLeft: leftBar ? 11 : 14,
        backgroundColor: selected ? C.primary25 : '#fff', borderTopWidth: 1, borderTopColor: C.hairline,
        borderLeftWidth: leftBar ? 3 : 0, borderLeftColor: selected ? C.primary500 : 'transparent',
      }, pressed && { opacity: 0.6 }]}
    >
      <IconTile name="package" tone="primary" size={36} radius={10} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt style={[font(600, 14, 20), { color: selected ? C.primary600 : C.text }]} lines={1}>{name}</Txt>
        <Txt style={[font(400, 12, 16), tabular, { color: C.text2, marginTop: 1 }]} lines={1}>{sub}</Txt>
      </View>
      {done ? (
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary500, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} color="#fff" /></View>
      ) : (
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.n200 }} />
      )}
    </Pressable>
  );
}

/** Blue progress bar with header — "Items · 1/2 picked". */
export function ItemsProgress({ title, done, pct }: { title: string; done: string; pct: number }) {
  return (
    <View style={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Txt style={[font(600, 14, 20), { flex: 1 }]}>{title}</Txt>
        <Txt style={[font(500, 12, 16), tabular, { color: C.text2 }]}>{done}</Txt>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: '#EEF1F6', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${pct}%`, borderRadius: 3, backgroundColor: C.primary500 }} />
      </View>
    </View>
  );
}

/** Bar-number table used by the view / edit bars sheets. */
export function BarTableHead({ count }: { count: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: C.hairline }}>
      <Txt style={[font(600, 12, 16), { width: 20, color: C.text2 }]}>#</Txt>
      <Txt style={[font(600, 12, 16), { flex: 1, color: C.text2 }]}>Bar number</Txt>
      <Txt style={[font(500, 12, 16), tabular, { color: C.text2 }]}>{count}</Txt>
    </View>
  );
}

/** Single full-width primary button footer ("Done"). */
export function DoneFooter({ label = 'Done', onPress }: { label?: string; onPress: () => void }) {
  const pb = useFooterPad(34);
  return (
    <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: pb, borderTopWidth: 1, borderTopColor: C.hairline, backgroundColor: '#fff' }}>
      <Button size="lg" fullWidth onPress={onPress}>{label}</Button>
    </View>
  );
}
