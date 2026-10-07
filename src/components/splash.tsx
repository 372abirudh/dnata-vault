import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, font } from '../theme/tokens';
import { HeroBackground, Logo } from './art';
import { Txt } from './ds';

/**
 * Branded launch screen shown over the app after the native splash: hero artwork, dnata wordmark and
 * the product name, then a fade into the app. Calls onDone when it has faded out.
 */
export function BrandSplash({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const intro = useRef(new Animated.Value(0)).current;
  const out = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(intro, { toValue: 1, duration: 650, easing: Easing.bezier(0.3, 0, 0, 1), useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(out, { toValue: 0, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => onDone());
  }, [intro, out, onDone]);

  const rise = (d: number) => ({
    opacity: intro,
    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [d, 0] }) }],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 100, backgroundColor: C.navy, opacity: out }]} pointerEvents="none">
      <HeroBackground />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ alignItems: 'center' }, rise(12)]}>
          <Logo height={52} onDark />
          <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
            <Txt style={[font(600, 15, 20), { color: '#fff', letterSpacing: 4 }]}>VAULT</Txt>
            <View style={{ width: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          </View>
        </Animated.View>
      </View>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 32, alignItems: 'center' }, rise(8)]}>
        <Txt style={[font(400, 12, 16), { color: 'rgba(255,255,255,0.62)', letterSpacing: 1.2 }]}>LOGISTICS · VAULT SERVICES</Txt>
      </Animated.View>
    </Animated.View>
  );
}
