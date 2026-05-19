const parseBooleanEnv = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const getSameSite = () => {
  const configured = process.env.COOKIE_SAME_SITE?.trim().toLowerCase();
  if (["strict", "lax", "none"].includes(configured)) return configured;
  return process.env.NODE_ENV === "production" ? "strict" : "lax";
};

const getSecure = (sameSite) => {
  if (sameSite === "none") return true;
  return parseBooleanEnv(
    process.env.COOKIE_SECURE,
    process.env.NODE_ENV === "production"
  );
};

export const getAuthCookieOptions = ({ includeMaxAge = true } = {}) => {
  const sameSite = getSameSite();
  const options = {
    httpOnly: true,
    secure: getSecure(sameSite),
    sameSite,
  };

  if (includeMaxAge) {
    options.maxAge = 7 * 24 * 60 * 60 * 1000;
  }

  return options;
};
