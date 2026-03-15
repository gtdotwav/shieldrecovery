export function markAsLegacyRoute(
  response: Response,
  canonicalPath: string,
) {
  response.headers.set("x-shield-route-status", "legacy");
  response.headers.set("x-shield-route-canonical", canonicalPath);
  response.headers.set("link", `<${canonicalPath}>; rel="canonical"`);

  return response;
}
