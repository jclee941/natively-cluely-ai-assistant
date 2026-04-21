export class TavilySearchProvider {
  private apiKey: string;
  public quotaExhausted: boolean = false;
  private static readonly REQUEST_TIMEOUT_MS = 10_000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async search(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const safeQuery = String(query || '').trim();
    if (!safeQuery) return [];

    this.quotaExhausted = false;

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      signal: AbortSignal.timeout(TavilySearchProvider.REQUEST_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: safeQuery,
        search_depth: 'basic',
        max_results: 5,
        include_answer: true,
      }),
    });

    if (response.status === 429) {
      this.quotaExhausted = true;
      return [];
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Tavily search failed (${response.status}): ${text || response.statusText}`);
    }

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    const results = Array.isArray(data?.results) ? data.results : [];

    return results.map((r: any) => ({
      title: String(r?.title ?? 'Untitled'),
      url: String(r?.url ?? ''),
      snippet: String(r?.content ?? r?.snippet ?? '').slice(0, 1200),
    }));
  }
}
