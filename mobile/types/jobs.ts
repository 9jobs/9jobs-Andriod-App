export type ApplicationStatus = "draft" | "applied" | "interview" | "offer";

export type JobCategory =
  | "Career Growth"
  | "AI Resume"
  | "Outreach"
  | "Interview"
  | "Remote";

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  category: JobCategory;
  postedAt: string;
  matchScore: number;
  tags: string[];
  description: string;
  isSaved: boolean;
  isApplied: boolean;
  status: ApplicationStatus;
};

export type JobFilters = {
  query: string;
  category: JobCategory | "All";
  location: string;
  onlySaved: boolean;
};
