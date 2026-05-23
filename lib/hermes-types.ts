/**
 * lib/hermes-types.ts — Types and constants shared between client and server.
 *
 * NO Node.js imports (fs, path, os) — safe for browser bundles.
 */
export interface ProviderInfo {
  value: string;
  label: string;
  description: string;
  envKey: string;
  defaultBaseUrl?: string;
  defaultModel?: string;
}

export const PROVIDERS: ProviderInfo[] = [
  { value: "openrouter", label: "OpenRouter", description: "Roteador multi-modelo", envKey: "OPENROUTER_API_KEY", defaultBaseUrl: "https://openrouter.ai/api/v1", defaultModel: "deepseek/deepseek-v4-pro" },
  { value: "anthropic", label: "Anthropic", description: "Claude via API oficial", envKey: "ANTHROPIC_API_KEY", defaultBaseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-sonnet-4-20250514" },
  { value: "openai", label: "OpenAI", description: "GPT-4o, o1, etc.", envKey: "OPENAI_API_KEY", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o" },
  { value: "deepseek", label: "DeepSeek", description: "DeepSeek V3, R1", envKey: "DEEPSEEK_API_KEY", defaultBaseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat" },
  { value: "xai", label: "xAI / Grok", description: "Grok via API oficial", envKey: "XAI_API_KEY", defaultBaseUrl: "https://api.x.ai/v1", defaultModel: "grok-3" },
  { value: "groq", label: "Groq", description: "Inferência ultrarrápida", envKey: "GROQ_API_KEY", defaultBaseUrl: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile" },
  { value: "google", label: "Google Gemini", description: "Modelos Gemini", envKey: "GOOGLE_API_KEY", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-2.5-pro-preview-03-25" },
  { value: "ollama", label: "Ollama (local)", description: "Modelos rodando localmente", envKey: "", defaultBaseUrl: "http://localhost:11434/v1", defaultModel: "llama3.1" },
  { value: "openai_compatible", label: "OpenAI Compatível", description: "Qualquer endpoint compatível", envKey: "OPENAI_COMPATIBLE_API_KEY", defaultBaseUrl: "", defaultModel: "" },
];

export const PROVIDER_MODELS: Record<string, string[]> = {
  openrouter: [
    "deepseek/deepseek-v4-pro", "deepseek/deepseek-r1", "deepseek/deepseek-chat",
    "anthropic/claude-sonnet-4", "anthropic/claude-opus-4", "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o", "openai/gpt-4.1", "openai/o3-mini", "openai/o4-mini",
    "google/gemini-2.5-pro", "google/gemini-2.5-flash",
    "meta-llama/llama-4-maverick", "meta-llama/llama-4-scout",
    "mistral/mistral-large", "mistral/mistral-medium", "x-ai/grok-3", "qwen/qwen-3",
  ],
  anthropic: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-3.5-sonnet-20241022", "claude-3.5-haiku-20241022", "claude-3-opus-20240229"],
  openai: ["gpt-4o", "gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini", "o3-mini", "o4-mini", "o1", "o1-mini", "gpt-4-turbo"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  xai: ["grok-3", "grok-3-mini", "grok-2"],
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-4-maverick-17b", "mixtral-8x7b-32768", "gemma2-9b-it", "deepseek-r1-distill-llama-70b", "qwen-2.5-32b"],
  google: ["gemini-2.5-pro-preview-03-25", "gemini-2.5-flash-preview-04-17", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  ollama: ["llama3.1", "llama3.1:70b", "llama3.2", "mistral", "mixtral:8x7b", "codellama", "gemma2", "qwen2.5", "deepseek-r1"],
  openai_compatible: [],
};

export type InstanceTag =
  | "main"
  | "code"
  | "analysis"
  | "fast"
  | "vision"
  | "delegation"
  | "backup";

export const ALL_TAGS: { value: InstanceTag; label: string; description: string; color: string }[] = [
  { value: "main", label: "Main Agent", description: "Agente principal da conversa", color: "emerald" },
  { value: "code", label: "Code / Debug", description: "Melhor em código e debugging", color: "blue" },
  { value: "analysis", label: "Analysis", description: "Melhor em análise e reasoning", color: "purple" },
  { value: "fast", label: "Fast / Cheap", description: "Barato e rápido (compressão)", color: "amber" },
  { value: "vision", label: "Vision", description: "Melhor com imagens e OCR", color: "pink" },
  { value: "delegation", label: "Delegation", description: "Subagentes e tarefas delegadas", color: "cyan" },
  { value: "backup", label: "Backup", description: "Fallback reserva", color: "slate" },
];

export interface LlmInstance {
  id: string;
  name: string;
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
  tags: InstanceTag[];
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InstanceRegistry {
  version: 1;
  instances: LlmInstance[];
  strategy: "priority" | "round-robin" | "random";
  fallbackEnabled: boolean;
}
