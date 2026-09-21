import type { User, UserAvatar } from "@prisma/client";

type UserWithAvatar = User & { avatar?: UserAvatar | null };

export function toPublicUser(user: UserWithAvatar) {
  return {
    id: user.id.toString(),
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    gender: user.gender,
    date_of_birth: user.date_of_birth,
    email_verified_at: user.email_verified_at,
    phone_verified_at: user.phone_verified_at,
    provider_name: user.provider_name,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
    avatar: user.avatar
      ? {
          id: user.avatar.id.toString(),
          path: user.avatar.path,
        }
      : null,
  };
}
