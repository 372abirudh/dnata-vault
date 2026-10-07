import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated, BackHandler, Easing, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle,
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

/**
 * Bottom sheet over a scrim — the prototype's `position:absolute;inset:0` overlay with the `vsheet`/`vfade` animations.
 * header and footer stay fixed; children scroll.
 */
export function Sheet({
  onClose, header, footer, children, bg = '#fff', bodyBg, form = true, z = 40, maxHeight, bodyStyle, scroll = true, fill,
}: {
  onClose: () => void; header?: React.ReactNode; footer?: React.ReactNode; children?: React.ReactNode; bg?: string; bodyBg?: string; form?: boolean;
  z?: number; maxHeight?: number; bodyStyle?: StyleProp<ViewStyle>; scroll?: boolean; fill?: boolean;
}) {
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

  const mh = maxHeight ?? height - insets.top - 6;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: z, elevation: z }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim, opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View
          style={[
            { maxHeight: mh, height: fill ? mh : undefined, backgroundColor: bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
            shadow.sheet,
            { transform: [{ translateY: Animated.add(y, drag) }] },
          ]}
        >
          <DragContext.Provider value={{ panHandlers: pan.panHandlers }}>
            <FormContext.Provider value={form}>
              <ScrollLockContext.Provider value={setLocked}>
                {header}
                {scroll ? (
                  <ScrollView
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
          </DragContext.Provider>
        </Animated.View>
      </KeyboardAvoidingView>
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

/** Bottom padding for sheet footers: clears the home indicator / gesture bar. */
export const useFooterPad = (base = 30) => {
  const insets = useSafeAreaInsets();
  return Math.max(base - 34 + insets.bottom, 16);
};
