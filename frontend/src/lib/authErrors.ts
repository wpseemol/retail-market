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
    case "USE_FACEBOOK":
      return "An account with this email uses Facebook sign-in. Continue with Facebook instead.";
    case "USE_APPLE":
      return "An account with this email uses Apple sign-in. Continue with Apple instead.";
    case "FACEBOOK_EMAIL_REQUIRED":
      return "Facebook did not share your email. Allow email access and try again.";
    case "APPLE_EMAIL_REQUIRED":
      return "Apple did not share your email. Try again and allow email access.";
    case "FACEBOOK_EMAIL_UNVERIFIED":
    case "APPLE_EMAIL_UNVERIFIED":
      return "Your email is not verified with that provider. Verify it, then try again.";
    case "INVALID_FACEBOOK_TOKEN":
    case "FACEBOOK_FAILED":
      return "Facebook sign-in failed. Please try again.";
    case "INVALID_APPLE_TOKEN":
    case "APPLE_FAILED":
      return "Apple sign-in failed. Please try again.";
    case "PROVIDER_DISABLED":
      return "This sign-in option is currently turned off. Use email and password instead.";
    case "LINKED_TO_OTHER_PROVIDER":
      return "This email is already linked to a different sign-in method.";
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
