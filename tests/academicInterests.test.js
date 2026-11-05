import assert from 'node:assert/strict'
import test from 'node:test'
import {
  academicInterestCategories,
  academicInterestsStorageKey,
  calculateAcademicInterestAlignment,
  parseAcademicInterestPreferences,
  serializeAcademicInterestPreferences,
  validateAcademicInterestRatings,
} from '../src/utils/academicInterests.js'

const verifiedHostCourse = {
  id: 'host:1',
  academicYear: '2026-2027',
  courseCode: 'MKT101',
  title: 'Marketing',
  ects: 5,
  semester: 'winter',
  language: 'English',
  bachelorEligible: true,
  exchangeEligible: true,
  syllabusUrl: 'https://host.example.edu/syllabus',
  catalogUrl: 'https://host.example.edu/catalog',
  lastCheckedAt: '2026-09-01T10:00:00Z',
  verificationStatus: 'current_verified',
  subjectCategories: ['Marketing'],
  subjectCategoriesVerified: true,
}

test('academic interest ratings persist under a versioned key without replacing course selections', () => {
  const serialized = serializeAcademicInterestPreferences({ Marketing: 5 })
  assert.deepEqual(parseAcademicInterestPreferences(serialized), { Marketing: 5 })
  assert.match(academicInterestsStorageKey, /-v1$/)
  assert.notEqual(academicInterestsStorageKey, 'erasmusmatch-aueb-selections')
  assert.throws(() => parseAcademicInterestPreferences('{"version":2,"ratings":{}}'), /unsupported version/)
  assert.throws(() => validateAcademicInterestRatings({ Marketing: 6 }), /invalid category or rating/)
})

test('interest alignment uses verified host subjects and maps ratings from 1 to 5', () => {
  const result = calculateAcademicInterestAlignment({
    hostCourses: [verifiedHostCourse],
    semester: 'winter',
    ratings: { Marketing: 5 },
  })

  assert.deepEqual(result, { score: 100, status: 'supported', categories: ['Marketing'] })
})

test('missing or unverified host subject metadata never produces an interest score', () => {
  for (const course of [
    { ...verifiedHostCourse, subjectCategories: [] },
    { ...verifiedHostCourse, subjectCategoriesVerified: false },
    { ...verifiedHostCourse, verificationStatus: 'unverified_candidate' },
  ]) {
    const result = calculateAcademicInterestAlignment({
      hostCourses: [course],
      semester: 'winter',
      ratings: Object.fromEntries(academicInterestCategories.map((category) => [category, 5])),
    })
    assert.equal(result.score, null)
    assert.equal(result.status, 'unavailable')
  }
})
