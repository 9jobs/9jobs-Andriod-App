export type CandidateProfile = {
  id?: string;
  fullName: string;
  headline: string;
  location: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  subscriptionPlanId?: string | null;
  timezone?: string;
  darkMode: boolean;
  biometric: boolean;
  pushNotifications: boolean;
  weeklyGoal: string;
};
