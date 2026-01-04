import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserProfileType = 'tracker' | 'community' | 'business' | 'explorer' | null;

export type TutorialType = 'tracker' | 'community' | 'business' | 'explorer';

interface OnboardingContextType {
  hasCompletedOnboarding: boolean;
  userProfileType: UserProfileType;
  currentStep: number;
  totalSteps: number;
  viewedTutorials: TutorialType[];
  hasUnviewedTutorials: boolean;
  setUserProfileType: (type: UserProfileType) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  setCurrentStep: (step: number) => void;
  setTotalSteps: (total: number) => void;
  skipOnboarding: () => Promise<void>;
  markTutorialAsViewed: (type: TutorialType) => Promise<void>;
  hasTutorialBeenViewed: (type: TutorialType) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';
const USER_PROFILE_TYPE_KEY = '@user_profile_type';
const VIEWED_TUTORIALS_KEY = '@viewed_tutorials';

const ALL_TUTORIALS: TutorialType[] = ['tracker', 'community', 'business', 'explorer'];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true); // Default true to avoid flash
  const [userProfileType, setUserProfileTypeState] = useState<UserProfileType>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [viewedTutorials, setViewedTutorials] = useState<TutorialType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compute if there are unviewed tutorials
  const hasUnviewedTutorials = viewedTutorials.length < ALL_TUTORIALS.length;

  useEffect(() => {
    loadOnboardingState();
  }, []);

  const loadOnboardingState = async () => {
    try {
      const [completed, profileType, viewedTutorialsStr] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY),
        AsyncStorage.getItem(USER_PROFILE_TYPE_KEY),
        AsyncStorage.getItem(VIEWED_TUTORIALS_KEY),
      ]);

      setHasCompletedOnboarding(completed === 'true');
      setUserProfileTypeState(profileType as UserProfileType);

      if (viewedTutorialsStr) {
        try {
          const parsed = JSON.parse(viewedTutorialsStr);
          setViewedTutorials(Array.isArray(parsed) ? parsed : []);
        } catch {
          setViewedTutorials([]);
        }
      }
    } catch (error) {
      console.error('Error loading onboarding state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUserProfileType = async (type: UserProfileType) => {
    try {
      if (type) {
        await AsyncStorage.setItem(USER_PROFILE_TYPE_KEY, type);
      } else {
        await AsyncStorage.removeItem(USER_PROFILE_TYPE_KEY);
      }
      setUserProfileTypeState(type);
    } catch (error) {
      console.error('Error saving profile type:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const skipOnboarding = async () => {
    await completeOnboarding();
  };

  const resetOnboarding = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY),
        AsyncStorage.removeItem(USER_PROFILE_TYPE_KEY),
        AsyncStorage.removeItem(VIEWED_TUTORIALS_KEY),
      ]);
      setHasCompletedOnboarding(false);
      setUserProfileTypeState(null);
      setViewedTutorials([]);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  const markTutorialAsViewed = async (type: TutorialType) => {
    try {
      if (!viewedTutorials.includes(type)) {
        const newViewedTutorials = [...viewedTutorials, type];
        await AsyncStorage.setItem(VIEWED_TUTORIALS_KEY, JSON.stringify(newViewedTutorials));
        setViewedTutorials(newViewedTutorials);
      }
    } catch (error) {
      console.error('Error marking tutorial as viewed:', error);
    }
  };

  const hasTutorialBeenViewed = (type: TutorialType): boolean => {
    return viewedTutorials.includes(type);
  };

  if (isLoading) {
    return null;
  }

  return (
    <OnboardingContext.Provider
      value={{
        hasCompletedOnboarding,
        userProfileType,
        currentStep,
        totalSteps,
        viewedTutorials,
        hasUnviewedTutorials,
        setUserProfileType,
        completeOnboarding,
        resetOnboarding,
        setCurrentStep,
        setTotalSteps,
        skipOnboarding,
        markTutorialAsViewed,
        hasTutorialBeenViewed,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
