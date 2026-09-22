import { dashboardLoginUrl } from "@/config/site";

const DASHBOARD_LOGIN_URL = dashboardLoginUrl();

/** Map Auth.js `signIn` result codes (from backend) to storefront copy. */
export function messageForAuthCode(
  code: string | undefined | null,
  fallback: string,
): string {
  switch (code) {
    case "USE_GOOGLE":
      return "An account with this email already uses Google sign-in. Continue with Google instead.";
    case "EMAIL_IN_USE":
      return "An account with this email or phone already exists. Try logging in instead.";
    case "STAFF_USE_DASHBOARD":
      return `Staff accounts cannot sign in here. Use the dashboard: ${DASHBOARD_LOGIN_URL}`;
    case "GOOGLE_EMAIL_UNVERIFIED":
      return "Your Google email is not verified. Verify it with Google, then try again.";
    case "INVALID_GOOGLE_TOKEN":
    case "GOOGLE_FAILED":
      return "Google sign-in failed. Please try again.";
    case "VALIDATION_FAILED":
      return "Please check your details and try again.";
    case "REGISTER_FAILED":
      return "Registration failed. Please try again.";
    case "INVALID_CREDENTIALS":
    case "credentials":
      return fallback;
    default:
      return fallback;
  }
}
