// Supabase Edge Function: translate
// Deploy:  supabase functions deploy translate --no-verify-jwt
// Secret:  supabase secrets set DEEPL_API_KEY=your-key   (free keys end in ":fx")
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const KEY = Deno.env.get('DEEPL_API_KEY') ?? '';
const API = KEY.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const CONTEXT = 'Text from a Christian prayer book published by God’s Remnant Assembly. Prayers address God reverently. Keep Bible references, numbers and proper names unchanged.';

async function sha(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { texts, lang } = await req.json();
    if (!['fr', 'es'].includes(lang) || !Array.isArray(texts)) return json({ error: 'Send { texts: string[], lang: "fr" | "es" }' }, 400);
    const src: string[] = texts.slice(0, 200).map((t: unknown) => String(t ?? '').slice(0, 5000));
    const hashes = await Promise.all(src.map(sha));
    const found = new Map<string, string>();
    const uniq = [...new Set(hashes)];
    for (let i = 0; i < uniq.length; i += 100) {
      const { data, error } = await db.from('translations').select('src_hash,out').eq('lang', lang).in('src_hash', uniq.slice(i, i + 100));
      if (error) throw error;
      (data ?? []).forEach((r) => found.set(r.src_hash, r.out));
    }
    const miss: number[] = []; const seen = new Set<string>();
    hashes.forEach((h, i) => { if (!found.has(h) && !seen.has(h) && src[i].trim()) { seen.add(h); miss.push(i); } });
    if (miss.length && !KEY) throw new Error('DEEPL_API_KEY is not set');
    for (let i = 0; i < miss.length; i += 50) {
      const batch = miss.slice(i, i + 50);
      const r = await fetch(API + '/v2/translate', {
        method: 'POST',
        headers: { Authorization: 'DeepL-Auth-Key ' + KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: batch.map((j) => src[j]), source_lang: 'EN', target_lang: lang.toUpperCase(), context: CONTEXT, preserve_formatting: true }),
      });
      if (!r.ok) throw new Error('DeepL ' + r.status + ' ' + (await r.text()));
      const j = await r.json();
      const rows = batch.map((k, n) => ({ src_hash: hashes[k], lang, src: src[k], out: j.translations[n].text as string }));
      rows.forEach((x) => found.set(x.src_hash, x.out));
      await db.from('translations').upsert(rows, { onConflict: 'src_hash,lang', ignoreDuplicates: true });
    }
    return json({ out: hashes.map((h, i) => found.get(h) ?? (src[i].trim() ? null : src[i])) });
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
