// Shared by the register form and the profile screen
const NAME_PATTERN = /^\p{L}+(?:[-'’]\p{L}+)*$/u;

export function validateField(field, value, form) {
  if (field === "firstName" || field === "lastName") {
    const label = field === "firstName" ? "First name" : "Last name";
    if (!value) return `${label} is required.`;
    if (value.length > 40) return `${label} must be 40 characters or fewer.`;
    if (/\s/.test(value)) return `${label} cannot contain spaces.`;
    if (!NAME_PATTERN.test(value)) {
      return `${label} can contain letters, with a single hyphen or apostrophe between letters.`;
    }
  }

  if (field === "email") {
    if (!value.trim()) return "Email address is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return "Enter a valid email address.";
    }
  }

  if (field === "password") {
    if (value.length < 8) return "Password must be at least 8 characters long.";
    if (!/\p{Lu}/u.test(value)) return "Password must contain an uppercase letter.";
    if (!/[0-9]/.test(value)) return "Password must contain a number.";
    if (!/[^\p{L}0-9]/u.test(value)) return "Password must contain a special character.";
  }

  if (field === "confirmPassword" && value !== form.password) {
    return "Passwords do not match.";
  }

  return "";
}
