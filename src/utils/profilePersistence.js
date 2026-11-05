import { getSelectedAuebCourseIds } from './auebCourseCatalog.js'

export const profileDetailsStorageKey = 'erasmusmatch-profile-details'
export const auebSelectionStorageKey = 'erasmusmatch-aueb-selections'

export function getProfileSaveValidationError(profile) {
  if (!profile.name?.trim()) return 'Enter your full name before saving your profile.'
  if (!profile.email?.trim()) return 'Enter your student email before saving your profile.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
    return 'Enter a valid student email address before saving your profile.'
  }
  if (!profile.department?.trim()) return 'Enter your department before saving your profile.'
  return ''
}

export function readSavedProfile(storage, defaults) {
  try {
    const stored = storage.getItem(profileDetailsStorageKey)
    if (!stored) return { value: defaults, error: '' }
    const profile = JSON.parse(stored)
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      throw new Error('Saved profile details must be an object.')
    }
    for (const field of ['name', 'email', 'studentNumber', 'department', 'coordinatorEmail']) {
      if (profile[field] !== undefined && typeof profile[field] !== 'string') {
        throw new Error(`Saved profile field ${field} must be text.`)
      }
    }
    if (profile.semester !== undefined && !['winter', 'spring'].includes(profile.semester)) {
      throw new Error('Saved profile semester is invalid.')
    }
    if (profile.languages !== undefined &&
        (!Array.isArray(profile.languages) ||
          !profile.languages.every((item) =>
            item && typeof item.language === 'string' && typeof item.level === 'string',
          ))) {
      throw new Error('Saved profile languages are invalid.')
    }
    return {
      value: {
        ...defaults,
        ...profile,
        courses: defaults.courses,
      },
      error: '',
    }
  } catch (error) {
    return { value: defaults, error: `Could not read saved profile details: ${error.message}` }
  }
}

export function saveProfile(storage, profile) {
  const validationError = getProfileSaveValidationError(profile)
  if (validationError) return { success: false, error: validationError }

  const { courses, ...profileDetails } = profile
  storage.setItem(profileDetailsStorageKey, JSON.stringify(profileDetails))
  storage.setItem(
    auebSelectionStorageKey,
    JSON.stringify(getSelectedAuebCourseIds(courses)),
  )
  return { success: true, error: '' }
}
