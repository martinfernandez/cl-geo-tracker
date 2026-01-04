import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingStep } from '../../components/onboarding/OnboardingStep';

const STEPS = [
  {
    icon: 'people' as const,
    iconColor: '#5856D6',
    title: 'Tu comunidad, conectada',
    subtitle: 'Vecindario',
    description:
      'Mantente informado sobre lo que pasa en tu zona. Reporta y recibe alertas de eventos cercanos en tiempo real.',
  },
  {
    icon: 'megaphone' as const,
    iconColor: '#FF3B30',
    title: 'Reporta incidentes',
    subtitle: 'Eventos',
    description:
      'Robos, accidentes, incendios o extravíos. Ayuda a tu comunidad compartiendo información relevante.',
  },
  {
    icon: 'chatbubbles' as const,
    iconColor: '#34C759',
    title: 'Chat directo',
    subtitle: 'Comunicación',
    description:
      'Contacta directamente con otros usuarios para coordinar ayuda, compartir información o reportar novedades.',
  },
  {
    icon: 'map' as const,
    iconColor: '#FF9500',
    title: 'Mapa en vivo',
    subtitle: 'Visualización',
    description:
      'Ve todos los eventos públicos de tu zona en un mapa interactivo. Filtra por tipo y estado.',
  },
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export function CommunityOnboardingScreen({ onComplete, onSkip }: Props) {
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
