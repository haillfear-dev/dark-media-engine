export const SAFE_ERROR_MESSAGES:Record<string,string>={
 AI_NOT_CONFIGURED:"O provider de IA não está configurado.", OPENAI_NOT_CONFIGURED:"A OpenAI não está configurada.",
 OPENAI_TIMEOUT:"A OpenAI excedeu o tempo limite.", OPENAI_NETWORK_ERROR:"Não foi possível comunicar com a OpenAI.",
 OPENAI_REQUEST_FAILED:"A OpenAI recusou ou não concluiu a solicitação.", OPENAI_INVALID_JSON:"A OpenAI retornou uma resposta inválida.",
 OPENAI_SCHEMA_INVALID:"A resposta da IA não passou pela validação.", AI_SOURCE_REFERENCE_INVALID:"A IA retornou referências de fonte inválidas.",
};
export function safeErrorCode(error:unknown){const code=error&&typeof error==="object"&&"code" in error?String(error.code):error instanceof Error?error.message:"UNKNOWN_ERROR";return /^[A-Z0-9_]+$/.test(code)?code:"UNKNOWN_ERROR"}
export function safeErrorMessage(code:string){return SAFE_ERROR_MESSAGES[code]??"O processamento foi encerrado de forma controlada."}
