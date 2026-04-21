export enum DocType {
  RESUME = 'resume',
  JD = 'jd',
}

export interface ResumeSummary {
  name?: string;
  email?: string;
  role?: string;
  totalExperienceYears?: number;
}

export interface ActiveJD {
  title: string;
  company: string;
  location: string;
  level: 'junior' | 'mid' | 'senior' | 'lead';
  technologies: string[];
  requirements: string[];
  keywords: string[];
  compensation_hint?: string;
  min_years_experience?: number;
}

export interface SalaryEstimate {
  title: string;
  location: string;
  min: number;
  max: number;
  currency: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface CultureRatings {
  overall: number;
  work_life_balance: number;
  career_growth: number;
  compensation: number;
  management: number;
  diversity: number;
  review_count?: string;
  data_sources?: string[];
}

export interface CompanyDossier {
  company: string;
  generated_at: string;
  hiring_strategy: string;
  interview_focus: string;
  interview_difficulty: 'easy' | 'medium' | 'hard' | 'very_hard';
  salary_estimates: SalaryEstimate[];
  culture_ratings: CultureRatings;
  competitors?: string[];
  risk_flags?: string[];
  opportunities?: string[];
  notes?: string;
}

export interface NegotiationScript {
  salary_range: {
    currency: string;
    min: number;
    max: number;
    confidence: 'low' | 'medium' | 'high';
  };
  opening_line: string;
  justification: string;
  counter_offer_fallback: string;
  sources: string[];
  updated_at: string;
}

export interface NegotiationState {
  active: boolean;
  phase: 'intake' | 'opening' | 'anchor' | 'counter' | 'close';
  recentInterviewerUtterances: string[];
  lastDetectedObjection?: string;
  lastUpdatedAt: string;
}
