import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { TrackerOnboardingScreen } from './TrackerOnboardingScreen';
import { CommunityOnboardingScreen } from './CommunityOnboardingScreen';
import { BusinessOnboardingScreen } from './BusinessOnboardingScreen';
import { ExplorerOnboardingScreen } from './ExplorerOnboardingScreen';
import { UserProfileType, TutorialType, useOnboarding } from '../../contexts/OnboardingContext';

type TutorialViewerParams = {
  TutorialViewer: {
    tutorialType: UserProfileType;
  };
};

export function TutorialViewerScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<TutorialViewerParams, 'TutorialViewer'>>();
  const { tutorialType } = route.params;
  const { markTutorialAsViewed } = useOnboarding();

  const handleComplete = async () => {
    // Mark tutorial as viewed when completed
    if (tutorialType) {
      await markTutorialAsViewed(tutorialType as TutorialType);
    }
    navigation.goBack();
  };

  const handleSkip = () => {
    // Don't mark as viewed when skipped - user can come back later
    navigation.goBack();
  };

  switch (tutorialType) {
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
