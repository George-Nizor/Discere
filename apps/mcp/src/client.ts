export class DiscereApiClient {
  constructor(private readonly baseUrl = "http://127.0.0.1:4317") {}
  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
    const body = await response.json() as unknown;
    if (!response.ok) throw new Error(`Discere API returned ${response.status}: ${JSON.stringify(body)}`);
    return body;
  }
  async invoke(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case "discere_get_home": return this.request("/api/home");
      case "discere_get_current_lesson": return this.request("/api/lessons/current");
      case "discere_submit_answer": return this.request("/api/attempts", { method: "POST", body: JSON.stringify(input) });
      case "discere_request_hint": return this.request(`/api/attempts/${String(input["attemptId"])}/hints`, { method: "POST", body: "{}" });
      case "discere_start_answer_reveal": return this.request(`/api/attempts/${String(input["attemptId"])}/reveal/start`, { method: "POST", body: JSON.stringify({ reason: input["reason"] }) });
      case "discere_confirm_answer_reveal": return this.request(`/api/attempts/${String(input["attemptId"])}/reveal/confirm`, { method: "POST", body: JSON.stringify({ token: input["token"], confirmation: input["confirmation"] }) });
      case "discere_lint_learning_text": return this.request("/api/writing/lint", { method: "POST", body: JSON.stringify(input) });
      case "discere_create_image_prompt": return this.request("/api/visuals/image-prompt", { method: "POST", body: JSON.stringify(input) });
      default: throw new Error(`Unknown Discere tool '${name}'.`);
    }
  }
}
