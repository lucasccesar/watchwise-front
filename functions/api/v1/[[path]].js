const noStoreHeaders = new Headers({
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'Content-Type': 'application/json; charset=utf-8',
});

function errorResponse(status, message) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: new Headers(noStoreHeaders),
  });
}

export async function onRequest({ request, env }) {
  const apiOrigin = env.WATCHWISE_API_ORIGIN;
  if (!apiOrigin) {
    return errorResponse(502, 'O destino da API não está configurado.');
  }

  const requestUrl = new URL(request.url);
  let targetUrl;
  try {
    targetUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, apiOrigin);
  } catch {
    return errorResponse(502, 'O destino da API está configurado incorretamente.');
  }

  if (targetUrl.protocol !== 'https:') {
    return errorResponse(502, 'O destino da API deve usar HTTPS.');
  }

  try {
    const upstreamRequest = new Request(targetUrl, request);
    const upstreamResponse = await fetch(upstreamRequest, { cache: 'no-store' });
    const responseHeaders = new Headers(upstreamResponse.headers);
    const setCookies = upstreamResponse.headers.getSetCookie?.() ?? [];

    if (setCookies.length > 0) {
      responseHeaders.delete('Set-Cookie');
      for (const cookie of setCookies) {
        responseHeaders.append('Set-Cookie', cookie);
      }
    }

    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set('Pragma', 'no-cache');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch {
    return errorResponse(502, 'Não foi possível conectar à API.');
  }
}
