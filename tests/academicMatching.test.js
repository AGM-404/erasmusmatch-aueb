import assert from 'node:assert/strict'
import test from 'node:test'
import { academicRules } from '../src/data/academicRules.js'
import { calculateAcademicMatch } from '../src/utils/academicMatching.js'
import { generateRecommendations } from '../src/utils/recommendationEngine.js'

const sourceUrl = 'https://university.example.edu/course-information'
const verifiedAuebCourse = {
  id: 'aueb:marketing-strategy',
  title: 'Consumer Marketing Strategy',
  courseCode: 'MKT301',
  ects: 6,
  semester: 5,
  language: 'English',
  catalogStatus: 'verified',
  officialUrl: sourceUrl,
  description: 'Study consumer behavior research and marketing campaigns for strategic planning.',
  learningOutcomes: 'Analyze consumer behavior and evaluate marketing campaigns.',
}
const verifiedHostCourse = {
  id: 'host:marketing-strategy',
  partnerId: 'partner-1',
  academicYear: '2026-2027',
  semester: 'winter',
  courseCode: 'HOST301',
  title: 'Marketing Strategy for Consumer Markets',
  ects: 6,
  language: 'English',
  bachelorEligible: true,
  exchangeEligible: true,
  catalogUrl: sourceUrl,
  syllabusUrl: sourceUrl,
  lastCheckedAt: '2026-09-01T10:00:00Z',
  verificationStatus: 'current_verified',
  description: 'Marketing campaigns and consumer behavior research support strategic planning.',
  learningOutcomes: 'Evaluate consumer behavior and plan marketing campaigns.',
}
const verifiedPartner = {
  id: 'partner-1',
  university: 'Example University',
  country: 'Exampleland',
  erasmusCode: 'EXAMPLE 01',
  partnershipStatus: 'confirmed',
  semesterCatalogs: { winter: 'verified', spring: 'not_verified' },
  courseDataStatus: 'verified',
  studentEligibilityVerified: true,
  hostCourses: [verifiedHostCourse],
}
const studentLanguages = [{ language: 'English', level: 'C1' }]

test('academic coverage requires verified topic and course-content evidence', () => {
  const result = calculateAcademicMatch({
    auebCourses: [verifiedAuebCourse],
    hostCourses: [verifiedHostCourse],
    semester: 'winter',
    studentLanguages,
    partner: verifiedPartner,
  })

  assert.equal(result.score, 100)
  assert.equal(result.status, 'supported')
  assert.equal(result.strongPairs.length, 1)
  assert.ok(result.strongPairs[0].sharedTopics.includes('marketing'))
  assert.ok(result.strongPairs[0].sharedContent.length >= 3)
  assert.match(result.reasons[0], /not an approved equivalency/)
})

test('ECTS values may differ while semester, language and host eligibility checks remain required', () => {
  const differentEctsHost = { ...verifiedHostCourse, ects: 4 }
  const differentEctsMatch = calculateAcademicMatch({
    auebCourses: [verifiedAuebCourse],
    hostCourses: [differentEctsHost],
    semester: 'winter',
    studentLanguages,
    partner: { ...verifiedPartner, hostCourses: [differentEctsHost] },
  })
  assert.equal(differentEctsMatch.score, 100)
  assert.equal(differentEctsMatch.strongPairs[0].hostEcts, 4)
  assert.equal(differentEctsMatch.strongPairs[0].auebEcts, 6)

  const wrongSemesterHost = { ...verifiedHostCourse, semester: 'spring' }
  const wrongSemesterMatch = calculateAcademicMatch({
    auebCourses: [verifiedAuebCourse],
    hostCourses: [wrongSemesterHost],
    semester: 'winter',
    studentLanguages,
    partner: { ...verifiedPartner, hostCourses: [wrongSemesterHost] },
  })
  assert.equal(wrongSemesterMatch.score, null)

  const ineligibleHost = { ...verifiedHostCourse, exchangeEligible: false }
  const ineligibleMatch = calculateAcademicMatch({
    auebCourses: [verifiedAuebCourse],
    hostCourses: [ineligibleHost],
    semester: 'winter',
    studentLanguages,
    partner: { ...verifiedPartner, hostCourses: [ineligibleHost] },
  })
  assert.equal(ineligibleMatch.score, null)
})

