/**
 * Design-system primitives — React Native ports of the CourierMobileDesignSystem bundle components,
 * with the Vault App overrides from the prototype's stylesheet applied (14px buttons/inputs, gray fields,
 * borderless cards, compact form type).
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, KeyboardTypeOptions, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextInput, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { Icon } from '../icons/Icon';
import { C, ICON_TONE, R, STATUS_TONE, TILE_TONE, font, mono, shadow, tabular } from '../theme/tokens';

// ─── Text & press helpers ───────────────────────────────

export function Txt({ style, lines, ...p }: TextProps & { lines?: number }) {
  return <Text {...p} numberOfLines={lines} style={[{ color: C.text }, style]} />;
}

type PressProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; pressed?: StyleProp<ViewStyle> };
/** Pressable with the design system's press feedback (ds-press: slight scale + opacity). */
export function Press({ style, pressed, ...p }: PressProps) {
  return (
    <Pressable
      {...p}
      style={({ pressed: on }) => [style, on && (pressed ?? { opacity: 0.88, transform: [{ scale: 0.98 }] })]}
    />
  );
}

/** White app card (radius 20) — the prototype's `background:var(--app-card-bg);border-radius:var(--app-card-radius)` box. */
export function Box({ style, children, padded }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode; padded?: boolean }) {
  return <View style={[{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }, padded && { padding: 14 }, style]}>{children}</View>;
}

export const Gap = ({ h = 12, w }: { h?: number; w?: number }) => <View style={w ? { width: w } : { height: h }} />;

/** Forms in sheets marked data-form use 44px fields and 14px type; others use 48px / 15px. */
export const FormContext = createContext(true);

// ─── Button ─────────────────────────────────────────────

export type BtnVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'text' | 'destructive';
const BTN: Record<BtnVariant, { bg: string; fg: string; bd: string }> = {
  primary: { bg: C.primary500, fg: '#fff', bd: 'transparent' },
  secondary: { bg: C.primary50, fg: C.primary600, bd: 'transparent' },
  tertiary: { bg: C.n100, fg: C.n800, bd: 'transparent' },
  outline: { bg: '#fff', fg: C.primary600, bd: C.primary500 },
  ghost: { bg: 'transparent', fg: C.primary600, bd: 'transparent' },
  text: { bg: 'transparent', fg: C.link, bd: 'transparent' },
  destructive: { bg: C.errorStrong, fg: '#fff', bd: 'transparent' },
};
const BTN_SIZE = { sm: { h: 36, px: 14, icon: 16, f: font(600, 13, 18) }, md: { h: 44, px: 18, icon: 18, f: font(600, 14, 20) }, lg: { h: 48, px: 20, icon: 20, f: font(600, 14, 20) } };

export function Button({
  children, variant = 'primary', size = 'md', fullWidth, leadingIcon, trailingIcon, disabled, onPress, style,
}: {
  children?: React.ReactNode; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg'; fullWidth?: boolean; leadingIcon?: string; trailingIcon?: string;
  disabled?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle>;
}) {
  const s = BTN_SIZE[size], v = BTN[variant], text = variant === 'text';
  const bg = disabled && (variant === 'primary' || variant === 'destructive') ? C.n150 : v.bg;
  const fg = disabled ? C.textDisabled : v.fg;
  return (
    <Press
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        {
          height: text ? undefined : s.h, minHeight: text ? 32 : undefined, paddingHorizontal: text ? 2 : s.px, paddingVertical: text ? 4 : 0,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: size === 'sm' ? 6 : 8,
          borderRadius: R.button, borderWidth: 1, borderColor: disabled && v.bd !== 'transparent' ? C.borderDefault : v.bd, backgroundColor: bg,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {leadingIcon ? <Icon name={leadingIcon} size={s.icon} color={fg} /> : null}
      {children != null ? <Txt style={[s.f, { color: fg }]} lines={1}>{children}</Txt> : null}
      {trailingIcon ? <Icon name={trailingIcon} size={s.icon} color={fg} /> : null}
    </Press>
  );
}

// ─── IconButton ─────────────────────────────────────────

const IB = {
  plain: { bg: 'transparent', fg: C.n700 }, neutral: { bg: C.n100, fg: C.n700 }, tonal: { bg: C.primary50, fg: C.primary600 },
  surface: { bg: '#fff', fg: C.n700 }, filled: { bg: C.primary500, fg: '#fff' },
};
export function IconButton({
  icon, label, variant = 'plain', size = 'md', shape = 'circle', onPress, bg,
}: { icon: string; label: string; variant?: keyof typeof IB; size?: 'sm' | 'md' | 'lg'; shape?: 'circle' | 'rounded'; onPress?: () => void; bg?: string }) {
  // The app stylesheet renders every "Close" / "Back" icon button as a 40px circle.
  const isClose = label === 'Close' || label === 'Back';
  const px = isClose ? 40 : size === 'sm' ? 36 : size === 'lg' ? 48 : 44;
  const v = IB[variant];
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={isClose ? 4 : 0}
      style={{
        width: px, height: px, borderRadius: shape === 'circle' ? px / 2 : R.md, alignItems: 'center', justifyContent: 'center',
        backgroundColor: isClose ? bg ?? '#fff' : v.bg,
      }}
    >
      <Icon name={icon} size={size === 'sm' && !isClose ? 18 : 20} color={isClose ? C.text : v.fg} />
    </Press>
  );
}

