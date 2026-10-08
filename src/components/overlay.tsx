import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated, BackHandler, Easing, Keyboard, PanResponder, Platform, Pressable, ScrollView, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, SHEET_EASE, shadow } from '../theme/tokens';
import { FormContext } from './ds';

const ease = Easing.bezier(...SHEET_EASE);

/** Android back button: the most recently mounted overlay handles it first. */
export function useBack(handler: (() => void) | undefined, enabled = true) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { ref.current?.(); return true; });
    return () => sub.remove();
  }, [enabled]);
}

/** Lets a signature pad lock its sheet's scroll while the user draws. */
export const ScrollLockContext = createContext<(locked: boolean) => void>(() => {});
export const useScrollLock = () => useContext(ScrollLockContext);

/** Drag-down-to-dismiss handle, attached to sheet headers (the prototype closes on a >56px drag). */
const DragContext = createContext<{ panHandlers?: object }>({});
export const useSheetDrag = () => useContext(DragContext);

/** Height of the on-screen keyboard (0 when hidden). */
export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setH(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setH(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return h;
}
/** True while a sheet is lifted above the keyboard — footers then drop their home-indicator padding. */
const KeyboardOpenContext = createContext(false);

/**
 * Bottom sheet over a scrim — the prototype's `position:absolute;inset:0` overlay with the `vsheet`/`vfade` animations.
 * header and footer stay fixed; children scroll. Changing `page` (e.g. a wizard step) scrolls the body back to the top.
 */
export function Sheet({
  onClose, header, footer, children, bg = '#fff', bodyBg, form = true, z = 40, maxHeight, bodyStyle, scroll = true, fill, page,
}: {
  onClose: () => void; header?: React.ReactNode; footer?: React.ReactNode; children?: React.ReactNode; bg?: string; bodyBg?: string; form?: boolean;
  z?: number; maxHeight?: number; bodyStyle?: StyleProp<ViewStyle>; scroll?: boolean; fill?: boolean; page?: string | number;
}) {
  const body = useRef<ScrollView>(null);
  useEffect(() => { body.current?.scrollTo({ y: 0, animated: false }); }, [page]);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  const [locked, setLocked] = useState(false);
  useBack(onClose);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 320, easing: ease, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [y, fade]);

  const close = useRef(onClose);
  close.current = onClose;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 56) close.current();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(),
    }),
  ).current;

  // Lift the sheet above the keyboard and shrink it so the header stays on screen.
  const kbRaw = useKeyboardHeight();
  // Edge-to-edge Android reports the keyboard without the navigation bar below it.
  const kb = kbRaw > 0 && Platform.OS === 'android' ? kbRaw + insets.bottom : kbRaw;
  const mh = Math.min(maxHeight ?? height, height - insets.top - 6) - kb;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: z, elevation: z }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim, opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: kb }} pointerEvents="box-none">
        <Animated.View
          style={[
            { maxHeight: mh, height: fill ? mh : undefined, backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
            shadow.sheet,
            { transform: [{ translateY: Animated.add(y, drag) }] },
          ]}
        >
          <DragContext.Provider value={{ panHandlers: pan.panHandlers }}>
            <KeyboardOpenContext.Provider value={kb > 0}>
            <FormContext.Provider value={form}>
              <ScrollLockContext.Provider value={setLocked}>
                {header}
                {scroll ? (
                  <ScrollView
                    ref={body}
                    style={{ flexGrow: fill ? 1 : 0, flexShrink: 1, backgroundColor: bodyBg }}
                    contentContainerStyle={[{ padding: 16, paddingTop: 12, gap: 12 }, bodyStyle]}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={!locked}
                    showsVerticalScrollIndicator={false}
                  >
                    {children}
                  </ScrollView>
                ) : (
                  children
                )}
                {footer}
              </ScrollLockContext.Provider>
            </FormContext.Provider>
            </KeyboardOpenContext.Provider>
          </DragContext.Provider>
        </Animated.View>
      </View>
    </View>
  );
}

/** Grab handle used at the top of every sheet. */
export const Grabber = ({ color = C.n300 }: { color?: string }) => (
  <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 2 }}>
    <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: color }} />
  </View>
);

/** Full-screen page that slides in from the right (the prototype's `vpush` detail pages). */
export function PushScreen({ onBack, children, z = 25 }: { onBack: () => void; children: React.ReactNode; z?: number }) {
  const { width } = useWindowDimensions();
  const x = useRef(new Animated.Value(width)).current;
  useBack(onBack);
  useEffect(() => {
    Animated.timing(x, { toValue: 0, duration: 340, easing: ease, useNativeDriver: true }).start();
  }, [x]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: z, elevation: z, backgroundColor: C.bgApp, transform: [{ translateX: x }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Bottom padding for sheet footers. The prototype's 30–34px sits over the iPhone home indicator;
 * Android's button / gesture bar is opaque, so footers clear it plus a small gap.
 */
export const useFooterPad = (base = 30) => {
  const insets = useSafeAreaInsets();
  const kbOpen = useContext(KeyboardOpenContext);
  if (kbOpen) return 12;
  return Platform.OS === 'ios' ? Math.max(base - 34 + insets.bottom, 16) : insets.bottom + 12;
};

/** Bottom padding for detail-page scroll content (clears the home indicator / nav bar). */
export const useDetailPad = () => 40 + useSafeAreaInsets().bottom;

/** Sheet footer container with the right bottom padding (keyboard- and nav-bar-aware). */
export function FooterBar({ base = 30, style, children }: { base?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const pb = useFooterPad(base);
  return <View style={[style, { paddingBottom: pb }]}>{children}</View>;
}

/** Distance from the screen bottom to the floating nav bar (26px above the home indicator in the prototype). */
export const useNavBottom = () => {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? Math.max(insets.bottom - 8, 16) : insets.bottom + 12;
};
