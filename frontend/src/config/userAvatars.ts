/**
 * User Avatar Configuration
 */

// All available user avatars (18 total)
export const USER_AVATARS = [
  'bluey_female',
  'bluery_male',
  'blushy_female',
  'blushy_male',
  'grumpy_female',
  'grumpy_male',
  'scaredy_female',
  'scaredy_male',
  'snoozy_female',
  'snoozy_male',
  'sparkle_female',
  'sparkle_male',
  'sunny_female',
  'sunny_male',
  'yucky_female',
  'yucky_male',
  'zippy_female',
  'zippy_male',
]

// Default avatar
export const DEFAULT_AVATAR = 'sunny_female'

// Get avatar image URL by ID
export function getAvatarUrl(id: string | undefined | null): string {
  if (!id || !USER_AVATARS.includes(id)) {
    id = DEFAULT_AVATAR
  }
  // Map ID to filename
  const filename = id.split('_').map((s, i) =>
    i === 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s
  ).join('_') + '.svg'
  return `/avatars/${filename}`
}