test('generic title overlap without independent course-content evidence is not a candidate', () => {
  const hostCourse = {
    ...verifiedHostCourse,
    description: 'This class examines monetary policy, central banks and inflation models.',
    learningOutcomes: 'Explain interest rates, monetary policy and inflation.',
  }
  const result = calculateAcademicMatch({
    auebCourses: [verifiedAuebCourse],
    hostCourses: [hostCourse],
    semester: 'winter',
    studentLanguages,
    partner: { ...verifiedPartner, hostCourses: [hostCourse] },
  })

  assert.equal(result.score, 0)
  assert.equal(result.status, 'no_verified_fit')
  assert.equal(result.strongPairs.length, 0)
  assert.equal(result.potentialPairs.length, 0)
})

test('missing catalog verification, AUEB data or language evidence withholds the academic percentage', () => {
  const unverifiedHost = { ...verifiedHostCourse, verificationStatus: 'unverified_candidate' }
  const unverifiedHostResult = calculateAcademicMatch({
    auebCourses: [verifiedAuebCourse],
    hostCourses: [unverifiedHost],
    semester: 'winter',
    studentLanguages,
    partner: { ...verifiedPartner, courseDataStatus: 'not_verified', hostCourses: [unverifiedHost] },
  })
  assert.equal(unverifiedHostResult.score, null)
  assert.ok(unverifiedHostResult.missingEvidence.some((item) => item.includes('strict verification')))

  const incompleteAuebResult = calculateAcademicMatch({
    auebCourses: [{ ...verifiedAuebCourse, catalogStatus: 'official_listing_unverified', ects: null }],
    hostCourses: [verifiedHostCourse],
    semester: 'winter',
    studentLanguages: [],
    partner: verifiedPartner,
  })
  assert.equal(incompleteAuebResult.score, null)
  assert.ok(incompleteAuebResult.missingEvidence.some((item) => item.includes('AUEB ECTS are unknown')))
  assert.ok(incompleteAuebResult.missingEvidence.some((item) => item.includes('study languages')))
})

test('recommendation explanations include academic course evidence only', () => {
  const [recommendation] = generateRecommendations({
    partners: [verifiedPartner],
    outstandingCourses: [verifiedAuebCourse],
    studentLanguages,
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendation.academicMatch.score, 100)
  assert.ok(recommendation.reasons.some((reason) => reason.includes('verified topic and course-content overlap')))
  assert.deepEqual(Object.keys(recommendation), [
    'partner',
    'semester',
    'academicMatch',
    'academicInterestAlignment',
    'combinedScore',
    'validation',
    'reasons',
    'academicStatus',
  ])
})

test('verified interests add only a fixed 20 percent to supported course compatibility', () => {
  const courseWithVerifiedSubject = {
    ...verifiedHostCourse,
    subjectCategories: ['Marketing'],
    subjectCategoriesVerified: true,
  }
  const [recommendation] = generateRecommendations({
    partners: [{
      ...verifiedPartner,
      hostCourses: [courseWithVerifiedSubject],
      verifiedCourses: [{ courseId: courseWithVerifiedSubject.id, ects: 30, verified: true }],
      verifiedRecognitions: [{ id: verifiedAuebCourse.id, ects: 30, verified: true }],
      recognitionDataStatus: 'verified',
    }],
    outstandingCourses: [verifiedAuebCourse],
    studentLanguages,
    academicInterestRatings: { Marketing: 1 },
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendation.academicMatch.score, 100)
  assert.equal(recommendation.academicInterestAlignment.score, 0)
  assert.equal(recommendation.combinedScore, 80)
  assert.ok(recommendation.reasons.some((reason) => reason.includes('80% course compatibility')))
})
