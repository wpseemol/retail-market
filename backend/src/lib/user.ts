import type { Media, User } from "@prisma/client";

export type UserWithAvatar = User & { avatar?: Media | null };

/** Prisma include for auth responses that expose the public user. */
export const userWithAvatarInclude = {
  avatar: true,
} as const;

export function mediaPublicUrl(media: Media): string {
  const base = media.file_path.endsWith("/")
    ? media.file_path
    : `${media.file_path}/`;
  return `${base}${media.file_name}`;
}

export function toPublicMedia(media: Media | null | undefined) {
  if (!media) return null;
  return {
    id: media.id.toString(),
    disk: media.disk,
    file_name: media.file_name,
    original_name: media.original_name,
    file_path: media.file_path,
    path: mediaPublicUrl(media),
    file_size: media.file_size?.toString() ?? null,
    mime_type: media.mime_type,
    dimensions: media.dimensions,
    alt_text: media.alt_text,
    collection_name: media.collection_name,
    is_public: media.is_public,
    sort_order: media.sort_order,
  };
}

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
    avatar_id: user.avatar_id?.toString() ?? null,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
    avatar: toPublicMedia(user.avatar),
  };
}
