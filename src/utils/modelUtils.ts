export const STANDARD_CLOUD_MODELS: Record<string, {
    hasKeyCheck: (creds: any) => boolean;
    ids: string[];
    names: string[];
    descs: string[];
    pmKey: 'geminiPreferredModel' | 'openaiPreferredModel' | 'claudePreferredModel' | 'groqPreferredModel';
}> = {
    gemini: {
        // HARDCODED: always show Gemini (proxy provides it)
        hasKeyCheck: () => true,
        ids: ['gemini-3.1-flash-lite', 'gemini-3.1-pro-low'],
        names: ['Gemini 3.1 Flash', 'Gemini 3.1 Pro'],
        descs: ['Fastest • Multimodal', 'Reasoning • High Quality'],
        pmKey: 'geminiPreferredModel'
    },
    openai: {
        // HARDCODED: always show OpenAI (proxy provides it)
        hasKeyCheck: () => true,
        ids: ['gpt-5.4'],
        names: ['GPT 5.4'],
        descs: ['OpenAI'],
        pmKey: 'openaiPreferredModel'
    },
    claude: {
        // HARDCODED: always show Claude (proxy provides it)
        hasKeyCheck: () => true,
        ids: ['claude-opus-4-7', 'claude-sonnet-4-5-20250929'],
        names: ['Claude Opus 4.7', 'Claude Sonnet 4.5'],
        descs: ['Anthropic', 'Anthropic'],
        pmKey: 'claudePreferredModel'
    },
    groq: {
        // HARDCODED: always show Groq (proxy provides it)
        hasKeyCheck: () => true,
        ids: ['llama-3.3-70b-versatile'],
        names: ['Groq Llama 3.3'],
        descs: ['Ultra Fast'],
        pmKey: 'groqPreferredModel'
    },
};

export const prettifyModelId = (id: string): string => {
    if (!id) return '';
    return id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};
