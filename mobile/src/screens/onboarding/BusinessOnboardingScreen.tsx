import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingStep } from '../../components/onboarding/OnboardingStep';

const STEPS = [
  {
    icon: 'business' as const,
    iconColor: '#FF9500',
    title: 'Control de tu flota',
    subtitle: 'Empresas',
    description:
      'Monitorea todos los vehículos de tu empresa en un solo lugar. Ubicación en tiempo real y reportes de actividad.',
  },
  {
    icon: 'people-circle' as const,
    iconColor: '#5856D6',
    title: 'Grupos privados',
    subtitle: 'Equipos',
    description:
      'Crea grupos cerrados para tu equipo. Solo los miembros autorizados pueden ver la información del grupo.',
  },
  {
    icon: 'eye-off' as const,
    iconColor: '#34C759',
    title: 'Datos 100% privados',
    subtitle: 'Confidencialidad',
    description:
      'La ubicación de tus vehículos nunca se comparte públicamente. Tus datos de operación son confidenciales.',
  },
  {
    icon: 'analytics' as const,
    iconColor: '#007AFF',
    title: 'Seguimiento detallado',
    subtitle: 'Reportes',
    description:
      'Historial de rutas, tiempos de parada y alertas de zona. Toda la información que necesitas para optimizar tu operación.',
  },
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export function BusinessOnboardingScreen({ onComplete, onSkip }: Props) {
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
