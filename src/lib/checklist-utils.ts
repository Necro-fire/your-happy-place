// Encode/decode checklist selections within the problema field
const CHECKLIST_PREFIX = '{{CHECKLIST:';
const CHECKLIST_SUFFIX = '}}';

export function encodeProblema(checklist: string[], freeText: string): string {
  const text = freeText.trim();
  if (checklist.length === 0) return text;
  return `${CHECKLIST_PREFIX}${JSON.stringify(checklist)}${CHECKLIST_SUFFIX}\n${text}`;
}

export function decodeProblema(problema: string): { checklist: string[]; freeText: string } {
  if (!problema || !problema.startsWith(CHECKLIST_PREFIX)) {
    return { checklist: [], freeText: problema || '' };
  }
  const endIdx = problema.indexOf(CHECKLIST_SUFFIX);
  if (endIdx === -1) return { checklist: [], freeText: problema };
  const jsonStr = problema.slice(CHECKLIST_PREFIX.length, endIdx);
  const rest = problema.slice(endIdx + CHECKLIST_SUFFIX.length).replace(/^\n/, '');
  try {
    return { checklist: JSON.parse(jsonStr), freeText: rest };
  } catch {
    return { checklist: [], freeText: problema };
  }
}

// Generate random alphanumeric code
export function generateCode(prefix: string, length = 5): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate client code from client name (deterministic hash-based for consistency)
export function generateClientCode(clientName: string, existingCodes: Map<string, string>): string {
  const normalized = clientName.trim().toLowerCase();
  if (existingCodes.has(normalized)) return existingCodes.get(normalized)!;
  return generateCode('CL-');
}
