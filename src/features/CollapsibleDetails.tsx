import { MotiView } from 'moti';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

export function CollapsibleDetails({ expanded, reduceMotion, children }: {
  expanded: boolean;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(0);
  const timing = { type: 'timing' as const, duration: reduceMotion ? 0 : 260 };

  return (
    <View
      className="mx-3 overflow-hidden"
      pointerEvents={expanded ? 'auto' : 'none'}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
    >
      <MotiView
        animate={{ height: expanded ? height : 0, opacity: expanded ? 1 : 0 }}
        transition={{ height: timing, opacity: timing }}
      >
        {/* Le contenu garde sa hauteur naturelle pendant l’animation. */}
        <View
          className="absolute inset-x-0 top-0 items-start gap-2 border-t border-zinc-800 py-3"
          onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
        >
          {children}
        </View>
      </MotiView>
    </View>
  );
}
