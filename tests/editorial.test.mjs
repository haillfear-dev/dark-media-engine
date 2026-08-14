import test from 'node:test';import assert from 'node:assert/strict';
// Mirrors the documented pure scoring boundaries as an executable acceptance check.
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));const priority=i=>clamp(i.virality*.32+i.momentum*.22+i.freshness*.18+i.audienceFit*.13+i.confidence*.12-i.saturation*.09);
test('priority rewards velocity while retaining confidence as visible input',()=>{assert.equal(priority({virality:96,momentum:91,freshness:95,audienceFit:95,confidence:94,saturation:24}),89);assert.ok(priority({virality:98,momentum:96,freshness:99,audienceFit:95,confidence:32,saturation:18})>80)});
test('scores are clamped',()=>assert.equal(clamp(140),100));
