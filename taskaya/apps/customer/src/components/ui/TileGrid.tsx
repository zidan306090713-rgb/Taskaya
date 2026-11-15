import { ReactNode, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { spacing } from '@/theme';

type Props<T> = {
  data: T[];
  keyOf: (item: T) => string;
  render: (item: T, size: number, height: number) => ReactNode;
  columns?: number;
  gap?: number;
  aspect?: number; // الارتفاع ÷ العرض (1 = مربع)
};

export function TileGrid<T>({ data, keyOf, render, columns = 3, gap = spacing.sm + 4, aspect = 1 }: Props<T>) {
  const [width, setWidth] = useState(0);
  const size = width > 0 ? Math.floor((width - gap * (columns - 1)) / columns) : 0;
  const height = Math.round(size * aspect);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={[styles.grid, { gap }]} onLayout={onLayout}>
      {size > 0
        ? data.map((item) => (
            <View key={keyOf(item)} style={{ width: size, height }}>
              {render(item, size, height)}
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
});
