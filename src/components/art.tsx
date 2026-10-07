import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop, SvgXml } from 'react-native-svg';
import type { SigData } from '../data/types';
import { useScrollLock } from './overlay';

// ─── dnata logo (assets/dnata-logo.svg, metadata stripped) ───
const LOGO_PATHS = `<g transform="translate(-127.09863,-178.43577)">
<path transform="matrix(0.35277777,0,0,-0.35277777,134.72434,180.91895)" fill="#80BA51" d="M 0,0 V -3.854 L 4.351,0 Z"/>
<path transform="matrix(0.35277777,0,0,-0.35277777,-249.03949,199.26384) translate(1084.1063,52.003204)" fill="#0090CB" d="m 0,0 h -7.445 c -5.081,0 -10.068,-3.852 -10.068,-10.424 0,-6.27 4.82,-10.732 10.642,-10.732 6.352,0 10.599,5.074 10.599,10.91 v 6.124 H 0 v -6.125 c 0,-3.309 -2.403,-7.356 -6.865,-7.356 -3.78,0 -6.871,3.22 -6.878,7.179 0,2.86 1.989,6.917 7.226,6.917 h 6.285 L 3.728,0 V 6.662 H 0 Z m 19.401,0.731 c -3.454,0 -6.7,-1.944 -7.737,-3.887 v 3.154 H 8.079 v -20.646 h 3.974 v 12.787 c 0,3.656 3.963,5.482 6.467,5.482 4.31,0 5.192,-2.85 5.192,-6.219 v -12.05 h 3.798 v 12.483 c 0,7.17 -3.995,8.896 -8.109,8.896 m 40.128,-18.409 c -1.832,0 -2.354,1.448 -2.354,2.927 v 11.366 h 6.303 v 3.387 h -6.303 v 6.66 h -3.749 v -22.175 c -0.002,-2.102 1.018,-5.643 5.568,-5.643 1.696,0 3.531,0.338 4.707,0.873 l -1.059,3.341 c -1.405,-0.561 -2.408,-0.736 -3.113,-0.736 M 84.783,-6.26 c 0,3.019 -2.534,6.682 -9.63,6.682 h -0.002 c -0.002,0 -0.006,0.001 -0.012,0 -4.286,0 -8.241,-2.305 -8.241,-2.305 l 1.603,-2.74 c 0,0 2.686,1.769 6.62,1.769 5.516,0 6,-2.523 6.011,-3.705 v -0.313 c 0,0 -4.193,-0.364 -6.673,-0.595 -3.561,-0.328 -5.837,-1.411 -7.223,-2.755 -1.388,-1.342 -1.892,-2.948 -1.892,-4.335 v -0.046 c 0,-4.333 4.175,-6.547 8.82,-6.547 3.632,0 7.092,1.844 7.092,1.844 v -1.35 h 3.529 z M 73.957,-18.024 c -1.408,0 -4.727,0.562 -4.727,3.894 0,2.486 2.994,3.496 5.476,3.714 1.742,0.153 6.452,0.549 6.452,0.549 0,0 0.001,-5.006 0.001,-5.439 -1.273,-1.767 -4.237,-2.718 -7.202,-2.718 M 49.769,-6.26 c 0,3.538 -3.109,6.682 -9.644,6.682 -4.156,0 -8.241,-2.305 -8.241,-2.305 l 1.603,-2.74 c 0,0 2.685,1.769 6.62,1.769 5.515,0 5.999,-2.523 6.01,-3.705 v -0.313 c 0,0 -4.192,-0.372 -6.673,-0.595 -3.981,-0.357 -9.114,-2.185 -9.114,-7.136 0,-4.314 4.175,-6.547 8.819,-6.547 3.632,0 7.093,1.844 7.093,1.844 v -1.35 H 49.77 Z M 38.942,-18.024 c -1.408,0 -4.726,0.562 -4.726,3.894 0,2.486 2.994,3.496 5.475,3.714 1.742,0.153 6.452,0.549 6.452,0.549 0,0 0.002,-5.006 0.002,-5.439 -1.273,-1.767 -4.238,-2.718 -7.203,-2.718"/>
</g>`;
const LOGO_RATIO = 36.353042 / 10.078157;

