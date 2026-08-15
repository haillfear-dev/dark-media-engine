import { runSourceIngestion } from "../src/ingestion/job.ts";
const summaries=await runSourceIngestion({force:process.argv.includes("--force")});
console.log(JSON.stringify({completedAt:new Date().toISOString(),sources:summaries},null,2));
if(summaries.length===0)console.log("No sources were due. Use: npm run ingest -- --force");
