// Tiny dev-only proxy that fetches https://t.me/<path> and re-serves it
// without X-Frame-Options / frame-ancestors so it can be embedded in the
// preview iframe. NOT for production.
//
// Usage:  node preview/tg-proxy.js   (listens on http://127.0.0.1:5501)
const http  = require('http');
const https = require('https');

const PORT = 5501;
const HOST = '127.0.0.1';
const UPSTREAM_HOST = 't.me';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function proxy(req, res) {
  if (req.url.startsWith('/api/files')) return apiFiles(req, res);
  if (req.url.startsWith('/api/posts')) return apiPosts(req, res);
  const upstreamUrl = `https://${UPSTREAM_HOST}${req.url}`;
  const upstreamReq = https.request(upstreamUrl, {
    method: req.method,
    headers: {
      'User-Agent': UA,
      'Accept': req.headers['accept'] || 'text/html,*/*;q=0.8',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.9'
    }
  }, upstreamRes => {
    const status = upstreamRes.statusCode || 502;

    // Follow simple redirects so /smart_tally -> /s/smart_tally works.
    if ([301, 302, 303, 307, 308].includes(status) && upstreamRes.headers.location) {
      const loc = upstreamRes.headers.location;
      const localLoc = loc.startsWith('http')
        ? loc.replace(/^https?:\/\/t\.me/, '')
        : loc;
      res.writeHead(302, { Location: localLoc });
      res.end();
      return;
    }

    const headers = { ...upstreamRes.headers };
    delete headers['x-frame-options'];
    delete headers['content-security-policy'];
    delete headers['content-security-policy-report-only'];
    delete headers['strict-transport-security'];
    delete headers['content-encoding'];
    delete headers['content-length'];
    headers['access-control-allow-origin'] = '*';

    const chunks = [];
    upstreamRes.on('data', c => chunks.push(c));
    upstreamRes.on('end', () => {
      let body = Buffer.concat(chunks);
      const ctype = (upstreamRes.headers['content-type'] || '').toLowerCase();
      if (ctype.includes('text/html')) {
        // gzip/br: with no Accept-Encoding sent, upstream should reply plain.
        let html = body.toString('utf8');
        // Inject <base> so relative URLs resolve back to t.me via CDN absolute paths.
        html = html.replace(/<head([^>]*)>/i, `<head$1><base href="https://t.me/">`);
        body = Buffer.from(html, 'utf8');
        headers['content-type'] = 'text/html; charset=utf-8';
      }
      res.writeHead(status, headers);
      res.end(body);
    });
  });

  upstreamReq.on('error', err => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  });
  req.pipe(upstreamReq, { end: true });
}

