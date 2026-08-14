const API_BASE = "https://api.creatomate.com/v2";

export type CreatomateRenderStatus = "planned" | "waiting" | "transcribing" | "rendering" | "succeeded" | "failed" | string;

export type CreatomateRender = {
  id: string;
  status: CreatomateRenderStatus;
  url?: string;
  errorMessage?: string;
};

type CreateRenderInput = {
  title: string;
  secondaryText: string;
  videoUrl: string;
};

function configuration() {
  const apiKey = process.env.CREATOMATE_API_KEY;
  const templateId = process.env.CREATOMATE_TEMPLATE_ID;
  if (!apiKey) throw new Error("CREATOMATE_API_KEY não configurada");
  if (!templateId) throw new Error("CREATOMATE_TEMPLATE_ID não configurado");
  return { apiKey, templateId };
}

function mapRender(payload: Record<string, unknown>): CreatomateRender {
  return {
    id: String(payload.id ?? ""),
    status: String(payload.status ?? "unknown"),
    url: typeof payload.url === "string" ? payload.url : undefined,
    errorMessage: typeof payload.error_message === "string" ? payload.error_message : undefined,
  };
}

async function creatomateFetch(path: string, init: RequestInit) {
  const { apiKey } = configuration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
    const text = await response.text();
    if (!response.ok) {
      const safeMessage = response.status === 401 || response.status === 403
        ? "Creatomate recusou as credenciais."
        : response.status === 429
          ? "Limite temporário do Creatomate atingido."
          : `Creatomate retornou HTTP ${response.status}.`;
      throw new Error(safeMessage);
    }
    return text ? JSON.parse(text) : {};
  } finally {
    clearTimeout(timeout);
  }
}

export async function createCreatomateRender(input: CreateRenderInput): Promise<CreatomateRender> {
  const { templateId } = configuration();
  if (!input.videoUrl) throw new Error("CREATOMATE_TEST_VIDEO_URL não configurada");
  const payload = await creatomateFetch("/renders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template_id: templateId,
      modifications: {
        "Video.source": input.videoUrl,
        "Text-1.text": input.title,
        "Text-2.text": input.secondaryText,
      },
    }),
  });
  const row = Array.isArray(payload) ? payload[0] : payload;
  if (!row || typeof row !== "object") throw new Error("Creatomate não retornou um render válido.");
  return mapRender(row as Record<string, unknown>);
}

export async function getCreatomateRender(renderId: string): Promise<CreatomateRender> {
  if (!renderId) throw new Error("Render ID ausente.");
  const payload = await creatomateFetch(`/renders/${encodeURIComponent(renderId)}`, { method: "GET" });
  if (!payload || typeof payload !== "object") throw new Error("Creatomate não retornou o status do render.");
  return mapRender(payload as Record<string, unknown>);
}
