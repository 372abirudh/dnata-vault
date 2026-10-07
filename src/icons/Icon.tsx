import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { ICON_PATHS } from './paths';
import { C, ICON_TONE } from '../theme/tokens';

export type IconProps = {
  name: string;
  size?: number;
  color?: string;
  /** Design-system tone (default, muted, success, warning, error, inverse, primary). */
  tone?: string;
  /** Phosphor fill weight — used for the selected bottom-nav item. */
  filled?: boolean;
};

/** Phosphor icon, addressed by the design's icon names (see scripts/gen-icons.js). */
export function Icon({ name, size = 20, color, tone, filled }: IconProps) {
  const p = ICON_PATHS[name] ?? ICON_PATHS.info;
  const fill = color ?? (tone ? ICON_TONE[tone] : undefined) ?? C.n700;
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Path d={filled && p.f ? p.f : p.r} fill={fill} />
    </Svg>
  );
}
