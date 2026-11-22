import { MotiView } from 'moti';
import type { ReactNode } from 'react';
import { View } from 'react-native';

export function CollapsibleDetails({ expanded, reduceMotion, children }: {
  expanded: boolean;
  reduceMotion: boolean;
  children: ReactNode;
}) {
  return (
    <View
      className={`mx-3 ${expanded ? '' : 'hidden'}`}
      pointerEvents={expanded ? 'auto' : 'none'}
      accessibilityElementsHidden={!expanded}
      importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
    >
      <MotiView
        animate={{ opacity: expanded || reduceMotion ? 1 : 0 }}
        transition={{ opacity: { type: 'timing', duration: reduceMotion || !expanded ? 0 : 160 } }}
      >
        <View className="items-start gap-3 border-t border-line py-3">
          {children}
        </View>
      </MotiView>
    </View>
  );
}
