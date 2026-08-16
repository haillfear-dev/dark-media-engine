import { z } from "zod";

const int = (fallback:number) => z.coerce.number().int().positive().catch(fallback);
const envSchema = z.object({
  DATABASE_PATH:z.string().trim().min(1).catch("./data/content-os.db"),
  AI_PROVIDER:z.enum(["disabled","development","openai"]).catch("disabled"),
  OPENAI_API_KEY:z.string().trim().catch(""), OPENAI_MODEL:z.string().trim().min(1).catch("gpt-5-mini"),
  OPENAI_BASE_URL:z.string().url().catch("https://api.openai.com/v1/responses"), OPENAI_TIMEOUT_MS:int(45000), OPENAI_MAX_CONTEXT_CHARS:int(30000),
  ASSET_PROVIDER:z.enum(["disabled","pexels"]).catch("disabled"), PEXELS_API_KEY:z.string().trim().catch(""), ASSET_PROVIDER_TIMEOUT_MS:int(8000),
  CREATOMATE_API_KEY:z.string().trim().catch(""), CREATOMATE_TEMPLATE_ID:z.string().trim().catch(""),
  CREATOMATE_TEMPLATE_CONTRACT:z.string().trim().catch(""), CREATOMATE_VOICE_ID:z.string().trim().catch(""), CREATOMATE_TIMEOUT_MS:int(15000),
});
export type AppConfig=z.infer<typeof envSchema>;
export function loadConfig(env:NodeJS.ProcessEnv=process.env):AppConfig{return envSchema.parse(env)}

export type HealthStatus="OK"|"NOT_CONFIGURED"|"WARNING"|"ERROR";
export type HealthItem={status:HealthStatus;configured:boolean;details:Record<string,string|boolean|number>};
export function configurationHealth(config=loadConfig()):Record<string,HealthItem>{
 const openaiConfigured=config.AI_PROVIDER!=="openai"||Boolean(config.OPENAI_API_KEY);
 const assetConfigured=config.ASSET_PROVIDER==="pexels"&&Boolean(config.PEXELS_API_KEY);
 const contractOk=config.CREATOMATE_TEMPLATE_CONTRACT==="dark-media-composer-v1";
 const creatomateConfigured=Boolean(config.CREATOMATE_API_KEY&&config.CREATOMATE_TEMPLATE_ID);
 return {
  DATABASE:{status:config.DATABASE_PATH?"OK":"ERROR",configured:Boolean(config.DATABASE_PATH),details:{pathConfigured:Boolean(config.DATABASE_PATH)}},
  OPENAI:{status:config.AI_PROVIDER==="disabled"?"NOT_CONFIGURED":openaiConfigured?"OK":"ERROR",configured:openaiConfigured,details:{provider:config.AI_PROVIDER,model:config.OPENAI_MODEL,timeoutMs:config.OPENAI_TIMEOUT_MS}},
  ASSET_PROVIDER:{status:assetConfigured?"OK":config.ASSET_PROVIDER==="disabled"?"NOT_CONFIGURED":"ERROR",configured:assetConfigured,details:{provider:config.ASSET_PROVIDER}},
  CREATOMATE:{status:creatomateConfigured?"OK":"NOT_CONFIGURED",configured:creatomateConfigured,details:{configured:creatomateConfigured,timeoutMs:config.CREATOMATE_TIMEOUT_MS}},
  CREATOMATE_TEMPLATE:{status:contractOk&&Boolean(config.CREATOMATE_TEMPLATE_ID)?"OK":config.CREATOMATE_TEMPLATE_CONTRACT&&!contractOk?"ERROR":"NOT_CONFIGURED",configured:contractOk&&Boolean(config.CREATOMATE_TEMPLATE_ID),details:{templateConfigured:Boolean(config.CREATOMATE_TEMPLATE_ID),contract:config.CREATOMATE_TEMPLATE_CONTRACT||"not configured"}},
  ELEVENLABS_VOICE:{status:config.CREATOMATE_VOICE_ID?"OK":"NOT_CONFIGURED",configured:Boolean(config.CREATOMATE_VOICE_ID),details:{provider:"Creatomate / ElevenLabs",voiceConfigured:Boolean(config.CREATOMATE_VOICE_ID)}},
 };
}
