#!/usr/bin/env node
// Applies lobsterbs patch ops to the @playwright/mcp server bundle at Docker build time.
// Fails the build loudly if the upstream bundle drifted.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const IMAGE_VERSION = '0.0.82';
const PLAYWRIGHT_CORE_VERSION = '1.64.0-alpha-1789764292000';
const BUNDLE_LENGTH = 3551420;

function fail(message) {
  console.error('apply-patches: FAILED: ' + message);
  process.exit(1);
}

const appPkg = JSON.parse(fs.readFileSync('/app/package.json', 'utf8'));
const corePkg = JSON.parse(fs.readFileSync('/app/node_modules/playwright-core/package.json', 'utf8'));
if (appPkg.version !== IMAGE_VERSION)
  fail('@playwright/mcp version is ' + appPkg.version + ', expected ' + IMAGE_VERSION + '. Re-pin the Dockerfile FROM and update patches.json.');
if (corePkg.version !== PLAYWRIGHT_CORE_VERSION)
  fail('playwright-core version is ' + corePkg.version + ', expected ' + PLAYWRIGHT_CORE_VERSION + '.');

const bundlePath = '/app/node_modules/playwright-core/lib/coreBundle.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');
if (bundle.length !== BUNDLE_LENGTH)
  fail('coreBundle.js length is ' + bundle.length + ', expected ' + BUNDLE_LENGTH + '.');

const patches = JSON.parse(fs.readFileSync(path.join(__dirname, 'patches.json'), 'utf8'));
for (const op of patches.ops) {
  const parts = bundle.split(op.old);
  if (parts.length !== op.count + 1)
    fail('op ' + op.name + ': expected ' + op.count + ' occurrence(s), found ' + (parts.length - 1) + '.');
  bundle = parts.join(op.new);
  console.log('apply-patches: ' + op.name + ' OK');
}
bundle += '\n// lobsterbs-patches-v1 applied\n';
fs.writeFileSync(bundlePath, bundle);
execFileSync(process.execPath, ['--check', bundlePath], { stdio: 'inherit' });
console.log('apply-patches: OK, ' + patches.ops.length + ' patches applied (new length ' + bundle.length + ')');
