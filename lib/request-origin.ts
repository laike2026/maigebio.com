export function requestOriginMatches(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const supplied = new URL(origin);
    return supplied.origin === origin && ["http:", "https:"].includes(supplied.protocol) &&
      [new URL(request.url).host, request.headers.get("host"), request.headers.get("x-forwarded-host")]
        .includes(supplied.host);
  } catch {
    return false;
  }
}
