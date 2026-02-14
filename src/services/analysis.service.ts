export type Message = {
  role: "user" | "assistant" | "system";
  content: string;
};

export interface SessionCheckPayload {
  deployment_id: string;
  messages: Message[];
}

export class WhiteCircleService {
  private static readonly API_URL =
    "https://us.whitecircle.ai/api/session/check";

  constructor(private readonly apiKey: string) {}

  async checkSession(payload: SessionCheckPayload) {
    const response = await fetch(WhiteCircleService.API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "whitecircle-version": "2025-12-01",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `WhiteCircle error ${response.status}: ${errorBody}`
      );
    }

    return response.json();
  }
}