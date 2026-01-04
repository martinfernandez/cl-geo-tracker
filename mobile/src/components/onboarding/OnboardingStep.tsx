import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.2;

interface OnboardingStepProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  gradientColors?: string[];
  title: string;
  subtitle?: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev?: () => void;
  onSkip: () => void;
  nextLabel?: string;
  isLastStep?: boolean;
  children?: React.ReactNode;
}

export function OnboardingStep({
  icon,
  iconColor = '#5856D6',
  gradientColors,
  title,
  subtitle,
  description,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  nextLabel,
  isLastStep = false,
  children,
}: OnboardingStepProps) {
  const insets = useSafeAreaInsets();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  // Gradient colors based on icon color
  const defaultGradient = [
    `${iconColor}15`,
    `${iconColor}05`,
    '#ffffff',
  ];

  useEffect(() => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    iconScale.setValue(0.5);
    iconRotate.setValue(0);

    // Run entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 100,
        friction: 6,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(iconRotate, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  // Use refs for callbacks to avoid stale closures
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  const currentStepRef = useRef(currentStep);

  useEffect(() => {
    onNextRef.current = onNext;
    onPrevRef.current = onPrev;
    currentStepRef.current = currentStep;
  }, [onNext, onPrev, currentStep]);

  // Pan responder for swipe gestures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Only respond to horizontal gestures that are more than 15px
          const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5;
          return isHorizontalSwipe && Math.abs(gestureState.dx) > 15;
        },
        onPanResponderGrant: () => {
          translateX.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          // Add resistance at edges
          let dx = gestureState.dx;
          if (currentStepRef.current === 0 && dx > 0) {
            dx = dx * 0.3; // Resistance when trying to go before first step
          }
          translateX.setValue(dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          const velocity = gestureState.vx;
          const threshold = Math.abs(velocity) > 0.5 ? SWIPE_THRESHOLD * 0.5 : SWIPE_THRESHOLD;

          if (gestureState.dx < -threshold || velocity < -0.5) {
            // Swipe left - go next
            Animated.timing(translateX, {
              toValue: -width,
              duration: 150,
              useNativeDriver: true,
            }).start(() => {
              translateX.setValue(0);
              onNextRef.current();
            });
          } else if ((gestureState.dx > threshold || velocity > 0.5) && currentStepRef.current > 0 && onPrevRef.current) {
            // Swipe right - go back
            Animated.timing(translateX, {
              toValue: width,
              duration: 150,
              useNativeDriver: true,
            }).start(() => {
              translateX.setValue(0);
              onPrevRef.current!();
            });
          } else {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              tension: 120,
              friction: 8,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          // Snap back if gesture is terminated
          Animated.spring(translateX, {
            toValue: 0,
            tension: 120,
            friction: 8,
            useNativeDriver: true,
          }).start();
        },
      }),
    [translateX]
  );

  const iconRotation = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={gradientColors || defaultGradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Swipeable content */}
      <Animated.View
        style={[
          styles.swipeContainer,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Progress bar */}
        <View style={[styles.progressContainer, { marginTop: 16 }]}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View key={index} style={styles.progressBarWrapper}>
              <View
                style={[
                  styles.progressBar,
                  index <= currentStep && styles.progressBarActive,
                  { backgroundColor: index <= currentStep ? iconColor : '#E5E5EA' },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Animated Icon */}
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: iconScale },
                  { rotate: iconRotation },
                ],
              },
            ]}
          >
            <View style={[styles.iconOuter, { backgroundColor: `${iconColor}10` }]}>
              <View style={[styles.iconMiddle, { backgroundColor: `${iconColor}20` }]}>
                <View style={[styles.iconInner, { backgroundColor: `${iconColor}30` }]}>
                  {icon && (
                    <Ionicons name={icon} size={56} color={iconColor} />
                  )}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Text content with animation */}
          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {subtitle && (
              <View style={[styles.subtitleBadge, { backgroundColor: `${iconColor}15` }]}>
                <Text style={[styles.subtitle, { color: iconColor }]}>{subtitle}</Text>
              </View>
            )}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </Animated.View>

          {/* Custom content */}
          {children && (
            <Animated.View
              style={[
                styles.childrenContainer,
                { opacity: fadeAnim },
              ]}
            >
              {children}
            </Animated.View>
          )}
        </View>

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Ionicons name="swap-horizontal" size={20} color="#C7C7CC" />
          <Text style={styles.swipeHintText}>Desliza para navegar</Text>
        </View>
      </Animated.View>

      {/* Bottom actions */}
      <Animated.View
        style={[
          styles.bottomContainer,
          {
            paddingBottom: insets.bottom + 16,
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: iconColor }]}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {nextLabel || (isLastStep ? 'Comenzar' : 'Continuar')}
          </Text>
          <View style={styles.nextButtonIcon}>
            <Ionicons
              name={isLastStep ? 'checkmark' : 'arrow-forward'}
              size={20}
              color={iconColor}
            />
          </View>
        </TouchableOpacity>

        {/* Dots indicator */}
        <View style={styles.dotsContainer}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentStep && [styles.dotActive, { backgroundColor: iconColor }],
              ]}
            />
          ))}
        </View>

        {/* Skip button - at the bottom */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}
        >
          <Text style={styles.skipText}>Omitir tutorial</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  swipeContainer: {
    flex: 1,
  },
  skipButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 6,
  },
  progressBarWrapper: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E5EA',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressBarActive: {
    width: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    marginBottom: 40,
  },
  iconOuter: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconMiddle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  subtitleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 17,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  childrenContainer: {
    marginTop: 32,
    width: '100%',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 16,
  },
  swipeHintText: {
    fontSize: 13,
    color: '#C7C7CC',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  nextButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  dotActive: {
    width: 24,
  },
});
