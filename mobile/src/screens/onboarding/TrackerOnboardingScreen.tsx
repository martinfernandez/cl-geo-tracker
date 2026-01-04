import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { OnboardingStep } from '../../components/onboarding/OnboardingStep';

const STEPS = [
  {
    icon: 'shield-checkmark' as const,
    iconColor: '#34C759',
    title: 'Tu privacidad es prioridad',
    subtitle: 'Seguridad',
    description:
      'La ubicación de tus dispositivos es completamente privada. Nadie más puede ver dónde están tus seres queridos u objetos de valor.',
  },
  {
    icon: 'hardware-chip' as const,
    iconColor: '#5856D6',
    title: 'Conecta tu rastreador',
    subtitle: 'Dispositivos',
    description:
      'Vincula dispositivos GPS compatibles para monitorear en tiempo real la ubicación de mascotas, vehículos o personas.',
  },
  {
    icon: 'notifications' as const,
    iconColor: '#FF9500',
    title: 'Alertas inteligentes',
    subtitle: 'Notificaciones',
    description:
      'Configura zonas seguras y recibe alertas instantáneas cuando un dispositivo sale del área permitida.',
  },
  {
    icon: 'lock-closed' as const,
    iconColor: '#FF3B30',
    title: 'Bloqueo de posición',
    subtitle: 'Protección',
    description:
      'Activa el modo bloqueo cuando estaciones tu vehículo. Si se mueve, recibirás una alerta inmediata.',
  },
];

interface Props {
  onComplete: () => void;
  onSkip: () => void;
}

export function TrackerOnboardingScreen({ onComplete, onSkip }: Props) {
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
