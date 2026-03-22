const isProduction = process.env.NODE_ENV === "production";

const parseBoolean = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

export function getAuthCookieOptions() {
  const configuredSameSite = process.env.COOKIE_SAMESITE?.toLowerCase();
  const sameSite = configuredSameSite || (isProduction ? "none" : "lax");

  const configuredSecure = parseBoolean(process.env.COOKIE_SECURE);
  const secure =
    configuredSecure !== undefined ? configuredSecure : sameSite === "none";

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function getClearCookieOptions() {
  const { httpOnly, secure, sameSite, path } = getAuthCookieOptions();

  return {
    httpOnly,
    secure,
    sameSite,
    path,
  };
}
