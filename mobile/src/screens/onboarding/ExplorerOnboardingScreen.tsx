import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingStep } from '../../components/onboarding/OnboardingStep';

const STEPS = [
  {
    icon: 'compass' as const,
    iconColor: '#8E8E93',
    title: 'Explora sin compromiso',
    subtitle: 'Bienvenido',
    description:
      'Descubre todas las funcionalidades de la app. Podrás configurar tu perfil cuando lo desees.',
  },
  {
    icon: 'apps' as const,
    iconColor: '#5856D6',
    title: 'Múltiples funciones',
    subtitle: 'Funcionalidades',
    description:
      'Rastreo de dispositivos, reportes de eventos, chat con la comunidad, grupos privados y mucho más.',
  },
  {
    icon: 'settings' as const,
    iconColor: '#FF9500',
    title: 'Personaliza después',
    subtitle: 'Configuración',
    description:
      'En cualquier momento puedes volver a ver estos tutoriales desde el menú de Configuración.',
  },
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export function ExplorerOnboardingScreen({ onComplete, onSkip }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = STEPS[currentStep];

  return (
    <View style={styles.container}>
      <OnboardingStep
        icon={step.icon}
        iconColor={step.iconColor}
        title={step.title}
        subtitle={step.subtitle}
        description={step.description}
        currentStep={currentStep}
        totalSteps={STEPS.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={onSkip}
        isLastStep={currentStep === STEPS.length - 1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