// Scrape https://t.me/s/<channel> and return a JSON list of file / photo /
// video attachments posted to that public channel. For channels where /s/
// is not served (Telegram returns the join page instead of the message
// history), fall back to walking individual post pages /{channel}/{id}.
async function apiFiles(req, res) {
  const u = new URL(req.url, 'http://x');
  const channel = (u.searchParams.get('channel') || '').replace(/[^a-z0-9_]/gi, '');
  const maxId = Math.min(parseInt(u.searchParams.get('max') || '30', 10) || 30, 200);
  if (!channel) {
    res.writeHead(400, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    return res.end(JSON.stringify({ error: 'channel query param required' }));
  }
  try {
    const sHtml = await fetchUpstream(`/s/${channel}`);
    let items = parseChannelFiles(sHtml, channel);
    let source = 's-preview';
    if (items.length === 0) {
      const posts = await fetchPosts(channel, maxId);
      items = posts.flatMap(p => parseChannelFiles(p.html, channel));
      source = 'per-post';
    }
    res.writeHead(200, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    });
    res.end(JSON.stringify({ channel, count: items.length, source, items }));
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// List recent posts in a public channel as JSON, including text, date and
// media flags. Used by the inbox page to render a feed of telegram-widget
// embeds when the /s/ channel preview is unavailable.
async function apiPosts(req, res) {
  const u = new URL(req.url, 'http://x');
  const channel = (u.searchParams.get('channel') || '').replace(/[^a-z0-9_]/gi, '');
  const maxId = Math.min(parseInt(u.searchParams.get('max') || '30', 10) || 30, 200);
  if (!channel) {
    res.writeHead(400, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    return res.end(JSON.stringify({ error: 'channel query param required' }));
  }
  try {
    const posts = await fetchPosts(channel, maxId);
    const items = posts.map(p => parsePostMeta(p.html, channel, p.id))
      .filter(Boolean)
      .sort((a, b) => b.id - a.id);
    res.writeHead(200, {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    });
    res.end(JSON.stringify({ channel, count: items.length, items }));
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

function fetchUpstream(path) {
  return new Promise((resolve, reject) => {
    https.get(`https://${UPSTREAM_HOST}${path}`, { headers: { 'User-Agent': UA } }, r => {
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject);
  });
}

async function fetchPosts(channel, maxId) {
  // Probe ids in parallel batches; keep only those that returned a real post
  // (the embed page for non-existent ids returns the small join landing).
  const out = [];
  const batchSize = 8;
  for (let start = 1; start <= maxId; start += batchSize) {
    const ids = [];
    for (let i = start; i < start + batchSize && i <= maxId; i++) ids.push(i);
    const htmls = await Promise.all(ids.map(id => fetchUpstream(`/${channel}/${id}?embed=1`).catch(() => '')));
    htmls.forEach((html, idx) => {
      const id = ids[idx];
      if (html && html.includes(`data-post="${channel}/${id}"`)) {
        out.push({ id, html });
      }
    });
  }
  return out;
}

function parsePostMeta(html, channel, id) {
  if (!html) return null;
  const dateMatch = html.match(/<time[^>]+datetime="([^"]+)"/);
  const textMatch = html.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<div class="tgme_widget_message_footer/);
  const text = textMatch ? stripTags(textMatch[1]).trim().slice(0, 600) : '';
  return {
    id,
    channel,
    date: dateMatch ? dateMatch[1] : null,
    text,
    hasPhoto: /tgme_widget_message_photo_wrap/.test(html),
    hasVideo: /tgme_widget_message_video/.test(html),
    hasDocument: /tgme_widget_message_document/.test(html),
    postUrl: `https://t.me/${channel}/${id}`,
    embedUrl: `https://t.me/${channel}/${id}?embed=1`
  };
}

function parseChannelFiles(html, channel) {
  const out = [];
  const msgRe = /<div class="tgme_widget_message[^"]*"[^>]*data-post="([^"]+)"[\s\S]*?(?=<div class="tgme_widget_message[^"]*"[^>]*data-post="|<\/section)/g;
  let m;
  while ((m = msgRe.exec(html)) !== null) {
    const block = m[0];
    const dataPost = m[1];
    const postNum  = dataPost.split('/')[1] || '';
    const dateMatch = block.match(/<time[^>]+datetime="([^"]+)"/);
    const date = dateMatch ? dateMatch[1] : null;
    const postUrl = `https://t.me/${channel}/${postNum}`;

    const docRe = /<a class="tgme_widget_message_document"[^>]*href="([^"]+)"[\s\S]*?<div class="tgme_widget_message_document_title[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<div class="tgme_widget_message_document_extra[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
    let d;
    while ((d = docRe.exec(block)) !== null) {
      out.push({
        kind: 'document', postId: postNum, date,
        name: stripTags(d[2]).trim(), size: stripTags(d[3]).trim(),
        url: d[1], postUrl
      });
    }

    const photoRe = /<a class="tgme_widget_message_photo_wrap[^"]*"[^>]*href="([^"]+)"[^>]*style="[^"]*background-image:url\(&#39;([^&]+)&#39;\)/g;
    let p;
    while ((p = photoRe.exec(block)) !== null) {
      out.push({
        kind: 'photo', postId: postNum, date,
        name: `photo-${postNum}.jpg`, size: '',
        url: p[2], postUrl: p[1]
      });
    }

    const videoRe = /<a class="tgme_widget_message_video_player"[^>]*href="([^"]+)"/g;
    let v;
    while ((v = videoRe.exec(block)) !== null) {
      out.push({
        kind: 'video', postId: postNum, date,
        name: `video-${postNum}.mp4`, size: '',
        url: v[1], postUrl: v[1]
      });
    }
  }
  return out;
}

function stripTags(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

http.createServer(proxy).listen(PORT, HOST, () => {
  console.log(`tg-proxy listening on http://${HOST}:${PORT}  ->  https://${UPSTREAM_HOST}`);
});
