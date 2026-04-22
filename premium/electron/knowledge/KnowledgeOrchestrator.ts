import * as fs from 'fs';
import * as path from 'path';

import { DocType, type ActiveJD, type CompanyDossier, type NegotiationScript, type NegotiationState, type ResumeSummary, type SalaryEstimate } from './types';
import { KnowledgeDatabaseManager } from './KnowledgeDatabaseManager';

type GenerateContentFn = (contents: any[]) => Promise<string>;
type EmbedFn = (text: string) => Promise<number[]>;

interface KnowledgeStatus {
  hasResume: boolean;
  hasJD: boolean;
  activeMode: boolean;
  resumeSummary?: ResumeSummary;
}

interface StoredKnowledgeState {
  schemaVersion: number;
  knowledgeMode: boolean;
  resumeText: string;
  jdText: string;
  profileData: any;
  negotiationScript: NegotiationScript | null;
  companyDossiers: Record<string, CompanyDossier>;
  negotiationState?: NegotiationState;
}

interface ProfileData {
  hasResume: boolean;
  hasActiveJD: boolean;
  resumePath?: string | null;
  jdPath?: string | null;
  resumeSummary: ResumeSummary | null;
  activeJD: ActiveJD | null;
  experienceCount: number;
  projectCount: number;
  nodeCount: number;
  skills: string[];
  negotiationScript: NegotiationScript | null;
}

interface ParsedResumeProfile {
  resumeSummary: ResumeSummary;
  experienceCount: number;
  projectCount: number;
  skills: string[];
}

interface SkillDictionaryEntry {
  canonical: string;
  aliases: string[];
}

