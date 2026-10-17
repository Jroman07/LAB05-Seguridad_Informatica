const {defineConfig} = require('@playwright/test');
module.exports = defineConfig({
  testDir:'./tests/e2e', fullyParallel:false, workers:1,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:3000',viewport:{width:1280,height:900},trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{browserName:'chromium',channel:process.env.LAB_BROWSER_CHANNEL || 'msedge'}}],
  webServer:{command:'npm start',url:'http://127.0.0.1:3000',reuseExistingServer:!process.env.CI}
});