/** dnata logo. `white` reproduces the prototype's `filter:brightness(0) invert(1)` on dark headers. */
export function Logo({ height = 24, width, white }: { height?: number; width?: number; white?: boolean }) {
  const paths = white ? LOGO_PATHS.replace(/#80BA51|#0090CB/g, '#FFFFFF') : LOGO_PATHS;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36.353042 10.078157">${paths}</svg>`;
  return <SvgXml xml={xml} width={width ?? height * LOGO_RATIO} height={height} />;
}

/**
 * Hero background. The prototype uses assets/hero-bg.png (deep blue with a light sweep); this is a vector
 * recreation of that artwork plus the prototype's top darkening gradient.
 */
export function HeroBackground() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 402 380" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Defs>
        <LinearGradient id="base" x1="0" y1="0" x2="1" y2="0.35">
          <Stop offset="0" stopColor="#061C6E" />
          <Stop offset="0.45" stopColor="#0A3FC4" />
          <Stop offset="1" stopColor="#0A57F2" />
        </LinearGradient>
        <RadialGradient id="glow" cx="0.82" cy="0.05" r="0.75">
          <Stop offset="0" stopColor="#2E7BFF" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#2E7BFF" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="shade" cx="0.05" cy="0.95" r="0.7">
          <Stop offset="0" stopColor="#04124A" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#04124A" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="top" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#05103C" stopOpacity="0.25" />
          <Stop offset="0.4" stopColor="#05103C" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0A2FA8" stopOpacity="0" />
          <Stop offset="1" stopColor="#1B63FF" stopOpacity="0.35" />
        </LinearGradient>
      </Defs>
      <Rect width="402" height="380" fill="#0A1B4F" />
      <Rect width="402" height="380" fill="url(#base)" />
      <Path d="M96 -20 C 120 120, 220 230, 430 290 L 430 -20 Z" fill="url(#sweep)" />
      <Rect width="402" height="380" fill="url(#glow)" />
      <Rect width="402" height="380" fill="url(#shade)" />
      <Path d="M96 -20 C 120 120, 220 230, 430 290" stroke="#5B9BFF" strokeOpacity="0.25" strokeWidth="6" fill="none" />
      <Path d="M96 -20 C 120 120, 220 230, 430 290" stroke="#7EB0FF" strokeOpacity="0.8" strokeWidth="1.1" fill="none" />
      <Rect width="402" height="380" fill="url(#top)" />
    </Svg>
  );
}

/** Decorative barcode strip — the prototype's repeating-linear-gradient bars. */
export function Barcode({ height = 44, color = '#171A21' }: { height?: number; color?: string }) {
  return (
    <Svg width="100%" height={height}>
      <Defs>
        <Pattern id="bc" patternUnits="userSpaceOnUse" width="15" height={height}>
          <Rect x="0" y="0" width="2" height={height} fill={color} />
          <Rect x="5" y="0" width="1" height={height} fill={color} />
          <Rect x="10" y="0" width="3" height={height} fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height={height} fill="url(#bc)" />
    </Svg>
  );
}

// ─── Signature capture ──────────────────────────────────

export type SignaturePadHandle = { clear: () => void; data: () => SigData | undefined };

/** Finger signature pad. Locks its sheet's scrolling while drawing. */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (signed: boolean) => void; children?: React.ReactNode; style?: object }>(
  function SignaturePad({ onChange, children, style }, ref) {
    const [paths, setPaths] = useState<string[]>([]);
    const cur = useRef('');
    const size = useRef({ w: 1, h: 1 });
    const lock = useScrollLock();
    const changed = useRef(onChange);
    changed.current = onChange;
    const [, force] = useState(0);

    useImperativeHandle(ref, () => ({
      clear: () => { setPaths([]); cur.current = ''; changed.current?.(false); },
      data: () => (paths.length ? { w: size.current.w, h: size.current.h, paths } : undefined),
    }));

    const pan = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (e) => {
          lock(true);
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current = `M${x.toFixed(1)} ${y.toFixed(1)} L${(x + 0.1).toFixed(1)} ${y.toFixed(1)}`;
          force((n) => n + 1);
          changed.current?.(true);
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          cur.current += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
          force((n) => n + 1);
        },
        onPanResponderRelease: () => {
          const p = cur.current;
          cur.current = '';
          if (p) setPaths((ps) => [...ps, p]);
          lock(false);
        },
        onPanResponderTerminate: () => {
          const p = cur.current;
          cur.current = '';
          if (p) setPaths((ps) => [...ps, p]);
          lock(false);
        },
      }),
    ).current;

    return (
      <View
        style={[{ position: 'relative', overflow: 'hidden' }, style]}
        onLayout={(e) => { size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
      >
        {children}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} {...pan.panHandlers}>
          <Svg width="100%" height="100%" pointerEvents="none">
            {[...paths, cur.current].filter(Boolean).map((d, i) => (
              <Path key={i} d={d} stroke="#171A21" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            ))}
          </Svg>
        </View>
      </View>
    );
  },
);

/** Renders a captured signature scaled into its box. */
export function SigView({ sig, height = 52 }: { sig: SigData; height?: number }) {
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${sig.w} ${sig.h}`} preserveAspectRatio="xMidYMax meet">
      {sig.paths.map((d, i) => (
        <Path key={i} d={d} stroke="#171A21" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
    </Svg>
  );
}
