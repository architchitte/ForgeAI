import React from 'react';
import { View, StyleSheet } from 'react-native';
import { STITCH_COLORS } from '../../constants/theme';

export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const DEFAULT_ACCENT = STITCH_COLORS.primaryContainer; // #4f46e5 Indigo Accent
const DEFAULT_STROKE = 1.8;
const DEFAULT_SIZE = 22;

/**
 * 1. Discover — Minimal target/compass-style reticle icon
 * Consists of an outer ring, inner ring, and centered reticle pip matching the reference.
 */
export const TargetIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_ACCENT,
  strokeWidth = DEFAULT_STROKE,
}) => {
  const outerRadius = size / 2;
  const innerSize = Math.round(size * 0.54);
  const innerRadius = innerSize / 2;
  const dotSize = Math.max(3, Math.round(size * 0.16));

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View
        style={[
          styles.center,
          {
            width: size,
            height: size,
            borderRadius: outerRadius,
            borderWidth: strokeWidth,
            borderColor: color,
          },
        ]}
      >
        <View
          style={[
            styles.center,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerRadius,
              borderWidth: strokeWidth,
              borderColor: color,
            },
          ]}
        >
          <View
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
            }}
          />
        </View>
      </View>
    </View>
  );
};

/**
 * 2. Submit — Minimal Rocket outline icon
 * Streamlined aerodynamic fuselage, circular portal window, delta fins, and thruster nozzle.
 */
export const RocketIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_ACCENT,
  strokeWidth = DEFAULT_STROKE,
}) => {
  const bodyWidth = Math.round(size * 0.44);
  const bodyHeight = Math.round(size * 0.68);
  const finWidth = Math.max(4, Math.round(size * 0.2));
  const finHeight = Math.max(5, Math.round(size * 0.28));

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      {/* Aerodynamic Fuselage Body */}
      <View
        style={[
          styles.center,
          {
            width: bodyWidth,
            height: bodyHeight,
            borderTopLeftRadius: bodyWidth / 2,
            borderTopRightRadius: bodyWidth / 2,
            borderBottomLeftRadius: 3,
            borderBottomRightRadius: 3,
            borderWidth: strokeWidth,
            borderColor: color,
          },
        ]}
      >
        {/* Portal circular window */}
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            borderWidth: strokeWidth * 0.8,
            borderColor: color,
            marginTop: -3,
          }}
        />
      </View>

      {/* Left Delta Fin */}
      <View
        style={{
          position: 'absolute',
          left: 1,
          bottom: 4,
          width: finWidth,
          height: finHeight,
          borderLeftWidth: strokeWidth,
          borderBottomWidth: strokeWidth,
          borderColor: color,
          borderBottomLeftRadius: 2,
        }}
      />

      {/* Right Delta Fin */}
      <View
        style={{
          position: 'absolute',
          right: 1,
          bottom: 4,
          width: finWidth,
          height: finHeight,
          borderRightWidth: strokeWidth,
          borderBottomWidth: strokeWidth,
          borderColor: color,
          borderBottomRightRadius: 2,
        }}
      />

      {/* Thruster exhaust tip */}
      <View
        style={{
          position: 'absolute',
          bottom: 1.5,
          width: 3,
          height: 2,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
};

/**
 * 3. Activity — Minimal Activity/Workflow nodes constellation icon
 * Central hub node with radiating branches connected to satellite nodes matching the reference.
 */
export const WorkflowIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_ACCENT,
  strokeWidth = DEFAULT_STROKE,
}) => {
  const nodeSize = 4.5;
  const centerSize = 5.5;

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      {/* Radiating connector branches */}
      <View
        style={{
          position: 'absolute',
          top: 3,
          width: strokeWidth,
          height: 6.5,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 3.5,
          top: 7,
          width: 7,
          height: strokeWidth,
          backgroundColor: color,
          transform: [{ rotate: '-35deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 3.5,
          top: 7,
          width: 7,
          height: strokeWidth,
          backgroundColor: color,
          transform: [{ rotate: '35deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 4.5,
          bottom: 4.5,
          width: 7.5,
          height: strokeWidth,
          backgroundColor: color,
          transform: [{ rotate: '50deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: 4.5,
          bottom: 4.5,
          width: 7.5,
          height: strokeWidth,
          backgroundColor: color,
          transform: [{ rotate: '-50deg' }],
        }}
      />

      {/* Central Hub Node */}
      <View
        style={{
          width: centerSize,
          height: centerSize,
          borderRadius: centerSize / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          backgroundColor: STITCH_COLORS.surfaceContainerLowest,
          zIndex: 2,
        }}
      />

      {/* Top satellite node */}
      <View
        style={[
          styles.satelliteNode,
          {
            top: 0,
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            borderWidth: strokeWidth,
            borderColor: color,
          },
        ]}
      />

      {/* Top-left satellite node */}
      <View
        style={[
          styles.satelliteNode,
          {
            top: 4,
            left: 1,
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            borderWidth: strokeWidth,
            borderColor: color,
          },
        ]}
      />

      {/* Top-right satellite node */}
      <View
        style={[
          styles.satelliteNode,
          {
            top: 4,
            right: 1,
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            borderWidth: strokeWidth,
            borderColor: color,
          },
        ]}
      />

      {/* Bottom-left satellite node */}
      <View
        style={[
          styles.satelliteNode,
          {
            bottom: 1.5,
            left: 2,
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            borderWidth: strokeWidth,
            borderColor: color,
          },
        ]}
      />

      {/* Bottom-right satellite node */}
      <View
        style={[
          styles.satelliteNode,
          {
            bottom: 1.5,
            right: 2,
            width: nodeSize,
            height: nodeSize,
            borderRadius: nodeSize / 2,
            borderWidth: strokeWidth,
            borderColor: color,
          },
        ]}
      />
    </View>
  );
};

/**
 * 4. Account — Minimal Settings/Sliders icon
 * 3 horizontal slider tracks with staggered vertical slider indicator knobs matching reference.
 */
export const SlidersIcon: React.FC<IconProps> = ({
  size = DEFAULT_SIZE,
  color = DEFAULT_ACCENT,
  strokeWidth = DEFAULT_STROKE,
}) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'space-between',
        paddingVertical: 2.5,
      }}
    >
      {/* Track 1: slider knob positioned towards right */}
      <View style={styles.sliderTrackRow}>
        <View
          style={{
            height: strokeWidth,
            width: '100%',
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
        <View
          style={[
            styles.sliderKnob,
            {
              right: 4,
              width: strokeWidth + 1.2,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      {/* Track 2: slider knob positioned towards left */}
      <View style={styles.sliderTrackRow}>
        <View
          style={{
            height: strokeWidth,
            width: '100%',
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
        <View
          style={[
            styles.sliderKnob,
            {
              left: 5,
              width: strokeWidth + 1.2,
              backgroundColor: color,
            },
          ]}
        />
      </View>

      {/* Track 3: slider knob positioned near center */}
      <View style={styles.sliderTrackRow}>
        <View
          style={{
            height: strokeWidth,
            width: '100%',
            backgroundColor: color,
            borderRadius: 1,
          }}
        />
        <View
          style={[
            styles.sliderKnob,
            {
              right: 8,
              width: strokeWidth + 1.2,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  satelliteNode: {
    position: 'absolute',
    backgroundColor: STITCH_COLORS.surfaceContainerLowest,
  },
  sliderTrackRow: {
    height: 5,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderKnob: {
    position: 'absolute',
    height: 6,
    borderRadius: 1.5,
  },
});

