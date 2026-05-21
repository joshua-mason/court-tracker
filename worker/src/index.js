export default {
  async fetch(request) {
    const target = new URL(request.url).searchParams.get('url');
    if (!target) {
      return new Response('missing ?url= param', { status: 400 });
    }

    let upstream;
    try {
      upstream = new URL(target);
    } catch {
      return new Response('invalid url', { status: 400 });
    }

    if (upstream.hostname !== 'tennistowerhamlets.com') {
      return new Response('host not allowed', { status: 403 });
    }

    const resp = await fetch(upstream.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        Referer: 'https://tennistowerhamlets.com/',
      },
    });

    return new Response(await resp.text(), {
      status: resp.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
};
