#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/lib/messages/actions.ts');
const content = fs.readFileSync(filePath, 'utf8');

function fail(msg) {
  console.error('verify-getUserConversations: FAIL -', msg);
  process.exit(1);
}

if (!/export async function getUserConversations\(/.test(content)) {
  fail('Could not find getUserConversations function in actions.ts');
}

// Ensure we still query the messages table for latest rows (protects against
// future changes that would rely solely on conversations.last_message fields)
const usesMessagesQuery = /\.from\(\s*["']messages["']\s*\)/.test(content);
if (!usesMessagesQuery) {
  fail('getUserConversations does not query the messages table anymore. This may hide conversations when denormalized last_message fields are empty.');
}

console.log('verify-getUserConversations: OK - messages query present');
process.exit(0);
