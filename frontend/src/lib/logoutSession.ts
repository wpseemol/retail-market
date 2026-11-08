import { signOut } from "next-auth/react";
import { logoutAction } from "@/app/actions/auth";
import { logout as clearClientAuth } from "@/store/authSlice";
import type { AppDispatch } from "@/store/store";

/** Server Action clears httpOnly cookies; then wipe Redux + client SessionProvider. */
export async function logoutSession(dispatch: AppDispatch) {
  try {
    await logoutAction();
  } catch {
    // Still clear client state if the action fails.
  }
  try {
    await signOut({ redirect: false });
  } catch {
    /* cookie already cleared by the server action */
  }
  dispatch(clearClientAuth());
}
