#!/usr/bin/env node
// publish.mjs — cross-post the GEO article to Dev.to / Hashnode / Medium.
// Usage:
//   node publish.mjs devto    (needs env DEVTO_KEY)
//   node publish.mjs hashnode (needs env HASHNODE_TOKEN)
//   node publish.mjs medium   (needs env MEDIUM_TOKEN)
// Reads ../cross-post/devto-hashnode-medium.md, parses the per-platform front-matter
// block (HTML comment at top), strips it, and POSTs the body.
//
// SECURITY: tokens come from env vars, never hardcoded. Do NOT commit tokens.
// The draft file contains NO secrets.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MD = join(__dirname, 'devto-hashnode-medium.md');

function fail(msg) {
  console.error('ERROR:', msg);
  process.exit(1);
}

function parse(md) {
  // front-matter is the first <!-- ... --> block
  const fmMatch = md.match(/^<!--([\s\S]*?)-->/);
  if (!fmMatch) fail('no HTML-comment front-matter found');
  const fm = fmMatch[1];
  const body = md.slice(md.indexOf('-->') + 3).trim();

  const get = (label) => {
    const m = fm.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : '';
  };
  const getList = (label) => {
    const raw = get(label);
    return raw ? raw.split(',').map((s) => s.trim()) : [];
  };
  return { body, fm, get, getList };
}

async function main() {
  const platform = process.argv[2];
  if (!['devto', 'hashnode', 'medium'].includes(platform)) {
    fail('usage: node publish.mjs <devto|hashnode|medium>');
  }
  const { body, get, getList } = parse(readFileSync(MD, 'utf8'));

  if (platform === 'devto') {
    const key = process.env.DEVTO_KEY;
    if (!key) fail('set env DEVTO_KEY');
    const payload = {
      article: {
        title: get('title'),
        body_markdown: body,
        tags: getList('tags'),
        canonical_url: get('canonical_url'),
        series: get('series') || undefined,
        published: true,
      },
    };
    const res = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: { 'api-key': key, accept: 'application/vnd.forem.api-v1+json', 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    console.log('dev.to status', res.status, JSON.stringify(out).slice(0, 400));
    if (!res.ok) fail('dev.to publish failed');
    console.log('OK dev.to ->', out.url || '(see response above)');
  }

  if (platform === 'hashnode') {
    const token = process.env.HASHNODE_TOKEN;
    if (!token) fail('set env HASHNODE_TOKEN');
    const HN = 'https://gql-beta.hashnode.com/';
    const gql = async (query, variables) => {
      const r = await fetch(HN, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      const j = await r.json();
      if (j.errors) fail('hashnode graphql error: ' + JSON.stringify(j.errors));
      return j.data;
    };
    // resolve publication id: prefer explicit host, else first publication on token
    let publicationId;
    const host = process.env.HASHNODE_PUB_HOST;
    if (host) {
      const r = await gql(`query($h:String!){ publication(host:$h){ id } }`, { h: host });
      publicationId = r.publication?.id;
    } else {
      const r = await gql(`{ me { publications(first: 1) { edges { node { id } } } } }`, {});
      publicationId = r.me?.publications?.edges?.[0]?.node?.id;
    }
    if (!publicationId) fail('no Hashnode publication found — create one (Pro plan) and set HASHNODE_PUB_HOST=<your-blog-host>');
    // parse Hashnode tags (JSON array form) safely
    const rawTags = get('tags');
    let tagsArr;
    try { tagsArr = JSON.parse(rawTags); } catch { tagsArr = rawTags.split(',').map((s) => s.trim()); }
    const slugify = (s) => s.toLowerCase().replace(/\s+/g, '-');
    const tags = tagsArr.map((t) => ({ name: t, slug: slugify(t) }));
    // two-step publish: createDraft -> publishDraft
    const draft = await gql(
      `mutation($i: CreateDraftInput!) { createDraft(input: $i) { draft { id } } }`,
      { i: { title: get('title'), contentMarkdown: body, publicationId, tags } }
    );
    const draftId = draft.createDraft.draft.id;
    const pub = await gql(
      `mutation($i: PublishDraftInput!) { publishDraft(input: $i) { post { url } } }`,
      { i: { draftId } }
    );
    console.log('OK hashnode ->', pub.publishDraft.post.url);
  }

  if (platform === 'medium') {
    const token = process.env.MEDIUM_TOKEN;
    if (!token) fail('set env MEDIUM_TOKEN');
    const headers = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const meRes = await fetch('https://api.medium.com/v1/me', { headers });
    const me = await meRes.json();
    if (!me.data?.id) fail('medium /me failed: ' + JSON.stringify(me));
    const res = await fetch(`https://api.medium.com/v1/users/${me.data.id}/posts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: get('title'),
        contentFormat: 'markdown',
        content: body,
        canonicalUrl: get('canonical_url'),
        publishStatus: 'draft', // Medium: draft first, you review then publish
      }),
    });
    const out = await res.json();
    console.log('medium status', res.status, JSON.stringify(out).slice(0, 400));
    if (!res.ok) fail('medium publish failed');
    console.log('OK medium draft ->', out.data?.url || '(review in Medium)');
  }
}

main().catch((e) => fail(e.message));