// ─── StatusChip / Badge / IconTile / Avatar ─────────────

export function StatusChip({ tone = 'neutral', label, size = 'md' }: { tone?: string; label: string; size?: 'sm' | 'md' }) {
  const [bg, fg, dot] = STATUS_TONE[tone] ?? STATUS_TONE.neutral;
  const sm = size === 'sm';
  return (
    <View style={{ height: sm ? 20 : 24, paddingHorizontal: sm ? 7 : 9, gap: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', backgroundColor: bg, alignSelf: 'flex-start' }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Txt style={[sm ? font(500, 11, 14) : font(500, 12, 16), { color: fg }]} lines={1}>{label}</Txt>
    </View>
  );
}

const BADGE: Record<string, [string, string]> = {
  neutral: [C.n100, C.n700], primary: [C.primary50, C.primary700], accent: [C.accent50, C.accent700],
  success: [C.successBg, C.successText], warning: [C.warningBg, C.warningText], error: [C.errorBg, C.errorText],
};
export function Badge({ label, tone = 'primary' }: { label: string; tone?: string }) {
  const [bg, fg] = BADGE[tone] ?? BADGE.error;
  return (
    <View style={{ height: 20, paddingHorizontal: 6, borderRadius: R.xs, backgroundColor: bg, justifyContent: 'center' }}>
      <Txt style={[font(500, 11, 14), tabular, { color: fg }]}>{label}</Txt>
    </View>
  );
}

export function IconTile({ name, tone = 'primary', size = 40, radius }: { name: string; tone?: string; size?: number; radius?: number }) {
  const [bg, fg] = TILE_TONE[tone] ?? TILE_TONE.primary;
  return (
    <View style={{ width: size, height: size, borderRadius: radius ?? (size >= 40 ? R.md : R.sm), backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={Math.round(size * 0.5)} color={fg} />
    </View>
  );
}

const TINTS: [string, string][] = [[C.primary50, C.primary700], [C.accent50, C.accent700], [C.successBg, C.successText], [C.warningBg, C.warningText]];
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const [bg, fg] = TINTS[(name.charCodeAt(0) || 0) % TINTS.length];
  const fs = size <= 24 ? 10 : size <= 32 ? 12 : size <= 40 ? 14 : size <= 48 ? 16 : 18;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt style={[font(600, fs, fs + 2), { color: fg }]}>{ini}</Txt>
    </View>
  );
}

// ─── Card / InfoGrid / MetricCard / Chip ────────────────

export function Card({
  variant = 'default', padding = 16, onPress, children, style,
}: { variant?: 'default' | 'selected'; padding?: number; onPress?: () => void; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const sel = variant === 'selected';
  const st: StyleProp<ViewStyle> = [
    { borderRadius: R.card, padding, backgroundColor: sel ? C.primary25 : '#fff', borderWidth: 1.5, borderColor: sel ? C.primary500 : 'transparent' },
    style,
  ];
  return onPress ? <Press onPress={onPress} style={st}>{children}</Press> : <View style={st}>{children}</View>;
}

/**
 * CSS-grid-like rows: `repeat(columns, minmax(0,1fr))` with column/row gaps. A cell may span several columns;
 * a short last row keeps its cells at column width (no stretching).
 */
export function Grid({
  cells, columns = 2, columnGap = 16, rowGap = 12, spans, style,
}: { cells: React.ReactNode[]; columns?: number; columnGap?: number; rowGap?: number; spans?: (number | undefined)[]; style?: StyleProp<ViewStyle> }) {
  const rows: { node: React.ReactNode; span: number }[][] = [];
  let cur: { node: React.ReactNode; span: number }[] = [], used = 0;
  cells.forEach((node, i) => {
    const span = Math.min(columns, spans?.[i] ?? 1);
    if (used + span > columns) { rows.push(cur); cur = []; used = 0; }
    cur.push({ node, span });
    used += span;
  });
  if (cur.length) rows.push(cur);
  return (
    <View style={[{ gap: rowGap }, style]}>
      {rows.map((r, i) => {
        const left = columns - r.reduce((a, c) => a + c.span, 0);
        return (
          <View key={i} style={{ flexDirection: 'row', gap: columnGap }}>
            {r.map((c, j) => <View key={j} style={{ flex: c.span, minWidth: 0 }}>{c.node}</View>)}
            {left > 0 ? <View style={{ flex: left }} /> : null}
          </View>
        );
      })}
    </View>
  );
}

export type Kv = { label: string; value: string; span?: number };
export function InfoGrid({ items, columns = 2, inset = true, dense = false, style }: { items: Kv[]; columns?: number; inset?: boolean; dense?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Grid
      columns={columns} columnGap={16} rowGap={dense ? 12 : 16} spans={items.map((it) => it.span)}
      style={[inset && { backgroundColor: C.surfaceInset, borderRadius: 14, padding: dense ? 12 : 16 }, style]}
      cells={items.map((it, i) => (
        <View key={i} style={{ gap: 4 }}>
          <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{it.label}</Txt>
          <Txt style={[font(400, 13, 18), tabular]}>{it.value}</Txt>
        </View>
      ))}
    />
  );
}

export function MetricCard({ label, value, unit, delta, deltaTone = 'success' }: { label: string; value: string; unit?: string; delta?: string; deltaTone?: string }) {
  const dc = deltaTone === 'error' ? C.errorText : deltaTone === 'neutral' ? C.text2 : C.successText;
  return (
    <View style={{ flex: 1, minWidth: 0, padding: 14, backgroundColor: '#fff', borderRadius: R.card, gap: 10 }}>
      <Txt style={[font(400, 12, 16), { color: C.text2 }]} lines={1}>{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Txt style={[font(700, 22, 28), tabular]}>{value}</Txt>
        {unit ? <Txt style={[font(500, 12, 16), { color: C.text2 }]}>{unit}</Txt> : null}
      </View>
      {delta ? <Txt style={[font(500, 11, 14), { color: dc, marginTop: -6 }]}>{delta}</Txt> : null}
    </View>
  );
}

export function Chip({ label, icon, size = 'md', removable, onRemove, mono: isMono }: { label: string; icon?: string; size?: 'sm' | 'md'; removable?: boolean; onRemove?: () => void; mono?: boolean }) {
  return (
    <View
      style={{
        height: size === 'sm' ? 28 : 32, paddingLeft: icon ? 10 : 12, paddingRight: removable ? 8 : 12, gap: 6, flexDirection: 'row', alignItems: 'center',
        borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderDefault,
      }}
    >
      {icon ? <Icon name={icon} size={16} color={C.n700} /> : null}
      <Txt style={[isMono ? mono(12, 16) : font(500, 12, 16), { color: C.n700 }]}>{label}</Txt>
      {removable ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${label}`}>
          <Icon name="x" size={14} color={C.n700} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Feedback ───────────────────────────────────────────

const EMPTY: Record<string, [string, string]> = {
  primary: [C.primary50, C.primary500], success: [C.successBg, C.successIcon], warning: [C.warningBg, C.warningIcon],
  error: [C.errorBg, C.errorIcon], neutral: [C.n100, C.n500],
};
export function EmptyState({ icon = 'package-open', tone = 'primary', title, description }: { icon?: string; tone?: string; title: string; description?: string }) {
  const [bg, fg] = EMPTY[tone] ?? EMPTY.primary;
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} color={fg} />
      </View>
      <Txt style={[font(600, 15, 20), { marginTop: 16, textAlign: 'center' }]}>{title}</Txt>
      {description ? <Txt style={[font(400, 13, 18), { color: C.text2, marginTop: 6, maxWidth: 290, textAlign: 'center' }]}>{description}</Txt> : null}
    </View>
  );
}

const TOAST: Record<string, [string, string]> = {
  success: ['circle-check', C.successIcon], error: ['circle-alert', '#FF6B6F'], warning: ['triangle-alert', C.warningIcon], info: ['info', C.primary300],
};
export function Toast({ message, tone = 'success' }: { message: string; tone?: string }) {
  const [icon, color] = TOAST[tone] ?? TOAST.info;
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 200, easing: Easing.bezier(0.3, 0, 0, 1), useNativeDriver: true }).start();
  }, [message, a]);
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, borderRadius: R.md, backgroundColor: C.n900 },
        shadow.card2,
        { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <Icon name={icon} size={18} color={color} />
      <Txt style={[font(400, 13, 18), { color: '#fff', flex: 1 }]}>{message}</Txt>
    </Animated.View>
  );
}

// ─── Form controls ──────────────────────────────────────

export function Checkbox({
  checked, indeterminate, label, description, onChange, style,
}: { checked: boolean; indeterminate?: boolean; label?: string; description?: string; onChange?: () => void; style?: StyleProp<ViewStyle> }) {
  const on = checked || indeterminate;
  return (
    <Pressable
      onPress={onChange}
      disabled={!onChange}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: indeterminate ? 'mixed' : checked }}
      style={[{ flexDirection: 'row', gap: 12, alignItems: description ? 'flex-start' : 'center', minHeight: label ? 44 : 20 }, style]}
    >
      <View
        style={{
          width: 20, height: 20, borderRadius: R.xs, marginTop: description ? 1 : 0, alignItems: 'center', justifyContent: 'center',
          backgroundColor: on ? C.primary500 : '#fff', borderWidth: 1.5, borderColor: on ? C.primary500 : C.borderStrong,
        }}
      >
        {on ? <Icon name={indeterminate ? 'minus' : 'check'} size={14} color="#fff" /> : null}
      </View>
      {label || description ? (
        <View style={{ flex: 1, gap: 2 }}>
          {label ? <Txt style={font(400, 14, 20)}>{label}</Txt> : null}
          {description ? <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{description}</Txt> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export function Radio({ checked, label, onPress }: { checked: boolean; label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: checked ? C.primary500 : C.primary400, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        {checked ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary500 }} /> : null}
      </View>
      <Txt style={font(400, 14, 20)}>{label}</Txt>
    </Pressable>
  );
}

export function Stepper({ value, min = 0, max = 99, onChange, size = 'md' }: { value: number; min?: number; max?: number; onChange: (v: number) => void; size?: 'sm' | 'md' }) {
  const h = size === 'sm' ? 32 : 36;
  const btn = (icon: string, dis: boolean, d: number, lbl: string) => (
    <Press disabled={dis} accessibilityLabel={lbl} onPress={() => onChange(Math.min(max, Math.max(min, value + d)))} style={{ width: h + 4, height: h, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} color={dis ? C.n300 : C.primary600} />
    </Press>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: h + 2, borderRadius: 10, borderWidth: 1, borderColor: C.borderDefault, backgroundColor: '#fff' }}>
      {btn('minus', value <= min, -1, 'Decrease')}
      <Txt style={[font(600, 14, 20), tabular, { minWidth: 36, textAlign: 'center' }]}>{value}</Txt>
      {btn('plus', value >= max, 1, 'Increase')}
    </View>
  );
}

export function TextField({
  label, required, placeholder, value, onChangeText, leadingIcon, trailingIcon, prefix, suffix, keyboardType, multiline, rows = 3,
  disabled, readOnly, onPress, success, helper, autoCapitalize, mono: isMono, style,
}: {
  label?: string; required?: boolean; placeholder?: string; value: string; onChangeText?: (v: string) => void; leadingIcon?: string;
  trailingIcon?: string; prefix?: string; suffix?: string; keyboardType?: KeyboardTypeOptions; multiline?: boolean; rows?: number;
  disabled?: boolean; readOnly?: boolean; onPress?: () => void; success?: boolean; helper?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; mono?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const form = useContext(FormContext);
  const [focus, setFocus] = useState(false);
  const h = form ? 44 : 48;
  const tf: TextStyle = isMono ? mono(14, 20) : font(400, form ? 14 : 15, 20);
  const trail = success ? 'circle-check' : trailingIcon;
  const box = (
    <View style={{ borderRadius: R.input + 3, borderWidth: 3, borderColor: focus ? C.primary100 : 'transparent', margin: -3 }}>
      <View
        style={{
          flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: 8, minHeight: multiline ? rows * 20 + 24 : h,
          paddingHorizontal: 14, paddingVertical: multiline ? 12 : 0, borderRadius: R.input, borderWidth: 1,
          borderColor: focus ? C.primary500 : 'transparent', backgroundColor: focus ? '#fff' : C.field,
        }}
      >
        {leadingIcon ? <Icon name={leadingIcon} size={18} color={focus ? C.primary500 : C.n400} /> : null}
        {prefix ? (
          <Txt style={[font(400, 14, 20), { paddingRight: 8, borderRightWidth: 1, borderRightColor: C.borderSubtle }]}>{prefix}</Txt>
        ) : null}
        {readOnly || disabled ? (
          <Txt style={[tf, { flex: 1, color: disabled ? C.textDisabled : value ? C.text : '#9AA1AD' }]} lines={multiline ? undefined : 1}>
            {value || placeholder || ''}
          </Txt>
        ) : (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9AA1AD"
            keyboardType={keyboardType}
            multiline={multiline}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            selectionColor={C.primary500}
            style={[tf, { flex: 1, color: C.text, padding: 0, margin: 0, minHeight: multiline ? rows * 20 : undefined, textAlignVertical: multiline ? 'top' : 'center' }]}
          />
        )}
        {suffix ? <Txt style={[font(400, 13, 18), { color: C.text2 }]}>{suffix}</Txt> : null}
        {trail ? <Icon name={trail} size={18} color={success ? C.successIcon : C.n400} /> : null}
      </View>
    </View>
  );
  return (
    <View style={[{ gap: 6, minWidth: 0 }, style]}>
      {label ? (
        <Txt style={[form ? font(500, 12, 16) : font(500, 13, 18), { color: disabled ? C.textDisabled : C.text }]} lines={1}>
          {label}
          {required ? <Txt style={{ color: C.errorStrong }}> *</Txt> : null}
        </Txt>
      ) : null}
      {onPress ? (
        <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }} accessibilityRole="button" accessibilityLabel={label}>
          {box}
        </Pressable>
      ) : (
        box
      )}
      {helper ? <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{helper}</Txt> : null}
    </View>
  );
}

/** Read-only field that opens a picker — the prototype's TextField + chevron-down pattern. */
export const SelectField = (p: { label: string; value: string; placeholder?: string; required?: boolean; onPress: () => void; leadingIcon?: string; suffix?: string; helper?: string }) => (
  <TextField {...p} readOnly trailingIcon="chevron-down" />
);

// ─── SegmentedControl ───────────────────────────────────

export function SegmentedControl({
  items, active, onChange, trackColor = C.n100,
}: { items: { key: string; label: string }[]; active: string; onChange: (k: string) => void; trackColor?: string }) {
  const [w, setW] = useState(0);
  const idx = Math.max(0, items.findIndex((i) => i.key === active));
  const x = useRef(new Animated.Value(idx)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: idx, duration: 200, easing: Easing.bezier(0.3, 0, 0, 1), useNativeDriver: true }).start();
  }, [idx, x]);
  const seg = (w - 4) / items.length;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: 36, padding: 2, borderRadius: 10, backgroundColor: trackColor, flexDirection: 'row' }}>
      {w > 0 ? (
        <Animated.View
          style={[
            { position: 'absolute', top: 2, bottom: 2, left: 2, width: seg, borderRadius: R.sm, backgroundColor: '#fff' },
            // Android elevation would paint the thumb over the labels; use a hairline there instead.
            Platform.OS === 'ios' ? shadow.small : { borderWidth: 0.5, borderColor: 'rgba(16,24,40,0.10)' },
            { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, seg] }) }] },
          ]}
        />
      ) : null}
      {items.map((it) => {
        const on = it.key === active;
        return (
          <Pressable key={it.key} onPress={() => onChange(it.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={[on ? font(600, 13, 17) : font(500, 12, 16), { color: on ? C.text : C.n600 }]} lines={1}>{it.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Lists ──────────────────────────────────────────────

export function ListRow({
  title, subtitle, meta, value, leading, leadingTone = 'neutral', trailing, onPress, disabled, divider,
}: {
  title: string; subtitle?: string; meta?: string; value?: string; leading?: string; leadingTone?: string; trailing?: 'chevron';
  onPress?: () => void; disabled?: boolean; divider?: boolean;
}) {
  const body = (
    <>
      {leading ? <IconTile name={leading} size={36} tone={leadingTone} radius={10} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Txt style={font(400, 14, 20)} lines={1}>{title}</Txt>
        {subtitle ? <Txt style={[font(400, 12, 16), { color: C.text2 }]} lines={1}>{subtitle}</Txt> : null}
      </View>
      {value || meta ? (
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          {value ? <Txt style={[font(500, 14, 20), tabular]}>{value}</Txt> : null}
          {meta ? <Txt style={[font(400, 12, 16), { color: C.text2 }]}>{meta}</Txt> : null}
        </View>
      ) : null}
      {trailing === 'chevron' ? <Icon name="chevron-right" size={18} color={C.n400} /> : null}
      {divider ? <View style={{ position: 'absolute', left: leading ? 64 : 16, right: 0, bottom: 0, height: 1, backgroundColor: C.borderSubtle }} /> : null}
    </>
  );
  const st: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 12, paddingHorizontal: 16, opacity: disabled ? 0.5 : 1 };
  return onPress ? (
    <Pressable onPress={disabled ? undefined : onPress} disabled={disabled} style={({ pressed }) => [st, pressed && { backgroundColor: C.n50 }]}>
      {body}
    </Pressable>
  ) : (
    <View style={st}>{body}</View>
  );
}

export function ListGroup({ children }: { children: React.ReactNode }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: R.card, overflow: 'hidden' }}>
      {rows.map((r, i) => (
        <View key={i}>
          {r}
          {i < rows.length - 1 ? <View style={{ position: 'absolute', left: 16, right: 0, bottom: 0, height: 1, backgroundColor: C.borderSubtle }} /> : null}
        </View>
      ))}
    </View>
  );
}

// ─── Dialog ─────────────────────────────────────────────

const DLG: Record<string, [string, string]> = { primary: [C.primary50, C.primary500], error: [C.errorBg, C.errorIcon], warning: [C.warningBg, C.warningIcon], success: [C.successBg, C.successIcon] };
export function Dialog({
  open, icon, tone = 'primary', title, message, primaryLabel, secondaryLabel = 'Cancel', onPrimary, onSecondary,
}: { open: boolean; icon?: string; tone?: string; title: string; message?: string; primaryLabel: string; secondaryLabel?: string; onPrimary: () => void; onSecondary: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) { a.setValue(0); Animated.timing(a, { toValue: 1, duration: 200, easing: Easing.bezier(0.3, 0, 0, 1), useNativeDriver: true }).start(); }
  }, [open, a]);
  if (!open) return null;
  const [bg, fg] = DLG[tone] ?? DLG.primary;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 60, elevation: 60, alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim, opacity: a }]}>
        <Pressable style={{ flex: 1 }} onPress={onSecondary} />
      </Animated.View>
      <Animated.View
        accessibilityRole="alert"
        style={[
          { width: 311, maxWidth: '88%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' }, shadow.card2,
          { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] },
        ]}
      >
        {icon ? (
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name={icon} size={26} color={fg} />
          </View>
        ) : null}
        <Txt style={[font(600, 16, 22), { textAlign: 'center' }]}>{title}</Txt>
        {message ? <Txt style={[font(400, 13, 18), { color: C.text2, marginTop: 8, textAlign: 'center' }]}>{message}</Txt> : null}
        <View style={{ flexDirection: 'row-reverse', gap: 8, marginTop: 20, alignSelf: 'stretch' }}>
          <Button fullWidth style={{ flex: 1 }} onPress={onPrimary}>{primaryLabel}</Button>
          {secondaryLabel ? <Button variant="tertiary" style={{ flex: 1 }} onPress={onSecondary}>{secondaryLabel}</Button> : null}
        </View>
      </Animated.View>
    </View>
  );
}

export { Icon, ICON_TONE };
