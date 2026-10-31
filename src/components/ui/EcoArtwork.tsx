import { useId } from 'react';
import { Platform } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';

const leaf = 'M8 30C2 13 15 4 34 3C35 19 29 30 15 30L29 9C21 15 15 22 8 35Z';
const decorativeAccessibility =
  Platform.OS === 'web'
    ? ({ 'aria-hidden': true } as const)
    : ({
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      } as const);

export function LeafMark({
  size = 32,
  color = '#246440',
}: Readonly<{ size?: number; color?: string }>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 38 38" {...decorativeAccessibility}>
      <Path d={leaf} fill={color} />
    </Svg>
  );
}

export function PointsCoin({
  size = 80,
  coins = false,
}: Readonly<{ size?: number; coins?: boolean }>) {
  const id = useId().replace(/:/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 88 88" {...decorativeAccessibility}>
      <Defs>
        <LinearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#D7EAC8" />
          <Stop offset="1" stopColor="#9CCFA2" />
        </LinearGradient>
        <LinearGradient id={`${id}-coin`} x1="0" y1="0" x2="0.9" y2="1">
          <Stop stopColor="#72AC66" />
          <Stop offset="0.55" stopColor="#34834D" />
          <Stop offset="1" stopColor="#125234" />
        </LinearGradient>
      </Defs>
      <Circle cx="44" cy="44" r="43" fill={`url(#${id}-ring)`} />
      <Circle cx="44" cy="44" r="35.5" fill={`url(#${id}-coin)`} stroke="#88BD86" strokeWidth="2" />
      <Path
        d="M17 52A30 30 0 0 0 63 66"
        fill="none"
        stroke="#C3E5BD"
        strokeOpacity="0.3"
        strokeWidth="2"
      />
      {coins ? (
        <G fill="none" stroke="#FFF" strokeWidth="2.4">
          <Ellipse cx="44" cy="34" rx="12" ry="4.5" />
          <Path d="M32 34v15c0 6 24 6 24 0V34M32 39c0 6 24 6 24 0M32 44c0 6 24 6 24 0" />
        </G>
      ) : (
        <G transform="translate(25 25)">
          <Path d={leaf} fill="#FFF" />
        </G>
      )}
    </Svg>
  );
}

export function HomeBotanical() {
  const id = useId().replace(/:/g, '');
  return (
    <Svg width={154} height={154} viewBox="0 0 154 154" {...decorativeAccessibility}>
      <Defs>
        <LinearGradient id={`${id}-earth`} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#BDDCC9" />
          <Stop offset="1" stopColor="#438866" />
        </LinearGradient>
        <ClipPath id={`${id}-clip`}>
          <Circle cx="116" cy="79" r="59" />
        </ClipPath>
      </Defs>
      <Ellipse cx="72" cy="76" rx="48" ry="65" fill="#E5F2DF" transform="rotate(21 72 76)" />
      <Circle cx="116" cy="79" r="59" fill={`url(#${id}-earth)`} />
      <G clipPath={`url(#${id}-clip)`} fill="#F1F8EB">
        <Path d="M64 35l17-11 20 5-1 13-12 7 7 9-2 13-12 5-10-12-15-4zM96 76l15 4 10 12-3 15-12 16-5 19-9-14 3-20-11-12zM120 24l16 5 8 13-9 10-13-1-6-10zM140 61l18-8 16 8-4 21-14 3-12-9-9 2-7-10zM143 112l15 2 8 14-20 5-9-10z" />
      </G>
      <G fill="none" stroke="#6AA173" strokeWidth="1.8">
        <Path d="M47 147Q44 100 35 58M48 133Q63 91 79 59" />
      </G>
      <G fill="#B2D798">
        <Ellipse cx="33" cy="70" rx="9" ry="20" transform="rotate(-20 33 70)" />
        <Ellipse cx="52" cy="107" rx="9" ry="21" transform="rotate(35 52 107)" />
        <Ellipse cx="33" cy="119" rx="10" ry="22" transform="rotate(-39 33 119)" />
      </G>
      <Path d="M65 87Q60 66 84 51Q89 70 65 87Z" fill="#C9E4AD" />
      <Circle cx="60" cy="18" r="5" fill="#DDEECD" />
    </Svg>
  );
}

