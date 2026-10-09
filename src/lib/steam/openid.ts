import "server-only";

const OP = "https://steamcommunity.com/openid/login";

export function steamLoginUrl(returnTo: string, realm: string) {
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${OP}?${p}`;
}

/**
 * Verifies an OpenID assertion directly with Steam (check_authentication) and returns the SteamID64.
 * We never ask for or store Steam passwords.
 */
export async function verifySteamAssertion(params: URLSearchParams, expectedReturnTo: string, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (params.get("openid.mode") !== "id_res") return null;
  const returnTo = params.get("openid.return_to") ?? "";
  if (!returnTo.startsWith(expectedReturnTo)) return null;
  const claimed = params.get("openid.claimed_id") ?? "";
  const m = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(claimed);
  if (!m) return null;
  const body = new URLSearchParams(params);
  body.set("openid.mode", "check_authentication");
  const res = await fetchImpl(OP, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  return /is_valid\s*:\s*true/.test(text) ? m[1]! : null;
}
