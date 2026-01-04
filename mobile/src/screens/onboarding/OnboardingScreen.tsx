import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ProfileTypeSelector } from '../../components/onboarding/ProfileTypeSelector';
import { TrackerOnboardingScreen } from './TrackerOnboardingScreen';
import { CommunityOnboardingScreen } from './CommunityOnboardingScreen';
import { BusinessOnboardingScreen } from './BusinessOnboardingScreen';
import { ExplorerOnboardingScreen } from './ExplorerOnboardingScreen';
import { useOnboarding, UserProfileType } from '../../contexts/OnboardingContext';

type OnboardingPhase = 'profile-selection' | 'tutorial';

export function OnboardingScreen() {
  const { setUserProfileType, completeOnboarding, skipOnboarding } = useOnboarding();
  const [phase, setPhase] = useState<OnboardingPhase>('profile-selection');
  const [selectedProfile, setSelectedProfile] = useState<UserProfileType>(null);

  const handleProfileSelect = async (type: UserProfileType) => {
    await setUserProfileType(type);
    setSelectedProfile(type);
    setPhase('tutorial');
  };

  const handleComplete = async () => {
    await completeOnboarding();
  };

  const handleSkip = async () => {
    await skipOnboarding();
  };

  if (phase === 'profile-selection') {
    return (
      <ProfileTypeSelector
        onSelect={handleProfileSelect}
        onSkip={handleSkip}
      />
    );
  }

  // Render tutorial based on selected profile
  switch (selectedProfile) {
    case 'tracker':
      return <TrackerOnboardingScreen onComplete={handleComplete} onSkip={handleSkip} />;
    case 'community':
      return <CommunityOnboardingScreen onComplete={handleComplete} onSkip={handleSkip} />;
    case 'business':
      return <BusinessOnboardingScreen onComplete={handleComplete} onSkip={handleSkip} />;
    case 'explorer':
    default:
      return <ExplorerOnboardingScreen onComplete={handleComplete} onSkip={handleSkip} />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
