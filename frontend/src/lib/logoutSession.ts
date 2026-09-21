import { logout as logoutAction } from "@/store/authSlice";
import type { AppDispatch } from "@/store/store";

/** Clear encrypted httpOnly session cookie, then wipe client auth state. */
export async function logoutSession(dispatch: AppDispatch) {
  try {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch {
    // Still clear client state if the network call fails.
  }
  dispatch(logoutAction());
}
