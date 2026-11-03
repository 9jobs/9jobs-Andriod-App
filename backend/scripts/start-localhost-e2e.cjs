const {localConfig}=require('./localhost-e2e-config.cjs');const {config}=localConfig();Object.assign(process.env,config);
require('ts-node/register');
// Initialize additive local-only metadata before accepting authenticated requests.
(async()=>{
 const {sheetDb}=require('../src/services/sheetStore');
 await require('../src/services/automaticSheetSync').initializeAutomaticSync(sheetDb());
 require('../src/server');
 require('./refresh-approved-local-clients.cjs').startApprovedLocalRefresh();
})().catch(()=>{console.error('Isolated localhost startup failed; no production fallback permitted');process.exitCode=1;});
