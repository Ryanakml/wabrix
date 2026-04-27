const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /forget\s+(all\s+)?rules/gi,
  /reveal\s+(the\s+)?system\s+prompt/gi,
  /bocorkan?\s+prompt\s+sistem/gi,
  /abaikan\s+instruksi\s+sebelumnya/gi,
  /lupakan\s+semua\s+aturan/gi,
];

export type GuardrailResult = {
  flagged: boolean;
  category: "prompt_injection" | "clean";
  confidence: number;
  sanitizedText: string;
  matches: string[];
};

export function applyPromptInjectionGuard(input: string): GuardrailResult {
  const matches = PROMPT_INJECTION_PATTERNS.flatMap((pattern) =>
    [...input.matchAll(pattern)].map((match) => match[0]),
  );

  if (matches.length === 0) {
    return {
      flagged: false,
      category: "clean",
      confidence: 0.05,
      sanitizedText: input,
      matches: [],
    };
  }

  let sanitizedText = input;
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    sanitizedText = sanitizedText.replace(pattern, "[filtered instruction]");
  }

  return {
    flagged: true,
    category: "prompt_injection",
    confidence: 0.92,
    sanitizedText,
    matches,
  };
}

export function detectLanguage(text: string) {
  const normalized = text.toLowerCase();

  if (
    /\b(saya|anda|tolong|berapa|produk|pesanan|bisa|tidak|halo|selamat)\b/.test(
      normalized,
    )
  ) {
    return "id";
  }

  return "en";
}
