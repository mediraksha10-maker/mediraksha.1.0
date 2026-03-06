export const AGE_MIN = 1;
export const AGE_MAX = 120;

export const ALLOWED_GENDERS = ["Male", "Female", "Other"];

export const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const parseAge = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const age = Number(value);
  if (!Number.isInteger(age)) return null;
  if (age < AGE_MIN || age > AGE_MAX) return null;

  return age;
};

export const isValidGender = (value) => ALLOWED_GENDERS.includes(value);
