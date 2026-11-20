export interface AIChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AIChatResponse {
  text: string;
  suggestedTabs?: { tab: string; subTab?: string; label: string }[];
}

export const geminiService = {
  async chatWithAssistant(
    messages: AIChatMessage[],
    activeTab?: string,
    token?: string | null
  ): Promise<AIChatResponse> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ messages, activeTab })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'AI Guide request failed.');
    }
    return data;
  },

  async searchCourtDocket(state: string, query: string) {
    const res = await fetch('/api/ai/docket-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, query })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Court docket search failed.');
    }
    return data;
  },

  async estimateSentence(crimeDetails: string) {
    const res = await fetch('/api/ai/estimate-sentence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crimeDetails })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Sentence estimation failed.');
    }
    return data.text || '';
  },

  async getSelfHelpMaterial(topic: string) {
    const res = await fetch('/api/ai/self-help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Self-help guide generation failed.');
    }
    return data.text || '';
  }
};