const SKILL_DICTIONARY: SkillDictionaryEntry[] = [
  { canonical: 'JavaScript', aliases: ['javascript', 'js'] },
  { canonical: 'TypeScript', aliases: ['typescript', 'ts'] },
  { canonical: 'Node.js', aliases: ['node.js', 'nodejs', 'node js'] },
  { canonical: 'React', aliases: ['react', 'reactjs', 'react.js'] },
  { canonical: 'Next.js', aliases: ['next.js', 'nextjs'] },
  { canonical: 'Vue.js', aliases: ['vue', 'vue.js', 'vuejs'] },
  { canonical: 'Angular', aliases: ['angular', 'angularjs'] },
  { canonical: 'Svelte', aliases: ['svelte'] },
  { canonical: 'HTML', aliases: ['html', 'html5'] },
  { canonical: 'CSS', aliases: ['css', 'css3'] },
  { canonical: 'Tailwind CSS', aliases: ['tailwind', 'tailwindcss', 'tailwind css'] },
  { canonical: 'Redux', aliases: ['redux'] },

  { canonical: 'Python', aliases: ['python'] },
  { canonical: 'Java', aliases: ['java'] },
  { canonical: 'C++', aliases: ['c++'] },
  { canonical: 'C#', aliases: ['c#'] },
  { canonical: 'Go', aliases: ['golang', 'go language'] },
  { canonical: 'Rust', aliases: ['rust'] },
  { canonical: 'PHP', aliases: ['php'] },
  { canonical: 'Ruby', aliases: ['ruby'] },
  { canonical: 'Kotlin', aliases: ['kotlin'] },
  { canonical: 'Swift', aliases: ['swift'] },

  { canonical: '.NET', aliases: ['.net', 'dotnet'] },
  { canonical: 'ASP.NET', aliases: ['asp.net', 'aspnet'] },
  { canonical: 'Express', aliases: ['express', 'express.js'] },
  { canonical: 'NestJS', aliases: ['nestjs', 'nest.js'] },
  { canonical: 'Spring Boot', aliases: ['spring boot'] },
  { canonical: 'Django', aliases: ['django'] },
  { canonical: 'Flask', aliases: ['flask'] },
  { canonical: 'FastAPI', aliases: ['fastapi'] },

  { canonical: 'AWS', aliases: ['aws', 'amazon web services'] },
  { canonical: 'Azure', aliases: ['azure', 'microsoft azure'] },
  { canonical: 'GCP', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  { canonical: 'Docker', aliases: ['docker'] },
  { canonical: 'Kubernetes', aliases: ['kubernetes', 'k8s'] },
  { canonical: 'Terraform', aliases: ['terraform'] },
  { canonical: 'CI/CD', aliases: ['ci/cd', 'continuous integration', 'continuous delivery'] },
  { canonical: 'GitHub Actions', aliases: ['github actions'] },
  { canonical: 'Jenkins', aliases: ['jenkins'] },

  { canonical: 'PostgreSQL', aliases: ['postgresql', 'postgres'] },
  { canonical: 'MySQL', aliases: ['mysql'] },
  { canonical: 'SQL Server', aliases: ['sql server', 'mssql'] },
  { canonical: 'SQLite', aliases: ['sqlite'] },
  { canonical: 'MongoDB', aliases: ['mongodb', 'mongo'] },
  { canonical: 'Redis', aliases: ['redis'] },
  { canonical: 'DynamoDB', aliases: ['dynamodb'] },
  { canonical: 'Elasticsearch', aliases: ['elasticsearch', 'elastic search'] },

  { canonical: 'REST APIs', aliases: ['rest api', 'restful api', 'restful services'] },
  { canonical: 'GraphQL', aliases: ['graphql'] },
  { canonical: 'gRPC', aliases: ['grpc'] },
  { canonical: 'Microservices', aliases: ['microservices', 'microservice architecture'] },
  { canonical: 'Kafka', aliases: ['kafka', 'apache kafka'] },
  { canonical: 'RabbitMQ', aliases: ['rabbitmq'] },

  { canonical: 'Machine Learning', aliases: ['machine learning', 'ml'] },
  { canonical: 'Deep Learning', aliases: ['deep learning'] },
  { canonical: 'NLP', aliases: ['nlp', 'natural language processing'] },
  { canonical: 'LLM', aliases: ['llm', 'large language model', 'large language models'] },
  { canonical: 'RAG', aliases: ['rag', 'retrieval augmented generation'] },
  { canonical: 'LangChain', aliases: ['langchain'] },
  { canonical: 'PyTorch', aliases: ['pytorch'] },
  { canonical: 'TensorFlow', aliases: ['tensorflow'] },
  { canonical: 'pandas', aliases: ['pandas'] },
  { canonical: 'NumPy', aliases: ['numpy'] },
  { canonical: 'scikit-learn', aliases: ['scikit-learn', 'sklearn'] },
  { canonical: 'Spark', aliases: ['spark', 'apache spark'] },
  { canonical: 'Hadoop', aliases: ['hadoop'] },
  { canonical: 'Airflow', aliases: ['airflow', 'apache airflow'] },
  { canonical: 'dbt', aliases: ['dbt'] },
  { canonical: 'ETL', aliases: ['etl', 'elt'] },

  { canonical: 'System Design', aliases: ['system design'] },
  { canonical: 'Data Structures', aliases: ['data structures'] },
  { canonical: 'Algorithms', aliases: ['algorithms'] },
  { canonical: 'Linux', aliases: ['linux'] },
  { canonical: 'Git', aliases: ['git'] },
  { canonical: 'Jest', aliases: ['jest'] },
  { canonical: 'Cypress', aliases: ['cypress'] },
  { canonical: 'Playwright', aliases: ['playwright'] },
  { canonical: 'Agile', aliases: ['agile'] },
  { canonical: 'Scrum', aliases: ['scrum'] },
  { canonical: 'Leadership', aliases: ['leadership'] },
  { canonical: 'Mentoring', aliases: ['mentoring', 'mentor'] },
  { canonical: 'Observability', aliases: ['observability'] },
  { canonical: 'Prometheus', aliases: ['prometheus'] },
  { canonical: 'Grafana', aliases: ['grafana'] },
  { canonical: 'Jira', aliases: ['jira'] },
];

const EXPERIENCE_SECTION_PATTERNS = [
  /^experience$/,
  /^work experience$/,
  /^professional experience$/,
  /^employment history$/,
  /^career history$/,
];

const PROJECT_SECTION_PATTERNS = [
  /^projects$/,
  /^project experience$/,
  /^selected projects$/,
  /^key projects$/,
  /^open source$/,
  /^portfolio$/,
];

const SKILLS_SECTION_PATTERNS = [
  /^skills$/,
  /^technical skills$/,
  /^core skills$/,
  /^technologies$/,
  /^tech stack$/,
  /^competencies$/,
  /^tools$/,
];

const ROLE_PATTERNS = [
  /principal\s+engineer/i,
  /staff\s+engineer/i,
  /solutions?\s+architect/i,
  /site reliability engineer/i,
  /devops\s+engineer/i,
  /senior\s+(software|full\s*stack|backend|front\s*end|ml|ai|data)?\s*engineer/i,
  /(software|full\s*stack|backend|front\s*end|ml|ai|data)\s+engineer/i,
  /engineering\s+manager/i,
  /product\s+manager/i,
  /data\s+scientist/i,
  /developer/i,
  /보안\s*엔지니어/,
  /인프라\s*엔지니어/,
  /시스템\s*엔지니어/,
  /네트워크\s*엔지니어/,
  /데브옵스\s*엔지니어/,
  /백엔드\s*(개발자|엔지니어)/,
  /프론트\s*엔드\s*(개발자|엔지니어)/,
  /풀스택\s*(개발자|엔지니어)/,
  /정보보안\s*(운영\s*)?엔지니어/,
  /Security\s+Engineer/i,
  /Platform\s+Engineer/i,
  /Network\s+Engineer/i,
];

class NegotiationConversationTracker {
  private state: NegotiationState = {
    active: false,
    phase: 'intake',
    recentInterviewerUtterances: [],
    lastUpdatedAt: new Date().toISOString(),
  };

  public hydrate(state?: NegotiationState): void {
    if (!state) return;
    this.state = {
      active: !!state.active,
      phase: state.phase ?? 'intake',
      recentInterviewerUtterances: Array.isArray(state.recentInterviewerUtterances)
        ? state.recentInterviewerUtterances.slice(-20)
        : [],
      lastDetectedObjection: state.lastDetectedObjection,
      lastUpdatedAt: state.lastUpdatedAt ?? new Date().toISOString(),
    };
  }

  public activate(phase: NegotiationState['phase'] = 'opening'): void {
    this.state.active = true;
    this.state.phase = phase;
    this.state.lastUpdatedAt = new Date().toISOString();
  }

  public feedInterviewerUtterance(text: string): void {
    const clean = String(text || '').trim();
    if (!clean) return;

    this.state.active = true;
    this.state.recentInterviewerUtterances.push(clean);
    this.state.recentInterviewerUtterances = this.state.recentInterviewerUtterances.slice(-20);

    const lower = clean.toLowerCase();
    if (/budget|compensation|range|salary/.test(lower)) {
      this.state.phase = 'anchor';
      this.state.lastDetectedObjection = 'budget';
    } else if (/cannot|can\'t|unable|not possible|too high/.test(lower)) {
      this.state.phase = 'counter';
      this.state.lastDetectedObjection = 'pushback';
    } else if (/offer|final|approved|move forward/.test(lower)) {
      this.state.phase = 'close';
      this.state.lastDetectedObjection = undefined;
    }

    this.state.lastUpdatedAt = new Date().toISOString();
  }

  public getState(): NegotiationState {
    return {
      ...this.state,
      recentInterviewerUtterances: [...this.state.recentInterviewerUtterances],
    };
  }

  public isActive(): boolean {
    return this.state.active;
  }

  public reset(): void {
    this.state = {
      active: false,
      phase: 'intake',
      recentInterviewerUtterances: [],
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}

export class KnowledgeOrchestrator {
  private static readonly STATE_SCHEMA_VERSION = 2;
  private static readonly MAX_PERSISTED_TEXT_CHARS = 120_000;

  private readonly db: KnowledgeDatabaseManager;

  private knowledgeMode: boolean = false;
  private resumeText: string = '';
  private jdText: string = '';
  private profileData: ProfileData = this.createDefaultProfileData();

  private negotiationScript: NegotiationScript | null = null;
  private companyDossiers: Record<string, CompanyDossier> = {};

  private generateContentFn: GenerateContentFn | null = null;
  private embedFn: EmbedFn | null = null;
  private embedQueryFn: EmbedFn | null = null;
  private hasRunResumeRecovery: boolean = false;
  private hasAttemptedSourceRepair: boolean = false;

  private negotiationTracker = new NegotiationConversationTracker();

  private companyResearchEngine: {
    searchProvider: any;
    setSearchProvider: (provider: any) => void;
    researchCompany: (companyName: string, jdCtx?: any, forceRefresh?: boolean) => Promise<CompanyDossier>;
  };

  constructor(db?: KnowledgeDatabaseManager) {
    this.db = db ?? new KnowledgeDatabaseManager(null);

    this.companyResearchEngine = {
      searchProvider: null,
      setSearchProvider: (provider: any) => {
        this.companyResearchEngine.searchProvider = provider;
      },
      researchCompany: async (companyName: string, jdCtx?: any, forceRefresh?: boolean) => {
        return this.researchCompany(companyName, jdCtx, !!forceRefresh);
      },
    };

    this.hydrateState();
  }

  private createDefaultProfileData(): ProfileData {
    return {
      hasResume: false,
      hasActiveJD: false,
      resumePath: null,
      jdPath: null,
      resumeSummary: null,
      activeJD: null,
      experienceCount: 0,
      projectCount: 0,
      nodeCount: 0,
      skills: [],
      negotiationScript: null,
    };
  }

  public setGenerateContentFn(fn: GenerateContentFn): void {
    this.generateContentFn = fn;
  }

  public setEmbedFn(fn: EmbedFn): void {
    this.embedFn = fn;
  }

  public setEmbedQueryFn(fn: EmbedFn): void {
    this.embedQueryFn = fn;
  }

  public isKnowledgeMode(): boolean {
    return this.knowledgeMode;
  }

  public setKnowledgeMode(enabled: boolean): void {
    this.knowledgeMode = !!enabled;
    this.persistState();
  }

  public getStatus(): KnowledgeStatus {
    return {
      hasResume: !!this.resumeText,
      hasJD: !!this.jdText,
      activeMode: this.knowledgeMode,
      resumeSummary: this.profileData?.resumeSummary ?? undefined,
    };
  }

  public getProfileData(): any {
    this.tryRecoverResumeProfileFromStoredText();

    const resumeSummary = this.profileData?.resumeSummary ?? null;
    const email = resumeSummary?.email || this.extractEmail(this.resumeText);
    const name = resumeSummary?.name || this.deriveNameFromEmail(email);

    return {
      ...this.profileData,
      hasResume: !!this.resumeText,
      hasActiveJD: !!this.jdText,
      skills: [...(this.profileData.skills || [])],
      negotiationScript: this.negotiationScript,
      identity: {
        name,
        email,
      },
    };
  }

  public async repairProfileFromSourceIfNeeded(): Promise<void> {
    if (this.hasAttemptedSourceRepair) return;
    this.hasAttemptedSourceRepair = true;

    const resumePath = this.profileData?.resumePath;
    if (!resumePath || !fs.existsSync(resumePath)) return;

    const summary = this.profileData?.resumeSummary || {};
    const currentSkills = this.profileData?.skills?.length || 0;
    const currentExperience = this.profileData?.experienceCount || 0;
    const currentProjects = this.profileData?.projectCount || 0;

    const textLooksCorrupt = this.looksLikeBinaryOrPdfPayload(this.resumeText);
    const looksThin = !summary.name || !summary.email || currentSkills <= 4 || currentExperience <= 1 || currentProjects <= 1;
    if (!textLooksCorrupt && !looksThin) return;

    const extracted = await this.extractText(resumePath);
    if (!extracted || !this.isLikelyReadableExtractedText(extracted)) return;

    this.resumeText = extracted;
    const parsed = this.parseResume(extracted);
    this.applyParsedResume(parsed, resumePath);
    this.persistState();
  }

  private tryRecoverResumeProfileFromStoredText(): void {
    if (this.hasRunResumeRecovery) return;
    this.hasRunResumeRecovery = true;

    if (!this.resumeText) return;
    if (this.looksLikeBinaryOrPdfPayload(this.resumeText)) return;

    const summary = this.profileData?.resumeSummary || {};
    const currentSkills = this.profileData?.skills?.length || 0;
    const currentExperience = this.profileData?.experienceCount || 0;
    const currentProjects = this.profileData?.projectCount || 0;

    const looksThin = !summary.name || !summary.email || currentSkills <= 4 || currentExperience <= 1 || currentProjects <= 1;
    if (!looksThin) return;

    const reparsed = this.parseResume(this.resumeText);
    const improved =
      (reparsed.skills.length > currentSkills)
      || (reparsed.experienceCount > currentExperience)
      || (reparsed.projectCount > currentProjects)
      || (!summary.name && !!reparsed.resumeSummary.name)
      || (!summary.email && !!reparsed.resumeSummary.email);

    if (!improved) return;

    this.applyParsedResume(reparsed, this.profileData.resumePath ?? null);
    this.persistState();
  }

  public async ingestDocument(filePath: string, docType: DocType): Promise<{ success: boolean; error?: string }> {
    try {
      const normalizedPath = String(filePath || '').trim();
      if (!normalizedPath) {
        return { success: false, error: 'Invalid file path' };
      }

      if (docType !== DocType.RESUME && docType !== DocType.JD) {
        return { success: false, error: `Unsupported document type: ${String(docType)}` };
      }

      if (!fs.existsSync(normalizedPath)) {
        return { success: false, error: 'File not found' };
      }

      const ext = path.extname(normalizedPath).toLowerCase();
      if (!['.txt', '.pdf', '.docx'].includes(ext)) {
        return { success: false, error: 'Unsupported file type. Please upload .txt, .pdf, or .docx files.' };
      }

      const extracted = await this.extractText(normalizedPath);
      if (!extracted || extracted.length < 30 || !this.isLikelyReadableExtractedText(extracted)) {
        return {
          success: false,
          error: 'Could not extract readable text from the selected file. Please upload a text-based PDF/DOCX/TXT.',
        };
      }

      if (docType === DocType.RESUME) {
        const parsed = this.parseResume(extracted);
        this.resumeText = extracted;
        this.applyParsedResume(parsed, normalizedPath);
      } else if (docType === DocType.JD) {
        const parsed = this.parseJD(extracted);
        this.jdText = extracted;
        this.profileData.hasActiveJD = true;
        this.profileData.activeJD = parsed;
        this.profileData.jdPath = normalizedPath;
      }

      // Warm embeddings in the background when the embedding hook is configured.
      this.warmEmbeddings(extracted);

      // Fresh uploads should invalidate stale negotiation output.
      this.negotiationScript = null;
      this.profileData.negotiationScript = null;

      this.persistState();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message ?? 'Failed to ingest document' };
    }
  }

  private applyParsedResume(parsed: ParsedResumeProfile, resumePath?: string | null): void {
    this.profileData.hasResume = true;
    this.profileData.resumePath = resumePath ?? this.profileData.resumePath ?? null;
    this.profileData.resumeSummary = parsed.resumeSummary;
    this.profileData.experienceCount = parsed.experienceCount;
    this.profileData.projectCount = parsed.projectCount;
    this.profileData.skills = parsed.skills;

    const aggregateNodes = parsed.experienceCount + parsed.projectCount + parsed.skills.length;
    const jdBoost = this.profileData.hasActiveJD ? 1 : 0;
    this.profileData.nodeCount = Math.max(1, Math.min(120, aggregateNodes + jdBoost));
  }

  private warmEmbeddings(text: string): void {
    const snippet = text.slice(0, 8_000);
    if (!snippet || !this.embedFn) return;

    // Best-effort only. Ingestion must not fail because embedding warm-up fails.
    Promise.resolve(this.embedFn(snippet))
      .then(() => {
        if (this.embedQueryFn) {
          return this.embedQueryFn(snippet.slice(0, 2_000));
        }
      })
      .catch((error) => {
        console.warn('[KnowledgeOrchestrator] Embedding warm-up failed:', error);
      });
  }

  public deleteDocumentsByType(docType: DocType): void {
    if (docType === DocType.RESUME) {
      this.resumeText = '';
      this.profileData.hasResume = false;
      this.profileData.resumePath = null;
      this.profileData.resumeSummary = null;
      this.profileData.experienceCount = 0;
      this.profileData.projectCount = 0;
      this.profileData.nodeCount = this.profileData.hasActiveJD ? 1 : 0;
      this.profileData.skills = [];
      this.negotiationScript = null;
      this.profileData.negotiationScript = null;
      this.companyDossiers = {};
    } else if (docType === DocType.JD) {
      this.jdText = '';
      this.profileData.hasActiveJD = false;
      this.profileData.jdPath = null;
      this.profileData.activeJD = null;
      this.negotiationScript = null;
      this.profileData.negotiationScript = null;
      this.companyDossiers = {};
    }

    this.persistState();
  }

  public getCompanyResearchEngine(): any {
    return this.companyResearchEngine;
  }

  public getNegotiationScript(): NegotiationScript | null {
    return this.negotiationScript;
  }

  public async generateNegotiationScriptOnDemand(): Promise<NegotiationScript | null> {
    if (!this.resumeText) return null;

    const jd: ActiveJD | null = this.profileData?.activeJD ?? null;
    const summary: ResumeSummary = this.profileData?.resumeSummary ?? {};

    const salaryRange = this.deriveSalaryRange(jd, summary);
    const heuristicScript = this.buildHeuristicNegotiationScript(salaryRange, jd, summary);
    const llmScript = await this.tryGenerateNegotiationWithLlm(salaryRange, jd, summary);

    this.negotiationScript = llmScript ?? heuristicScript;

    this.profileData.negotiationScript = this.negotiationScript;
    this.negotiationTracker.activate('opening');
    this.persistState();
    return this.negotiationScript;
  }

  public getNegotiationTracker(): any {
    return this.negotiationTracker;
  }

  public resetNegotiationSession(): void {
    this.negotiationTracker.reset();
    this.persistState();
  }

  public feedInterviewerUtterance(text: string): void {
    this.negotiationTracker.feedInterviewerUtterance(text);
    this.persistState();
  }

  public feedForDepthScoring(_message: string): void {
    // Compatibility no-op for open-source fallback.
  }

  public async processQuestion(message: string): Promise<any> {
    if (!this.knowledgeMode || !this.resumeText) return null;

    const contextBlock = this.buildContextBlock();
    const systemPromptInjection = 'You are an interview assistant. Prefer concise responses grounded in the candidate context and role requirements.';

    if (this.isIntroQuestion(message)) {
      const introResponse = this.buildIntroResponse();
      return {
        isIntroQuestion: true,
        introResponse,
        systemPromptInjection,
        contextBlock,
      };
    }

    if (this.looksLikeNegotiationQuestion(message) && this.negotiationScript) {
      const state = this.negotiationTracker.getState();
      return {
        liveNegotiationResponse: {
          tacticalNote: 'Keep a calm tone, restate scope impact, and hold your anchor before conceding.',
          exactScript: this.negotiationScript.counter_offer_fallback,
          showSilenceTimer: true,
          phase: state.phase,
          theirOffer: null,
          yourTarget: this.negotiationScript.salary_range.min,
          currency: this.negotiationScript.salary_range.currency,
        },
        systemPromptInjection,
        contextBlock,
      };
    }

    return {
      systemPromptInjection,
      contextBlock,
    };
  }

  private async researchCompany(companyName: string, jdCtx: any = {}, forceRefresh: boolean = false): Promise<CompanyDossier> {
    const normalized = String(companyName || '').trim();
    if (!normalized) throw new Error('Company name is required');

    const cacheKey = normalized.toLowerCase();
    if (!forceRefresh && this.companyDossiers[cacheKey]) {
      return this.companyDossiers[cacheKey];
    }

    const searchSnippets = await this.collectSearchSnippets(normalized, jdCtx);
    const heuristicDossier = this.buildHeuristicDossier(normalized, jdCtx, searchSnippets);
    const llmDossier = await this.tryGenerateDossierWithLlm(normalized, jdCtx, searchSnippets, heuristicDossier);
    const dossier = llmDossier ?? heuristicDossier;

    this.companyDossiers[cacheKey] = dossier;
    this.persistState();
    return dossier;
  }

  private async collectSearchSnippets(companyName: string, jdCtx: any): Promise<string[]> {
    const provider = this.companyResearchEngine.searchProvider;
    if (!provider) return [];

    const queryParts = [companyName, jdCtx?.title, 'hiring strategy', 'salary bands', 'engineering culture']
      .filter(Boolean)
      .join(' ');

    try {
      const raw = typeof provider.search === 'function'
        ? await provider.search(queryParts)
        : typeof provider.run === 'function'
          ? await provider.run(queryParts)
          : [];

      if (!Array.isArray(raw)) return [];

      const snippets = raw
        .map((item: any) => String(item?.snippet || item?.content || item?.title || '').trim())
        .filter(Boolean)
        .map((s: string) => s.replace(/\s+/g, ' ').trim())
        .map((s: string) => s.slice(0, 1200));

      return [...new Set(snippets)].slice(0, 5);
    } catch (error) {
      console.warn('[KnowledgeOrchestrator] Search provider failed, using heuristic dossier:', error);
      return [];
    }
  }

  private buildHeuristicDossier(companyName: string, jdCtx: any, searchSnippets: string[]): CompanyDossier {
    const title = String(jdCtx?.title || 'Software Engineer');
    const level = this.normalizeLevel(String(jdCtx?.level || 'mid'));
    const technologies = Array.isArray(jdCtx?.technologies) ? jdCtx.technologies.slice(0, 8) : [];

    const salaryRange = this.deriveSalaryRange(jdCtx as ActiveJD, this.profileData?.resumeSummary || {});
    const salaryEstimates: SalaryEstimate[] = [
      {
        title,
        location: String(jdCtx?.location || 'US / Remote'),
        min: salaryRange.min,
        max: salaryRange.max,
        currency: salaryRange.currency,
        confidence: salaryRange.confidence,
      },
    ];

    const difficulty = level === 'senior' || level === 'lead' ? 'hard' : 'medium';

    const dataSources = searchSnippets.length > 0 ? ['Web', 'JD'] : ['JD', 'Heuristic'];

    const dossier: CompanyDossier = {
      company: companyName,
      generated_at: new Date().toISOString(),
      hiring_strategy: `${companyName} is likely prioritizing execution speed, ownership, and candidates who can deliver measurable business outcomes within the first quarter.` +
        (technologies.length ? ` Core stack signals include ${technologies.join(', ')}.` : ''),
      interview_focus: `Expect emphasis on system design depth, cross-functional communication, and practical coding under constraints for a ${title} profile.`,
      interview_difficulty: difficulty,
      salary_estimates: salaryEstimates,
      culture_ratings: {
        overall: this.round1(level === 'lead' ? 3.7 : level === 'senior' ? 3.8 : 4.0),
        work_life_balance: this.round1(level === 'lead' ? 3.4 : 3.7),
        career_growth: this.round1(level === 'junior' ? 4.2 : 3.9),
        compensation: this.round1(salaryRange.confidence === 'high' ? 4.1 : 3.7),
        management: this.round1(3.6),
        diversity: this.round1(3.8),
        review_count: searchSnippets.length ? 'Web-sourced synthesis' : 'Model-estimated baseline',
        data_sources: dataSources,
      },
      competitors: this.estimateCompetitors(companyName),
      opportunities: [
        `Connect your resume wins to ${title} outcomes expected in the first 90 days.`,
        'Prepare one architecture story and one incident-handling story with metrics.',
      ],
      risk_flags: [
        'Clarify leveling rubric and performance review cadence before signing.',
        'Confirm total compensation mix (base vs equity vs bonus) in writing.',
      ],
      notes: searchSnippets.slice(0, 2).join(' | ') || 'No live web snippets available; dossier generated from JD + profile signals.',
    };

    return dossier;
  }

  private async tryGenerateDossierWithLlm(
    companyName: string,
    jdCtx: any,
    searchSnippets: string[],
    fallback: CompanyDossier,
  ): Promise<CompanyDossier | null> {
    if (!this.generateContentFn) return null;

    const prompt = [
      'You are an interview-market intelligence analyst.',
      'Return strict JSON only (no markdown).',
      'Required keys: hiring_strategy, interview_focus, interview_difficulty, salary_estimates, culture_ratings, competitors, risk_flags, opportunities, notes.',
      `Company: ${companyName}`,
      `Role title: ${String(jdCtx?.title || 'Software Engineer')}`,
      `Role location: ${String(jdCtx?.location || 'Remote')}`,
      `Role level: ${String(jdCtx?.level || 'mid')}`,
      `Technologies: ${Array.isArray(jdCtx?.technologies) ? jdCtx.technologies.join(', ') : 'N/A'}`,
      'Search snippets (may be empty):',
      searchSnippets.length ? searchSnippets.map((s, i) => `${i + 1}. ${s}`).join('\n') : 'No snippets available',
      'Output concise, actionable content. Avoid speculation beyond provided inputs.',
    ].join('\n');

    try {
      const raw = await this.generateContentFn([{ text: prompt }]);
      const parsed = this.extractFirstJsonObject(raw);
      if (!parsed) return null;
      return this.coerceDossier(parsed, fallback);
    } catch (error) {
      console.warn('[KnowledgeOrchestrator] LLM dossier generation failed, using heuristic dossier:', error);
      return null;
    }
  }

  private coerceDossier(value: any, fallback: CompanyDossier): CompanyDossier | null {
    if (!value || typeof value !== 'object') return null;

    const difficulty = ['easy', 'medium', 'hard', 'very_hard'].includes(String(value.interview_difficulty))
      ? (String(value.interview_difficulty) as CompanyDossier['interview_difficulty'])
      : fallback.interview_difficulty;

    const rawSalary = Array.isArray(value.salary_estimates) ? value.salary_estimates : [];
    const salary_estimates = rawSalary
      .map((s: any) => ({
        title: String(s?.title || fallback.salary_estimates[0]?.title || 'Role'),
        location: String(s?.location || fallback.salary_estimates[0]?.location || 'Remote'),
        min: Math.max(0, Math.round(Number(s?.min || 0))),
        max: Math.max(0, Math.round(Number(s?.max || 0))),
        currency: String(s?.currency || fallback.salary_estimates[0]?.currency || 'USD'),
        confidence: ['low', 'medium', 'high'].includes(String(s?.confidence)) ? String(s.confidence) : 'medium',
      }))
      .filter((s: any) => s.min > 0 && s.max > s.min)
      .slice(0, 4) as SalaryEstimate[];

    const ratings = value.culture_ratings && typeof value.culture_ratings === 'object'
      ? value.culture_ratings
      : {};

    const numberOr = (n: any, fallbackN: number) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return fallbackN;
      return Math.max(1, Math.min(5, this.round1(v)));
    };

    return {
      ...fallback,
      generated_at: new Date().toISOString(),
      hiring_strategy: String(value.hiring_strategy || fallback.hiring_strategy),
      interview_focus: String(value.interview_focus || fallback.interview_focus),
      interview_difficulty: difficulty,
      salary_estimates: salary_estimates.length ? salary_estimates : fallback.salary_estimates,
      culture_ratings: {
        overall: numberOr(ratings.overall, fallback.culture_ratings.overall),
        work_life_balance: numberOr(ratings.work_life_balance, fallback.culture_ratings.work_life_balance),
        career_growth: numberOr(ratings.career_growth, fallback.culture_ratings.career_growth),
        compensation: numberOr(ratings.compensation, fallback.culture_ratings.compensation),
        management: numberOr(ratings.management, fallback.culture_ratings.management),
        diversity: numberOr(ratings.diversity, fallback.culture_ratings.diversity),
        review_count: String(ratings.review_count || fallback.culture_ratings.review_count || ''),
        data_sources: Array.isArray(ratings.data_sources)
          ? ratings.data_sources.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 5)
          : fallback.culture_ratings.data_sources,
      },
      competitors: Array.isArray(value.competitors)
        ? value.competitors.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 6)
        : fallback.competitors,
      risk_flags: Array.isArray(value.risk_flags)
        ? value.risk_flags.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 6)
        : fallback.risk_flags,
      opportunities: Array.isArray(value.opportunities)
        ? value.opportunities.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 6)
        : fallback.opportunities,
      notes: String(value.notes || fallback.notes || ''),
    };
  }

  private deriveSalaryRange(jd: Partial<ActiveJD> | null, summary: ResumeSummary): {
    currency: string;
    min: number;
    max: number;
    confidence: 'low' | 'medium' | 'high';
  } {
    const hint = String(jd?.compensation_hint || '');
    const parsed = this.parseSalaryRangeFromText(hint);
    if (parsed) {
      return {
        currency: parsed.currency,
        min: parsed.min,
        max: parsed.max,
        confidence: 'high',
      };
    }

    const level = this.normalizeLevel(String(jd?.level || 'mid'));
    const years = summary.totalExperienceYears || jd?.min_years_experience || 0;

    let baseMin = 110000;
    let baseMax = 150000;
    if (level === 'junior') {
      baseMin = 80000;
      baseMax = 115000;
    } else if (level === 'senior') {
      baseMin = 145000;
      baseMax = 210000;
    } else if (level === 'lead') {
      baseMin = 185000;
      baseMax = 260000;
    }

    const expFactor = Math.min(6, Math.max(0, years - 3)) * 6000;

    return {
      currency: 'USD',
      min: Math.round((baseMin + expFactor) / 1000) * 1000,
      max: Math.round((baseMax + expFactor) / 1000) * 1000,
      confidence: years > 0 ? 'medium' : 'low',
    };
  }

  private buildHeuristicNegotiationScript(
    salaryRange: { currency: string; min: number; max: number; confidence: 'low' | 'medium' | 'high' },
    jd: ActiveJD | null,
    summary: ResumeSummary,
  ): NegotiationScript {
    const role = summary.role || jd?.title || 'the role';
    const company = jd?.company || 'the company';
    const years = summary.totalExperienceYears ?? 0;
    const topSkills = (this.profileData.skills || []).slice(0, 4).join(', ') || 'cross-functional execution';

    const opening = `Based on the role scope and my ${years || 'multi-year'} track record in ${role}, I am targeting a total compensation in the ${salaryRange.currency} ${salaryRange.min.toLocaleString()}-${salaryRange.max.toLocaleString()} range.`;
    const justification = `I can directly contribute to ${company}'s priorities with strengths in ${topSkills}. The requested range reflects market data for this level and the impact expected from day one.`;
    const counter = 'I appreciate the offer. If the base cannot move, I would like to explore a performance review at 6 months, a sign-on adjustment, and stronger equity to align with the value and scope of this role.';

    return {
      salary_range: salaryRange,
      opening_line: opening,
      justification,
      counter_offer_fallback: counter,
      sources: [
        jd?.compensation_hint ? 'JD compensation hint' : 'Market heuristic model',
        this.profileData?.activeJD ? 'Role + level calibration' : 'Resume-only calibration',
      ],
      updated_at: new Date().toISOString(),
    };
  }

  private async tryGenerateNegotiationWithLlm(
    salaryRange: { currency: string; min: number; max: number; confidence: 'low' | 'medium' | 'high' },
    jd: ActiveJD | null,
    summary: ResumeSummary,
  ): Promise<NegotiationScript | null> {
    if (!this.generateContentFn) return null;

    const prompt = [
      'You are a compensation negotiation strategist.',
      'Return strict JSON only (no markdown).',
      'Schema:',
      '{"salary_range":{"currency":"USD","min":120000,"max":150000,"confidence":"medium"},"opening_line":"...","justification":"...","counter_offer_fallback":"...","sources":["...","..."]}',
      `Role: ${summary.role || jd?.title || 'Software Engineer'}`,
      `Company: ${jd?.company || 'Unknown'}`,
      `Experience: ${summary.totalExperienceYears || 0}`,
      `Top skills: ${(this.profileData.skills || []).slice(0, 8).join(', ') || 'N/A'}`,
      `Target salary range: ${salaryRange.currency} ${salaryRange.min}-${salaryRange.max}`,
      'Keep responses concise, practical, and interview-ready.',
    ].join('\n');

    try {
      const raw = await this.generateContentFn([{ text: prompt }]);
      const parsed = this.extractFirstJsonObject(raw);
      if (!parsed) return null;
      return this.coerceNegotiationScript(parsed, salaryRange);
    } catch (error) {
      console.warn('[KnowledgeOrchestrator] LLM negotiation generation failed, using heuristic script:', error);
      return null;
    }
  }

  private coerceNegotiationScript(
    value: any,
    fallbackRange: { currency: string; min: number; max: number; confidence: 'low' | 'medium' | 'high' },
  ): NegotiationScript | null {
    if (!value || typeof value !== 'object') return null;

    const rangeIn = value.salary_range || {};
    const min = Number(rangeIn.min);
    const max = Number(rangeIn.max);
    const hasValidRange = Number.isFinite(min) && Number.isFinite(max) && min > 0 && max > min;

    const confidence = ['low', 'medium', 'high'].includes(String(rangeIn.confidence))
      ? (String(rangeIn.confidence) as 'low' | 'medium' | 'high')
      : fallbackRange.confidence;

    const opening = String(value.opening_line || '').trim();
    const justification = String(value.justification || '').trim();
    const counter = String(value.counter_offer_fallback || '').trim();
    if (!opening || !justification || !counter) return null;

    const sources = Array.isArray(value.sources)
      ? value.sources.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 6)
      : [];

    return {
      salary_range: {
        currency: String(rangeIn.currency || fallbackRange.currency || 'USD'),
        min: hasValidRange ? Math.round(min) : fallbackRange.min,
        max: hasValidRange ? Math.round(max) : fallbackRange.max,
        confidence,
      },
      opening_line: opening,
      justification,
      counter_offer_fallback: counter,
      sources: sources.length ? sources : ['LLM synthesis', 'Role + profile context'],
      updated_at: new Date().toISOString(),
    };
  }

  private extractFirstJsonObject(raw: string): any | null {
    const text = String(raw || '').trim();
    if (!text) return null;

    const direct = this.tryParseJson(text);
    if (direct) return direct;

    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first < 0 || last <= first) return null;

    const sliced = text.slice(first, last + 1);
    return this.tryParseJson(sliced);
  }

  private tryParseJson(raw: string): any | null {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private parseSalaryRangeFromText(text: string): { currency: string; min: number; max: number } | null {
    if (!text) return null;

    const m = text.match(/([\$\u00a3\u20ac])?\s*(\d{2,3}(?:[\,\d]{0,3})(?:\.\d+)?)\s*(k|K)?\s*(?:-|to|\u2013)\s*([\$\u00a3\u20ac])?\s*(\d{2,3}(?:[\,\d]{0,3})(?:\.\d+)?)\s*(k|K)?/);
    if (!m) return null;

    const currency = this.currencyFromSymbol(m[1] || m[4] || '$');
    const a = this.parseMoneyToken(m[2], !!m[3]);
    const b = this.parseMoneyToken(m[5], !!m[6]);

    if (!a || !b || a >= b) return null;
    return { currency, min: a, max: b };
  }

  private parseMoneyToken(raw: string, hasK: boolean): number {
    const n = Number(String(raw || '').replace(/,/g, ''));
    if (!Number.isFinite(n)) return 0;
    if (hasK) return Math.round(n * 1000);
    if (n < 1000) return Math.round(n * 1000);
    return Math.round(n);
  }

  private currencyFromSymbol(symbol: string): string {
    if (symbol === '$') return 'USD';
    if (symbol === '\u20ac') return 'EUR';
    if (symbol === '\u00a3') return 'GBP';
    return 'USD';
  }

  private normalizeLevel(level: string): 'junior' | 'mid' | 'senior' | 'lead' {
    const l = String(level || '').toLowerCase();
    if (/(principal|staff|lead|manager)/.test(l)) return 'lead';
    if (/senior/.test(l)) return 'senior';
    if (/(junior|entry|intern)/.test(l)) return 'junior';
    return 'mid';
  }

  private async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.txt') {
      return this.normalizeText(fs.readFileSync(filePath, 'utf8'));
    }

    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      try {
        const extracted = await this.extractPdfTextUsingLibrary(buffer);
        const normalized = this.normalizeText(extracted);
        if (this.isLikelyReadableExtractedText(normalized)) {
          return normalized;
        }
        console.warn('[KnowledgeOrchestrator] PDF extraction returned unreadable text.');
        return '';
      } catch (error) {
        console.warn('[KnowledgeOrchestrator] PDF extraction failed:', error);
        return '';
      }
    }

    if (ext === '.docx') {
      try {
        const mammoth: any = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        const normalized = this.normalizeText(String(result?.value || ''));
        if (this.isLikelyReadableExtractedText(normalized)) {
          return normalized;
        }
        console.warn('[KnowledgeOrchestrator] DOCX extraction returned unreadable text.');
        return '';
      } catch (error) {
        console.warn('[KnowledgeOrchestrator] DOCX extraction failed:', error);
        return '';
      }
    }

    const raw = fs.readFileSync(filePath);
    return this.normalizeText(this.decodeBufferToText(raw));
  }

  private decodeBufferToText(buffer: Buffer): string {
    const utf8 = buffer.toString('utf8');
    const cleanedUtf8 = utf8.replace(/^@/g, '');
    const printableRatio = cleanedUtf8.length > 0
      ? cleanedUtf8.replace(/[\x20-\x7E\n\r\t]/g, '').length / cleanedUtf8.length
      : 0;

    if (printableRatio < 0.25) {
      return cleanedUtf8;
    }

    // Fallback: strip control bytes from latin1 decoding if utf8 looks corrupted.
    return buffer
      .toString('latin1')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
  }

  private normalizeText(text: string): string {
    return String(text || '')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[\t\u00a0]+/g, ' ')
      .replace(/ +/g, ' ')
      .trim();
  }

  private async extractPdfTextUsingLibrary(buffer: Buffer): Promise<string> {
    const pdfModule: any = require('pdf-parse');

    // v2+ API: class-based parser with getText().
    if (pdfModule?.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return String(result?.text || '');
      } finally {
        await Promise.resolve(parser?.destroy?.()).catch(() => {});
      }
    }

    // v1 API: callable default export.
    if (typeof pdfModule === 'function') {
      const parsed = await pdfModule(buffer);
      return String(parsed?.text || '');
    }
    if (typeof pdfModule?.default === 'function') {
      const parsed = await pdfModule.default(buffer);
      return String(parsed?.text || '');
    }

    throw new Error('Unsupported pdf-parse export shape');
  }

  private looksLikeBinaryOrPdfPayload(text: string): boolean {
    const sample = String(text || '').slice(0, 10_000);
    if (!sample) return false;

    if (/^\s*%PDF-\d\.\d/.test(sample)) return true;

    const pdfTokenHits = (sample.match(/\b(obj|endobj|stream|endstream|xref|trailer|startxref)\b/gi) || []).length;
    if (pdfTokenHits >= 4) return true;

    const nonPrintableChars = sample.replace(/[\x20-\x7E\n\r\t\u00A0-\uFFFF]/g, '').length;
    const nonPrintableRatio = sample.length > 0 ? nonPrintableChars / sample.length : 0;
    return nonPrintableRatio > 0.28;
  }

  private isLikelyReadableExtractedText(text: string): boolean {
    const normalized = this.normalizeText(text);
    if (!normalized || normalized.length < 30) return false;
    if (this.looksLikeBinaryOrPdfPayload(normalized)) return false;

    const sample = normalized.slice(0, 10_000);
    const alphaChars = (sample.match(/[A-Za-z\uAC00-\uD7AF]/g) || []).length;
    const alphaTokens = sample.split(/\s+/).filter((token) => /[A-Za-z\uAC00-\uD7AF]/.test(token)).length;
    return alphaChars >= 40 && alphaTokens >= 8;
  }

  private parseResume(text: string): ParsedResumeProfile {
    const lines = this.toAnalysisLines(text);
    const merged = lines.join('\n');

    const email = this.extractEmail(text);
    const name = this.extractName(lines) || this.deriveNameFromEmail(email);
    const role = this.extractRole(merged) || this.extractLikelyTitle(lines);

    const yearsFromExplicitMentions = this.extractYears(merged);
    const yearsFromTimeline = this.estimateYearsFromDateRanges(merged);
    const totalExperienceYears = Math.max(yearsFromExplicitMentions || 0, yearsFromTimeline || 0) || undefined;

    const skills = this.extractSkills(merged, 30);
    const baseExperienceCount = this.countLikelyExperiences(lines, merged);
    const experienceFromYears = totalExperienceYears ? Math.max(2, Math.round(totalExperienceYears / 2)) : 0;
    const experienceCount = Math.min(20, Math.max(1, baseExperienceCount, experienceFromYears));

    const baseProjectCount = this.countLikelyProjects(lines, merged);
    const accomplishmentSignals = (merged.match(/\b(built|developed|implemented|designed|architected|created|launched|shipped|optimized|delivered|led)\b/gi) || []).length;
    const projectsFromAccomplishments = accomplishmentSignals ? Math.max(1, Math.round(accomplishmentSignals / 5)) : 0;
    const projectCount = Math.min(20, Math.max(1, baseProjectCount, projectsFromAccomplishments));

    return {
      resumeSummary: {
        name,
        email,
        role,
        totalExperienceYears,
      },
      experienceCount,
      projectCount,
      skills,
    };
  }

  private parseJD(text: string): ActiveJD {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const title = this.extractRole(text) || this.extractLikelyTitle(lines) || 'Software Engineer';

    const company = this.extractCompany(text) || 'Target Company';
    const location = this.extractLocation(text) || 'Remote';
    const level = this.normalizeLevel(this.extractLevel(text));
    const technologies = this.extractSkills(text, 15);
    const requirements = this.extractRequirements(lines);
    const keywords = this.extractKeywords(text, technologies, 20);
    const compensation_hint = this.extractCompensationHint(text);
    const min_years_experience = this.extractYears(text);

    return {
      title,
      company,
      location,
      level,
      technologies,
      requirements,
      keywords,
      compensation_hint,
      min_years_experience,
    };
  }

  private extractName(lines: string[]): string | undefined {
    for (const line of lines.slice(0, 8)) {
      if (line.length < 3 || line.length > 60) continue;
      if (/[@|]|http|linkedin|github|resume|curriculum/i.test(line)) continue;
      if (/\d/.test(line)) continue;

      const words = line.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 4) {
        const looksName = words.every(w => /^[A-Za-z][A-Za-z'\-]+$/.test(w));
        if (looksName) return words.map(this.capitalize).join(' ');
      }
    }
    return undefined;
  }

  private extractEmail(text: string): string | undefined {
    const match = String(text || '').match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
    return match?.[0]?.toLowerCase();
  }

  private deriveNameFromEmail(email?: string): string | undefined {
    if (!email) return undefined;

    const localPart = String(email).split('@')[0] || '';
    const normalized = localPart
      .replace(/\d+/g, ' ')
      .replace(/[._-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized) return undefined;

    const tokens = normalized.split(' ').filter((token) => token.length >= 2).slice(0, 3);
    if (!tokens.length) return undefined;

    return tokens.map(this.capitalize).join(' ');
  }

  private capitalize = (word: string): string => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  private extractRole(text: string): string | undefined {
    // Skip cert/license/education sections where role-like names appear as cert names
    const lines = text.split('\n');
    const filteredLines: string[] = [];
    let inSkipSection = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^\[?\s*(자격증|자격|학력|교육|교육\s*\/\s*이수|certifications?|licenses?|education)\s*\]?\s*$/i.test(trimmed)) {
        inSkipSection = true;
        continue;
      }
      if (inSkipSection && /^\[.+\]\s*$/.test(trimmed)) {
        inSkipSection = false;
      }
      if (!inSkipSection) filteredLines.push(line);
    }
    const filteredText = filteredLines.join('\n');
    for (const pattern of ROLE_PATTERNS) {
      const m = filteredText.match(pattern);
      if (m?.[0]) return m[0].replace(/\s+/g, ' ').trim();
    }
    return undefined;
  }

  private extractYears(text: string): number | undefined {
    const years: number[] = [];

    const regex = /(\d{1,2})\+?\s*(?:years|yrs)/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const n = Number(match[1]);
      if (Number.isFinite(n) && n >= 0 && n < 60) years.push(n);
    }

    if (!years.length) return undefined;
    return Math.max(...years);
  }

  private extractDateRanges(text: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    const currentYear = new Date().getFullYear();
    const regex = /((?:19|20)\d{2})\s*(?:-|to|\u2013|\u2014)\s*(present|current|now|(?:19|20)\d{2})/gi;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = Number(match[1]);
      const endToken = String(match[2] || '').toLowerCase();
      const end = /(present|current|now)/.test(endToken) ? currentYear : Number(endToken);

      if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
      if (start < 1980 || start > currentYear + 1) continue;
      if (end < start || end > currentYear + 1) continue;

      ranges.push({ start, end });
    }

    return ranges;
  }

  private estimateYearsFromDateRanges(text: string): number | undefined {
    const ranges = this.extractDateRanges(text);
    if (!ranges.length) return undefined;

    const coveredYears = new Set<number>();
    for (const range of ranges) {
      for (let y = range.start; y <= range.end; y += 1) {
        coveredYears.add(y);
      }
    }

    if (!coveredYears.size) return undefined;
    return Math.min(45, Math.max(1, coveredYears.size));
  }

  private toAnalysisLines(text: string): string[] {
    const base = String(text || '');
    const primary = base
      .replace(/[\u2022\u25AA\u25E6\u25CF]/g, '\n• ')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (primary.length >= 10) {
      return primary;
    }

    return base
      .replace(/[\u2022\u25AA\u25E6\u25CF]/g, '\n• ')
      .replace(/\s+\|\s+/g, '\n')
      .replace(/([.?!])\s+(?=[A-Z])/g, '$1\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private normalizeSectionHeading(line: string): string {
    return String(line || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s/&-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isLikelySectionHeading(line: string): boolean {
    const normalized = this.normalizeSectionHeading(line);
    if (!normalized || normalized.length > 40) return false;

    if (
      EXPERIENCE_SECTION_PATTERNS.some((p) => p.test(normalized))
      || PROJECT_SECTION_PATTERNS.some((p) => p.test(normalized))
      || SKILLS_SECTION_PATTERNS.some((p) => p.test(normalized))
      || /^(education|certifications?|summary|profile|achievements?|publications?)$/.test(normalized)
    ) {
      return true;
    }

    const alpha = line.replace(/[^A-Za-z]/g, '');
    return alpha.length >= 4 && alpha === alpha.toUpperCase() && line.length <= 40;
  }

  private extractSectionLines(lines: string[], sectionPatterns: RegExp[]): string[] {
    let start = -1;

    for (let i = 0; i < lines.length; i += 1) {
      const normalized = this.normalizeSectionHeading(lines[i]);
      if (!normalized) continue;
      if (sectionPatterns.some((pattern) => pattern.test(normalized))) {
        start = i + 1;
        break;
      }
    }

    if (start < 0) return [];

    const sectionLines: string[] = [];
    for (let i = start; i < lines.length; i += 1) {
      if (this.isLikelySectionHeading(lines[i])) break;
      sectionLines.push(lines[i]);
    }

    return sectionLines;
  }

  private isExperienceEntryLine(line: string): boolean {
    const normalized = String(line || '');
    return /(\b(?:19|20)\d{2}\b\s*(?:-|to|\u2013|\u2014)\s*(?:present|current|now|\b(?:19|20)\d{2}\b))|\b(?:software|senior|staff|principal|lead|manager|developer|engineer|architect|analyst|consultant)\b/i.test(normalized)
      || /\b(?:at|@)\s+[A-Z][A-Za-z0-9&.\-]{2,}/.test(normalized);
  }

  private countLikelyExperiences(lines: string[], text: string): number {
    const sectionLines = this.extractSectionLines(lines, EXPERIENCE_SECTION_PATTERNS);
    const dateRangeSignals = this.extractDateRanges(text).length;
    const sectionEntrySignals = sectionLines.filter((line) => this.isExperienceEntryLine(line)).length;
    const globalEntrySignals = lines.filter((line) => this.isExperienceEntryLine(line)).length;
    const densityEstimate = sectionLines.length ? Math.round(sectionLines.length / 6) : 0;

    const estimate = Math.max(
      dateRangeSignals,
      sectionEntrySignals,
      Math.round(globalEntrySignals / 3),
      densityEstimate,
      1,
    );

    return Math.min(20, Math.max(1, estimate));
  }

  private countLikelyProjects(lines: string[], text: string): number {
    const sectionLines = this.extractSectionLines(lines, PROJECT_SECTION_PATTERNS);

    const namedProjectSignals = sectionLines.filter((line) => (
      /^[-\u2022*]/.test(line)
      || /project\s*[:\-]/i.test(line)
      || /\b(github|demo|live|case study)\b/i.test(line)
    )).length;

    const actionSignals = sectionLines.filter((line) => /\b(built|developed|implemented|launched|designed|architected|created|shipped)\b/i.test(line)).length;
    const globalSignals = lines.filter((line) => /\b(project|open source|github|built|developed|implemented|launched)\b/i.test(line)).length;
    const dateRanges = this.extractDateRanges(text).length;

    const estimate = Math.max(
      sectionLines.length ? Math.round(sectionLines.length / 4) : 0,
      namedProjectSignals,
      Math.round(actionSignals / 1.5),
      Math.round(globalSignals / 6),
      Math.round(dateRanges / 3),
      sectionLines.length ? 1 : 0,
      1,
    );

    return Math.min(20, Math.max(1, estimate));
  }

  private containsSkillAlias(text: string, alias: string): boolean {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isSimpleWord = /^[a-z0-9]+$/i.test(alias);
    const pattern = isSimpleWord
      ? `\\b${escaped}\\b`
      : `(?:^|[^a-z0-9+#.])${escaped}(?:$|[^a-z0-9+#.])`;

    return new RegExp(pattern, 'i').test(text);
  }

  private dedupeSkillsCaseInsensitive(skills: string[]): string[] {
    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const skill of skills) {
      const clean = String(skill || '').trim();
      if (!clean) continue;

      const key = clean.toLowerCase();
      if (seen.has(key)) continue;

      seen.add(key);
      deduped.push(clean);
    }

    return deduped;
  }

  private extractLooseSkillTokens(lines: string[], limit: number): string[] {
    const out: string[] = [];

    for (const line of lines) {
      const payload = line.replace(/^[-\u2022*]\s*/, '');
      const segments = payload.split(/[,|/]/).map((s) => s.trim()).filter(Boolean);

      for (const segment of segments) {
        const clean = segment.replace(/\(.*?\)/g, '').trim();
        if (!clean || clean.length < 2 || clean.length > 28) continue;
        if (/^\d+$/.test(clean)) continue;
        if (clean.split(/\s+/).length > 4) continue;
        if (/\b(and|with|years|experience|responsible|worked|developed|built|project)\b/i.test(clean)) continue;

        out.push(this.titleizeSkill(clean));
        if (out.length >= limit * 2) break;
      }

      if (out.length >= limit * 2) break;
    }

    return this.dedupeSkillsCaseInsensitive(out).slice(0, limit);
  }

  private extractSkills(text: string, limit: number): string[] {
    const lines = this.toAnalysisLines(text);
    const normalizedText = ` ${String(text || '').toLowerCase()} `;
    const skillSectionLines = this.extractSectionLines(lines, SKILLS_SECTION_PATTERNS);
    const skillSectionText = ` ${skillSectionLines.join(' ').toLowerCase()} `;

    const scoreBySkill = new Map<string, number>();
    const addScore = (skill: string, score: number): void => {
      scoreBySkill.set(skill, (scoreBySkill.get(skill) || 0) + score);
    };

    for (const entry of SKILL_DICTIONARY) {
      let matchedAnywhere = false;
      let matchedInSkillSection = false;

      for (const alias of entry.aliases) {
        if (this.containsSkillAlias(normalizedText, alias)) matchedAnywhere = true;
        if (skillSectionLines.length && this.containsSkillAlias(skillSectionText, alias)) matchedInSkillSection = true;
        if (matchedAnywhere && matchedInSkillSection) break;
      }

      if (matchedAnywhere) addScore(entry.canonical, 1);
      if (matchedInSkillSection) addScore(entry.canonical, 2);
    }

    const rankedDictionarySkills = [...scoreBySkill.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([skill]) => skill);

    const looseSectionSkills = this.extractLooseSkillTokens(skillSectionLines, limit);
    const merged = this.dedupeSkillsCaseInsensitive([...rankedDictionarySkills, ...looseSectionSkills]);

    return merged.slice(0, Math.max(1, limit));
  }

  private titleizeSkill(skill: string): string {
    if (skill.toUpperCase() === skill) return skill;
    if (skill.includes('.')) return skill;
    return skill
      .split(' ')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private extractLikelyTitle(lines: string[]): string | undefined {
    for (const line of lines.slice(0, 20)) {
      if (/engineer|developer|scientist|manager|architect/i.test(line) && line.length < 100) {
        return line.replace(/[^A-Za-z0-9\s\-]/g, '').trim();
      }
    }
    return undefined;
  }

  private extractCompany(text: string): string | undefined {
    const explicit = text.match(/company\s*[:\-]\s*([A-Za-z0-9& .\-]{2,60})/i);
    if (explicit?.[1]) return explicit[1].trim();

    const atPattern = text.match(/\b(?:at|join)\s+([A-Z][A-Za-z0-9& .\-]{2,60})\b/);
    if (atPattern?.[1]) return atPattern[1].trim();

    // Korean patterns: '회사: XXX' or '회사 소개' then extract line
    const koColon = text.match(/(?:회사|기업)\s*[:\-]\s*([\uAC00-\uD7AF\w()]{2,40})/);
    if (koColon?.[1]) return koColon[1].trim();
    // Header pattern: '[JD] 힐링페이퍼(강남언니) — ...'
    const koHeader = text.match(/\[JD\]\s*([\uAC00-\uD7AF\w]+(?:\([\uAC00-\uD7AF\w]+\))?)/);
    if (koHeader?.[1]) return koHeader[1].trim();
    // Match Korean company at line start followed by '—' or '-'
    const koDash = text.match(/^([\uAC00-\uD7AF\w]+(?:\([\uAC00-\uD7AF\w]+\))?)\s*[—\-]\s*/m);
    if (koDash?.[1]) return koDash[1].trim();
    return undefined;
  }

  private extractLocation(text: string): string | undefined {
    const loc = text.match(/(remote|hybrid|on-site|onsite|[A-Za-z ]+,\s*[A-Z]{2})/i);
    return loc?.[1]?.trim();
  }

  private extractLevel(text: string): string {
    const lower = text.toLowerCase();
    if (/(principal|staff|lead|manager)/.test(lower)) return 'lead';
    if (/senior/.test(lower)) return 'senior';
    if (/(junior|entry|intern)/.test(lower)) return 'junior';
    return 'mid';
  }

  private extractRequirements(lines: string[]): string[] {
    const reqs: string[] = [];
    let inReqSection = false;

    for (const line of lines) {
      if (/requirements?|what you will need|qualifications?/i.test(line)) {
        inReqSection = true;
        continue;
      }
      if (inReqSection && /responsibilities|benefits|about us|compensation/i.test(line)) {
        break;
      }
      if (inReqSection && /^[-\u2022*]/.test(line)) {
        reqs.push(line.replace(/^[-\u2022*]\s*/, '').trim());
      }
    }

    return reqs.slice(0, 8);
  }

  private extractKeywords(text: string, technologies: string[], limit: number): string[] {
    const words = String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    const stopWords = new Set([
      'the', 'and', 'for', 'with', 'you', 'your', 'will', 'our', 'are', 'from', 'that', 'this',
      'have', 'has', 'using', 'use', 'a', 'an', 'to', 'of', 'in', 'on', 'or', 'as', 'is', 'be',
    ]);

    const freq = new Map<string, number>();
    for (const w of words) {
      if (w.length < 4 || stopWords.has(w)) continue;
      freq.set(w, (freq.get(w) || 0) + 1);
    }

    const ranked = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word)
      .slice(0, limit);

    const merged = [...technologies.map(t => t.toLowerCase()), ...ranked];
    return [...new Set(merged)].slice(0, limit).map(this.titleizeSkill.bind(this));
  }

  private extractCompensationHint(text: string): string | undefined {
    const range = text.match(/([\$\u20ac\u00a3]\s?\d[\d,]*(?:\s?[kK])?\s*(?:-|to|\u2013)\s*[\$\u20ac\u00a3]?\s?\d[\d,]*(?:\s?[kK])?)/);
    return range?.[1]?.trim();
  }

  private buildContextBlock(): string {
    const summary: ResumeSummary = this.profileData?.resumeSummary || {};
    const jd: ActiveJD | null = this.profileData?.activeJD || null;
    const skills = Array.isArray(this.profileData?.skills) ? this.profileData.skills.slice(0, 12).join(', ') : '';

    const blocks = [
      summary.name ? `Candidate: ${summary.name}` : null,
      summary.role ? `Primary Role: ${summary.role}` : null,
      summary.totalExperienceYears ? `Experience: ${summary.totalExperienceYears}+ years` : null,
      skills ? `Skills: ${skills}` : null,
      jd ? `Target Role: ${jd.title} at ${jd.company}` : null,
      jd?.technologies?.length ? `JD Stack: ${jd.technologies.slice(0, 8).join(', ')}` : null,
      jd?.requirements?.length ? `JD Requirements: ${jd.requirements.slice(0, 5).join(' | ')}` : null,
    ].filter(Boolean);

    return blocks.join('\n');
  }

  private buildIntroResponse(): string {
    const summary: ResumeSummary = this.profileData?.resumeSummary || {};
    const jd: ActiveJD | null = this.profileData?.activeJD || null;
    const topSkills = (this.profileData?.skills || []).slice(0, 4).join(', ');

    const role = summary.role || 'software engineer';
    const years = summary.totalExperienceYears ? `${summary.totalExperienceYears}+ years` : 'multiple years';

    const line1 = `I am a ${role} with ${years} of experience delivering production systems end-to-end.`;
    const line2 = topSkills
      ? `My strongest areas are ${topSkills}, and I focus on building reliable, measurable outcomes.`
      : 'I focus on building reliable, measurable outcomes with strong ownership.';
    const line3 = jd
      ? `For this ${jd.title} opportunity at ${jd.company}, I can contribute quickly in ${jd.technologies.slice(0, 3).join(', ') || 'core engineering execution'}.`
      : 'I am excited to contribute where technical depth and product impact both matter.';

    return `${line1} ${line2} ${line3}`.trim();
  }

  private looksLikeNegotiationQuestion(message: string): boolean {
    const lower = String(message || '').toLowerCase();
    return /salary|compensation|offer|counter|negotia|package|equity/.test(lower);
  }

  private isIntroQuestion(message: string): boolean {
    const lower = String(message || '').toLowerCase();
    return /tell me about yourself|introduce yourself|walk me through your resume|background|about your experience/.test(lower);
  }

  private estimateCompetitors(companyName: string): string[] {
    const normalized = companyName.toLowerCase();
    if (normalized.includes('stripe')) return ['Adyen', 'PayPal', 'Block'];
    if (normalized.includes('uber')) return ['Lyft', 'DoorDash', 'Bolt'];
    if (normalized.includes('google')) return ['Microsoft', 'Amazon', 'Meta'];
    if (normalized.includes('openai')) return ['Anthropic', 'Google DeepMind', 'Meta AI'];
    return ['Peer 1', 'Peer 2', 'Peer 3'];
  }

  private round1(n: number): number {
    return Math.round(n * 10) / 10;
  }

  private hydrateState(): void {
    try {
      const maybeState = (this.db as any)?.loadState?.();
      if (!maybeState || typeof maybeState !== 'object') return;

      const state = maybeState as StoredKnowledgeState;
      if (state.schemaVersion && state.schemaVersion > KnowledgeOrchestrator.STATE_SCHEMA_VERSION) {
        console.warn('[KnowledgeOrchestrator] Stored state schema is newer than runtime schema. Skipping hydrate.');
        return;
      }

      this.knowledgeMode = !!state.knowledgeMode;
      this.resumeText = String(state.resumeText || '').slice(0, KnowledgeOrchestrator.MAX_PERSISTED_TEXT_CHARS);
      this.jdText = String(state.jdText || '').slice(0, KnowledgeOrchestrator.MAX_PERSISTED_TEXT_CHARS);
      this.profileData = this.sanitizeProfileData(state.profileData);
      this.negotiationScript = state.negotiationScript || null;
      this.companyDossiers = state.companyDossiers || {};
      this.negotiationTracker.hydrate(state.negotiationState);

      const isLegacyState = !state.schemaVersion || state.schemaVersion < KnowledgeOrchestrator.STATE_SCHEMA_VERSION;
      if (isLegacyState && this.resumeText) {
        const reparsed = this.parseResume(this.resumeText);
        this.applyParsedResume(reparsed, this.profileData.resumePath ?? null);
        this.persistState();
      }
    } catch (error) {
      console.warn('[KnowledgeOrchestrator] Failed to hydrate state:', error);
    }
  }

  private persistState(): void {
    try {
      const state: StoredKnowledgeState = {
        schemaVersion: KnowledgeOrchestrator.STATE_SCHEMA_VERSION,
        knowledgeMode: this.knowledgeMode,
        resumeText: this.resumeText.slice(0, KnowledgeOrchestrator.MAX_PERSISTED_TEXT_CHARS),
        jdText: this.jdText.slice(0, KnowledgeOrchestrator.MAX_PERSISTED_TEXT_CHARS),
        profileData: this.sanitizeProfileData(this.profileData),
        negotiationScript: this.negotiationScript,
        companyDossiers: this.companyDossiers,
        negotiationState: this.negotiationTracker.getState(),
      };
      (this.db as any)?.saveState?.(state);
    } catch (error) {
      console.warn('[KnowledgeOrchestrator] Failed to persist state:', error);
    }
  }

  private sanitizeProfileData(value: any): ProfileData {
    const base = this.createDefaultProfileData();
    if (!value || typeof value !== 'object') return base;

    const skills = Array.isArray(value.skills)
      ? this.dedupeSkillsCaseInsensitive(
          value.skills.map((s: any) => String(s || '').trim()).filter(Boolean).slice(0, 50),
        )
      : base.skills;

    return {
      ...base,
      hasResume: !!value.hasResume,
      hasActiveJD: !!value.hasActiveJD,
      resumePath: value.resumePath ? String(value.resumePath) : null,
      jdPath: value.jdPath ? String(value.jdPath) : null,
      resumeSummary: value.resumeSummary && typeof value.resumeSummary === 'object'
        ? {
            name: value.resumeSummary.name ? String(value.resumeSummary.name) : undefined,
            email: value.resumeSummary.email ? String(value.resumeSummary.email).toLowerCase() : undefined,
            role: value.resumeSummary.role ? String(value.resumeSummary.role) : undefined,
            totalExperienceYears: Number.isFinite(Number(value.resumeSummary.totalExperienceYears))
              ? Number(value.resumeSummary.totalExperienceYears)
              : undefined,
          }
        : null,
      activeJD: value.activeJD && typeof value.activeJD === 'object'
        ? {
            title: String(value.activeJD.title || 'Software Engineer'),
            company: String(value.activeJD.company || 'Target Company'),
            location: String(value.activeJD.location || 'Remote'),
            level: this.normalizeLevel(String(value.activeJD.level || 'mid')),
            technologies: Array.isArray(value.activeJD.technologies)
              ? value.activeJD.technologies.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 20)
              : [],
            requirements: Array.isArray(value.activeJD.requirements)
              ? value.activeJD.requirements.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 20)
              : [],
            keywords: Array.isArray(value.activeJD.keywords)
              ? value.activeJD.keywords.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 30)
              : [],
            compensation_hint: value.activeJD.compensation_hint ? String(value.activeJD.compensation_hint) : undefined,
            min_years_experience: Number.isFinite(Number(value.activeJD.min_years_experience))
              ? Number(value.activeJD.min_years_experience)
              : undefined,
          }
        : null,
      experienceCount: Math.max(0, Math.round(Number(value.experienceCount || 0))),
      projectCount: Math.max(0, Math.round(Number(value.projectCount || 0))),
      nodeCount: Math.max(0, Math.round(Number(value.nodeCount || 0))),
      skills,
      negotiationScript: value.negotiationScript && typeof value.negotiationScript === 'object'
        ? value.negotiationScript as NegotiationScript
        : null,
    };
  }
}
