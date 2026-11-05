import { isStrictlyVerifiedHostCourse } from './approvalRequest.js'

export const academicInterestCategories = [
  'Marketing',
  'Economics',
  'Mathematics & Statistics',
  'Psychology & Consumer Behaviour',
  'Management',
  'Communication & Public Relations',
  'Finance',
  'Technology & Data',
]

export const academicInterestsStorageKey = 'erasmusmatch-academic-interests-v1'

export function validateAcademicInterestRatings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Academic interest preferences must be an object.')
  }
  const ratings = {}
  for (const [category, rating] of Object.entries(value)) {
    if (!academicInterestCategories.includes(category) ||
        !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error('Academic interest preferences contain an invalid category or rating.')
    }
    ratings[category] = rating
  }
  return ratings
}

export function serializeAcademicInterestPreferences(ratings) {
  return JSON.stringify({
    version: 1,
    ratings: validateAcademicInterestRatings(ratings),
  })
}

export function parseAcademicInterestPreferences(value) {
  const stored = JSON.parse(value)
  if (stored?.version !== 1) {
    throw new Error('Saved academic interest preferences use an unsupported version.')
  }
  return validateAcademicInterestRatings(stored.ratings)
}

export function calculateAcademicInterestAlignment({
  hostCourses = [],
  semester,
  ratings = {},
} = {}) {
  if (hostCourses.length === 0 || !hostCourses.every((course) =>
    isStrictlyVerifiedHostCourse(course, semester) &&
    course.subjectCategoriesVerified === true &&
    Array.isArray(course.subjectCategories) &&
    course.subjectCategories.length > 0 &&
    course.subjectCategories.every((category) => academicInterestCategories.includes(category)),
  )) {
    return { score: null, status: 'unavailable', categories: [] }
  }

  const categories = [...new Set(hostCourses.flatMap((course) => course.subjectCategories))]
  const preferences = validateAcademicInterestRatings(ratings)
  if (categories.some((category) => !Number.isInteger(preferences[category]))) {
    return { score: null, status: 'unavailable', categories }
  }

  const score = Math.round(
    categories.reduce((total, category) => total + (preferences[category] - 1) * 25, 0) /
    categories.length,
  )
  return { score, status: 'supported', categories }
}