export function ImpactPlant() {
  const id = useId().replace(/:/g, '');
  return (
    <Svg width={54} height={64} viewBox="0 0 54 64" {...decorativeAccessibility}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#9ECD64" />
          <Stop offset="1" stopColor="#267344" />
        </LinearGradient>
      </Defs>
      <Path d="M27 59Q25 36 30 15" stroke="#286744" strokeWidth="2" fill="none" />
      <Path
        d="M28 35Q13 22 27 5Q42 18 28 35ZM29 44Q26 23 51 22Q51 43 29 44ZM26 50Q5 49 3 29Q25 30 26 50Z"
        fill={`url(#${id})`}
      />
      <Path d="M27 43L43 29M26 48L11 37M29 30L28 13" stroke="#E4F0D7" strokeWidth="1" fill="none" />
    </Svg>
  );
}

export function DevicePreparationArtwork() {
  return (
    <Svg
      width="100%"
      height={160}
      viewBox="0 0 300 160"
      preserveAspectRatio="xMidYMid meet"
      {...decorativeAccessibility}
    >
      <Ellipse cx="150" cy="124" rx="126" ry="22" fill="#E7F3EB" />
      <Path d="M68 45h112a7 7 0 0 1 7 7v58H61V52a7 7 0 0 1 7-7Z" fill="#174F32" />
      <Path d="M69 53h110v49H69z" fill="#DCEFE3" />
      <Path d="M48 111h152l-8 12H57z" fill="#246440" />
      <Path
        d="M211 65c0-4 3-7 7-7h28c4 0 7 3 7 7v48c0 4-3 7-7 7h-28c-4 0-7-3-7-7z"
        fill="#246440"
      />
      <Path d="M217 70h30v37h-30z" fill="#F8FBF9" />
      <Path
        d="M185 112c2 16 18 20 32 15 8-3 11-8 11-14m0 0v-5"
        fill="none"
        stroke="#174F32"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path
        d="M225 105v7m7-7v7m-10-9h13"
        fill="none"
        stroke="#174F32"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M199 82h-15m0 0 7-7m-7 7 7 7"
        fill="none"
        stroke="#246440"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M252 126c13-11 21-23 23-40m-22 32c-11-13-14-27-9-39m3 29c8-12 17-17 27-17"
        fill="none"
        stroke="#286744"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path
        d="M254 104c-11-2-17-9-18-20 11 2 17 9 18 20Zm6-11c1-10 7-16 17-18 0 10-6 16-17 18Zm-1 23c9-6 17-6 25 0-8 6-16 6-25 0Z"
        fill="#80B96C"
      />
      <Path
        d="M37 100c-7-6-9-14-5-23 8 6 10 14 5 23Zm-4 15c-9-3-14-9-14-18 9 3 14 9 14 18Z"
        fill="#A5CF89"
      />
    </Svg>
  );
}

export function SuccessArtwork() {
  const id = useId().replace(/:/g, '');
  return (
    <Svg width={188} height={108} viewBox="0 0 188 108" {...decorativeAccessibility}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop stopColor="#74AE66" />
          <Stop offset="1" stopColor="#155735" />
        </LinearGradient>
      </Defs>
      <Circle cx="94" cy="57" r="36" fill={`url(#${id})`} />
      <Path
        d="M79 57l10 10 20 -22"
        fill="none"
        stroke="#FFF"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M29 46Q9 41 11 26Q31 29 29 46ZM42 88Q25 89 20 70Q39 72 42 88ZM141 43Q143 24 162 24Q164 40 141 43ZM58 20Q47 19 49 8Q60 9 58 20Z"
        fill="#5A9B56"
      />
      <Path
        d="M153 7l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM40 49l1 4 4 1-4 1-1 4-1-4-4-1 4-1z"
        fill="#E4BD41"
      />
    </Svg>
  );
}

