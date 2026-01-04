import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { G, Path, Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  height?: number;
}

export const ObjectsPatternBackground = React.memo(({ height = SCREEN_HEIGHT }: Props) => {
  const ICON_COLOR = '#D1D5DB';
  const ICON_SIZE = 20;
  const PATTERN_SIZE = 55;

  const renderIcon = (type: number, x: number, y: number, rotation: number) => {
    const transform = `translate(${x}, ${y}) rotate(${rotation}, ${ICON_SIZE/2}, ${ICON_SIZE/2})`;

    switch (type % 8) {
      case 0: // Car
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Path d="M2 8 L4 4 L16 4 L18 8 L18 14 L2 14 Z" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="5" cy="14" r="2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="15" cy="14" r="2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 1: // Key
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Circle cx="14" cy="6" r="4" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M10 6 L2 14 L2 18 L6 18 L6 14 L10 10" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 2: // Bike
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Circle cx="4" cy="14" r="3" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="16" cy="14" r="3" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M4 14 L8 6 L12 6 L16 14 M8 6 L10 14 L12 6" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 3: // Paw
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Circle cx="10" cy="14" r="4" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="5" cy="8" r="2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="15" cy="8" r="2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="7" cy="4" r="1.5" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="13" cy="4" r="1.5" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 4: // Backpack
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Path d="M4 6 L4 18 L16 18 L16 6 L4 6" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M7 6 L7 3 L13 3 L13 6" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M7 10 L13 10 L13 14 L7 14 Z" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 5: // Phone
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Path d="M6 2 L14 2 L14 18 L6 18 Z" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="10" cy="15" r="1.5" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 6: // Location pin
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Path d="M10 2 C6 2 3 5 3 9 C3 14 10 20 10 20 C10 20 17 14 17 9 C17 5 14 2 10 2" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Circle cx="10" cy="9" r="2.5" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      case 7: // Watch
        return (
          <G key={`${x}-${y}`} transform={transform}>
            <Circle cx="10" cy="10" r="6" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M10 6 L10 10 L13 12" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
            <Path d="M8 2 L12 2 M8 18 L12 18" stroke={ICON_COLOR} strokeWidth="1.2" fill="none" />
          </G>
        );
      default:
        return null;
    }
  };

  const rows = Math.ceil(height / PATTERN_SIZE) + 2;
  const cols = Math.ceil(SCREEN_WIDTH / PATTERN_SIZE) + 2;

  // Seeded random function for consistent "random" values
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  };

  const icons = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seed = row * 100 + col;
      const offsetX = row % 2 === 0 ? 0 : PATTERN_SIZE / 2;
      const randomOffsetX = (seededRandom(seed) - 0.5) * 16;
      const randomOffsetY = (seededRandom(seed + 50) - 0.5) * 24;
      const x = col * PATTERN_SIZE + offsetX + randomOffsetX;
      const y = row * PATTERN_SIZE + randomOffsetY;
      const rotation = (seededRandom(seed + 100) - 0.5) * 70;
      const iconType = (row * 7 + col * 3) % 8;
      icons.push(renderIcon(iconType, x, y, rotation));
    }
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg
        width={SCREEN_WIDTH}
        height={height}
        viewBox={`0 0 ${SCREEN_WIDTH} ${height}`}
      >
        {icons}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