// Shared scene for the account screens: soft cloud, side leaves and a central motif.
export function AuthArtwork({ kind }: Readonly<{ kind: 'lock' | 'account' | 'recovery' }>) {
  return (
    <Svg width={240} height={150} viewBox="0 0 240 150" {...decorativeAccessibility}>
      <Path
        d="M44 128c-22 0-32-20-20-36 6-8 16-10 24-8 2-24 26-40 50-32 10-22 44-26 60-8 16-8 38 0 42 18 18 0 30 16 26 32-3 10-12 16-24 16z"
        fill="#E7F3EB"
      />
      <G fill="none" stroke="#5A9B56" strokeWidth="2.5" strokeLinecap="round">
        <Path d="M58 140C52 112 46 92 34 76M186 140c6-30 14-52 28-66" />
      </G>
      <G fill="#80B96C">
        <Path d="M40 96C22 92 16 78 22 64c14 6 20 18 18 32ZM52 120c-16 2-26-6-28-20 14-2 24 6 28 20Z" />
        <Path d="M198 96c4-18 18-26 32-22-2 16-14 24-32 22ZM190 122c10-14 24-16 34-8-8 12-22 14-34 8Z" />
      </G>
      <G fill="#A5CF89">
        <Path d="M50 82c-6-12-2-24 8-30 6 12 2 24-8 30ZM204 76c-2-12 4-22 16-24 2 12-4 22-16 24Z" />
      </G>
      {kind === 'lock' && (
        <G>
          <Circle cx="120" cy="80" r="50" fill="#246440" />
          <Path
            d="M104 74v-10a16 16 0 0 1 32 0v10"
            fill="none"
            stroke="#FFF"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <Path
            d="M98 74h44a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H98a4 4 0 0 1-4-4V78a4 4 0 0 1 4-4Z"
            fill="#FFF"
          />
          <Path d="M120 84a5 5 0 0 1 3 9v6h-6v-6a5 5 0 0 1 3-9Z" fill="#246440" />
        </G>
      )}
      {kind === 'account' && (
        <G>
          <Path
            d="M92 30h56a8 8 0 0 1 8 8v96a8 8 0 0 1-8 8H92a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8Z"
            fill="#FFF"
            stroke="#BFDDC8"
            strokeWidth="3"
          />
          <Circle cx="120" cy="64" r="13" fill="#174F32" />
          <Path d="M98 98c2-14 12-20 22-20s20 6 22 20Z" fill="#174F32" />
          <G stroke="#BFD3C7" strokeWidth="5" strokeLinecap="round">
            <Path d="M100 114h40M100 126h28" />
          </G>
        </G>
      )}
      {kind === 'recovery' && (
        <G>
          <Path d="M92 34h56v40H92z" fill="#FFF" stroke="#BFDDC8" strokeWidth="2" />
          <G stroke="#BFD3C7" strokeWidth="4" strokeLinecap="round">
            <Path d="M102 46h36M102 56h26" />
          </G>
          <Path d="M72 62h96v62H72z" fill="#246440" />
          <Path d="M72 62l48 36 48-36" fill="none" stroke="#174F32" strokeWidth="4" />
          <Circle cx="168" cy="118" r="22" fill="#174F32" stroke="#FFF" strokeWidth="4" />
          <G fill="none" stroke="#FFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <Path d="M158 114a10 10 0 0 1 17-5l3 3M178 122a10 10 0 0 1-17 5l-3-3" />
            <Path d="M178 105v7h-7M158 131v-7h7" />
          </G>
        </G>
      )}
    </Svg>
  );
}
