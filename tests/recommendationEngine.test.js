import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { academicRules } from '../src/data/academicRules.js'
import auebCourseCatalog from '../src/data/auebCourseCatalog.json' with { type: 'json' }
import featuredCourseCandidates from '../src/data/featuredCourseCandidates.json' with { type: 'json' }
import partnerRecords from '../ErasmusMatch_Copilot_Data/data/raw/partner_universities_2026_27.json' with { type: 'json' }
import { selectFeaturedPartners } from '../src/data/featuredPartners.js'
import { normalizeErasmusPartners } from '../src/data/normalizeErasmusPartners.js'
import { validateCourseRecords } from '../src/data/courseData.js'
import { hydrateAuebCourseSelections } from '../src/utils/auebCourseCatalog.js'
import { parseCsv } from '../src/utils/parseCsv.js'
import {
  calculatePotentialMatchCoverage,
  generateRecommendations,
  getPartnerCourseRecommendations,
} from '../src/utils/recommendationEngine.js'

const catalogMasterCsv = readFileSync(
  new URL('../ErasmusMatch_Copilot_Data/data/catalogs/catalog_master.csv', import.meta.url),
  'utf8',
)
const erasmusPartners = normalizeErasmusPartners(partnerRecords, parseCsv(catalogMasterCsv))
const hostCourseRecords = validateCourseRecords(featuredCourseCandidates)

const candidate = (overrides = {}) => ({
  id: 1,
  university: 'Example University',
  country: 'France',
  studyCycle: '1',
  partnershipStatus: 'confirmed',
  semesterCatalogs: { winter: 'not_verified', spring: 'not_verified' },
  courseDataStatus: 'not_verified',
  ...overrides,
})

test('academic recommendations use deterministic alphabetical tie-breakers', () => {
  const partners = [
    candidate({ id: 1, university: 'France University', country: 'France' }),
    candidate({ id: 2, university: 'Spain University', country: 'Spain' }),
  ]
  const recommendations = generateRecommendations({
    partners,
    semester: 'winter',
    rules: academicRules,
  })

  assert.deepEqual(recommendations.map(({ partner }) => partner.university), [
    'France University',
    'Spain University',
  ])
  assert.ok(recommendations.every(({ academicStatus }) => academicStatus === 'requires_confirmation'))
  assert.deepEqual(Object.keys(recommendations[0]), [
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

test('only confirmed partner records are recommended and no course equivalencies are invented', () => {
  const recommendations = generateRecommendations({
    partners: [
      candidate({ id: 1 }),
      candidate({ id: 2, university: 'Unconfirmed University', partnershipStatus: 'unverified' }),
    ],
    outstandingCourses: [{ id: 'mkt-1', title: 'Student-entered course', selected: true }],
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendations.length, 1)
  assert.deepEqual(recommendations[0].validation.host, {
    ects: 0,
    unverifiedCount: 0,
    minimumEcts: 30,
    remainingEcts: 30,
    status: 'requires_confirmation',
    message: 'Απαιτείται ακαδημαϊκή επιβεβαίωση',
  })
  assert.equal(recommendations[0].academicMatch.score, null)
  assert.ok(recommendations[0].academicMatch.missingEvidence.some((item) =>
    item.includes('not verified'),
  ))
})

test('selected bundled AUEB courses flow into academic match explanations', () => {
  const selectedCourses = hydrateAuebCourseSelections(auebCourseCatalog, [auebCourseCatalog[0].id])
    .filter((course) => course.selected)
  const [recommendation] = generateRecommendations({
    partners: [candidate()],
    outstandingCourses: selectedCourses,
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(selectedCourses.length, 1)
  assert.equal(recommendation.academicMatch.score, null)
  assert.ok(recommendation.academicMatch.reasons.some((reason) =>
    reason.includes('no host title/topic overlap can be established'),
  ))
})

test('unknown partner language data is not treated as a language match or mismatch', () => {
  const [recommendation] = generateRecommendations({
    partners: [candidate()],
    studentLanguages: [{ language: 'English', level: 'C1' }],
    semester: 'spring',
    rules: academicRules,
  })

  assert.equal(recommendation.academicMatch.score, null)
  assert.ok(recommendation.academicMatch.missingEvidence.some((reason) =>
    reason.includes('Select AUEB courses'),
  ))
  assert.equal(recommendation.academicStatus, 'requires_confirmation')
})

test('verified teaching-language and course data can inform future personalized ranking', () => {
  const [recommendation] = generateRecommendations({
    partners: [candidate({
      teachingLanguagesVerified: true,
      teachingLanguages: ['English'],
      verifiedCourses: [{ courseId: 'host-1', ects: 30, verified: true }],
      verifiedRecognitions: [{ id: 'aueb-1', ects: 30, verified: true }],
      semesterCatalogs: { winter: 'verified', spring: 'not_verified' },
      courseDataStatus: 'verified',
      recognitionDataStatus: 'verified',
      studentEligibilityVerified: true,
    })],
    studentLanguages: [{ language: 'English', level: 'C1' }],
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendation.academicMatch.score, null)
  assert.equal(recommendation.academicStatus, 'confirmed')
  assert.equal(recommendation.validation.host.status, 'met')
  assert.equal(recommendation.validation.aueb.status, 'met')
})

test('verified ECTS and catalogs alone do not imply student-level eligibility', () => {
  const [recommendation] = generateRecommendations({
    partners: [candidate({
      verifiedCourses: [{ courseId: 'host-1', ects: 30, verified: true }],
      verifiedRecognitions: [{ id: 'aueb-1', ects: 30, verified: true }],
      semesterCatalogs: { winter: 'verified', spring: 'not_verified' },
      courseDataStatus: 'verified',
      recognitionDataStatus: 'verified',
    })],
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendation.validation.status, 'met')
  assert.equal(recommendation.academicStatus, 'requires_confirmation')
  assert.ok(recommendation.reasons.some((reason) => reason.includes('Student-level eligibility')))
})

test('real AUEB partner data is retained as candidates but unknown catalogs stay unconfirmed', () => {
  const recommendations = generateRecommendations({
    partners: erasmusPartners,
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendations.length, 46)
  assert.ok(recommendations.every(({ academicStatus }) => academicStatus === 'requires_confirmation'))
  assert.ok(recommendations.every(({ validation }) =>
    validation.host.status === 'requires_confirmation' &&
    validation.aueb.status === 'requires_confirmation',
  ))
})

test('all six featured partners with bundled course data withhold academic scores', () => {
  const featuredPartners = selectFeaturedPartners(erasmusPartners).map((partner) => ({
    ...partner,
    hostCourses: hostCourseRecords.filter((course) =>
      course.erasmusCode === partner.erasmusCode &&
      course.academicYear === partner.academicYear &&
      course.semester === 'winter',
    ),
  }))
  const [selectedAuebCourse] = hydrateAuebCourseSelections(auebCourseCatalog, [auebCourseCatalog[0].id])
    .filter((course) => course.selected)
  const recommendations = generateRecommendations({
    partners: featuredPartners,
    outstandingCourses: [selectedAuebCourse],
    studentLanguages: [{ language: 'English', level: 'C1' }],
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendations.length, 6)
  assert.ok(recommendations.every(({ academicMatch }) =>
    academicMatch.score === null,
  ))
})

test('academic interest preferences cannot create a combined score without course evidence', () => {
  const [recommendation] = generateRecommendations({
    partners: [candidate()],
    outstandingCourses: [{ id: 'aueb:1', title: 'Marketing', selected: true }],
    academicInterestRatings: { Marketing: 5 },
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendation.academicMatch.score, null)
  assert.equal(recommendation.academicInterestAlignment.score, null)
  assert.equal(recommendation.combinedScore, null)
})

test('missing verified host subject categories do not create an interest percentage', () => {
  const [recommendation] = generateRecommendations({
    partners: [candidate({
      semesterCatalogs: { winter: 'verified', spring: 'not_verified' },
      courseDataStatus: 'verified',
      studentEligibilityVerified: true,
      hostCourses: [{
        id: 'host:1',
        courseCode: 'MKT101',
        title: 'Marketing',
        ects: 5,
        semester: 'winter',
        language: 'English',
        bachelorEligible: true,
        exchangeEligible: true,
        catalogUrl: 'https://host.example.edu/catalog',
        syllabusUrl: 'https://host.example.edu/syllabus',
        lastCheckedAt: '2026-09-01T10:00:00Z',
        verificationStatus: 'current_verified',
        description: 'Marketing strategy and market analysis.',
        learningOutcomes: 'Analyze marketing strategy and market data.',
      }],
    })],
    academicInterestRatings: { Marketing: 5 },
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendation.academicInterestAlignment.score, null)
  assert.equal(recommendation.combinedScore, null)
})

test('detail-page recommendations follow five selected AUEB courses and update when selections change', () => {
  const selectedCourses = Array.from({ length: 5 }, (_, index) => {
    const topic = `topic${index}`
    const evidence = `growth${index} channel${index} consumer${index} metric${index}`
    return {
      id: `aueb:${topic}`,
      title: `Marketing ${topic}`,
      courseCode: `AUEB${index}`,
      ects: 5,
      semester: index + 1,
      language: 'English',
      catalogStatus: 'verified',
      officialUrl: `https://aueb.example.edu/${topic}`,
      description: `${topic} ${evidence}`,
      learningOutcomes: `Analyze ${topic} ${evidence}`,
      selected: true,
    }
  })
  const hostCourses = selectedCourses.map((course, index) => ({
    id: `host:${course.id}`,
    partnerId: 'detail-partner',
    academicYear: '2026-2027',
    semester: 'winter',
    courseCode: `HOST${index}`,
    title: `Marketing ${course.id.split(':')[1]}`,
    ects: 6,
    language: 'English',
    bachelorEligible: true,
    exchangeEligible: true,
    catalogUrl: `https://host.example.edu/${index}`,
    syllabusUrl: `https://host.example.edu/${index}/syllabus`,
    lastCheckedAt: '2026-09-01T10:00:00Z',
    verificationStatus: 'current_verified',
    description: course.description,
    learningOutcomes: course.learningOutcomes,
  }))
  const partner = candidate({
    id: 'detail-partner',
    semesterCatalogs: { winter: 'verified', spring: 'not_verified' },
    courseDataStatus: 'verified',
    studentEligibilityVerified: true,
    hostCourses,
  })
  const getRecommendation = (courses, hosts = hostCourses) => getPartnerCourseRecommendations({
    partner,
    matchingHostCourses: hosts,
    selectedAuebCourses: courses,
    studentLanguages: [{ language: 'English', level: 'C1' }],
    semester: 'winter',
    rules: academicRules,
  })

  const allSelected = getRecommendation(selectedCourses)
  assert.equal(allSelected.recommendedPairs.length, 5)
  assert.equal(allSelected.academicMatch.status, 'supported')

  const changedSelection = getRecommendation([selectedCourses[2]])
  assert.deepEqual(
    changedSelection.recommendedPairs.map((pair) => pair.auebCourseId),
    [selectedCourses[2].id],
  )

  const unverifiedHosts = hostCourses.map((course) =>
    course.id === hostCourses[0].id
      ? { ...course, verificationStatus: 'unverified_candidate' }
      : course,
  )
  const unverifiedResult = getRecommendation(selectedCourses, unverifiedHosts)
  assert.equal(unverifiedResult.academicMatch.score, null)
  assert.ok(unverifiedResult.recommendedPairs.every((pair) =>
    pair.hostVerificationStatus === 'current_verified',
  ))
  assert.ok(!unverifiedResult.recommendedPairs.some((pair) =>
    pair.hostCourseId === hostCourses[0].id,
  ))
  assert.equal(
    unverifiedResult.academicMatch.potentialPairs.find((pair) =>
      pair.hostCourseId === hostCourses[0].id,
    )?.status,
    'unverified_potential',
  )
})

test('five official AUEB courses produce only topical Comenius candidates requiring verification', () => {
  const selectedCourseCodes = new Set(['5411', '5311', '5231', '5622', '5721'])
  const selectedCourses = auebCourseCatalog.map((course) => ({
    ...course,
    selected: selectedCourseCodes.has(course.courseCode),
  }))
  const comenius = selectFeaturedPartners(erasmusPartners)
    .find((partner) => partner.erasmusCode === 'SK BRATISL 02')
  const comeniusHostCourses = hostCourseRecords.filter((course) =>
    course.erasmusCode === comenius.erasmusCode &&
    course.academicYear === comenius.academicYear &&
    course.semester === 'winter',
  )
  const comeniusCatalog = hostCourseRecords.filter((course) =>
    course.erasmusCode === comenius.erasmusCode,
  )
  const recommendations = getPartnerCourseRecommendations({
    partner: comenius,
    selectedAuebCourses: selectedCourses,
    matchingHostCourses: comeniusHostCourses,
    catalogCourses: comeniusCatalog,
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(recommendations.selectedCourses.length, 5)
  assert.equal(recommendations.recommendedPairs.length, 0)
  assert.equal(recommendations.potentialPairs.length, 2)
  assert.equal(recommendations.academicMatch.score, null)
  assert.deepEqual(
    calculatePotentialMatchCoverage(recommendations.selectedCourses, recommendations.potentialPairs),
    { matchedCourseCount: 1, selectedCourseCount: 5, score: 20 },
  )
  assert.deepEqual(
    recommendations.potentialPairs.map(({ auebCourseCode, hostTitle, status }) => ({
      auebCourseCode,
      hostTitle,
      status,
    })),
    [
      {
        auebCourseCode: '5231',
        hostTitle: 'Computer Science (EN)',
        status: 'unverified_potential',
      },
      {
        auebCourseCode: '5231',
        hostTitle: 'Data management',
        status: 'unverified_potential',
      },
    ],
  )
  assert.ok(recommendations.potentialPairs.every((pair) =>
    pair.topicEvidenceSources.length > 0 &&
    pair.missingEvidence.length > 0 &&
    pair.hostVerificationStatus === 'unverified_candidate',
  ))
  assert.equal(recommendations.catalogCourses.length, 51)
  assert.ok(recommendations.potentialPairs.every((pair) =>
    recommendations.catalogCourses.some((course) => course.id === pair.hostCourseId),
  ))

  const withoutInformatics = getPartnerCourseRecommendations({
    partner: comenius,
    selectedAuebCourses: selectedCourses.map((course) => ({
      ...course,
      selected: course.selected && course.courseCode !== '5231',
    })),
    matchingHostCourses: comeniusHostCourses,
    catalogCourses: comeniusCatalog,
    semester: 'winter',
    rules: academicRules,
  })
  assert.equal(withoutInformatics.selectedCourses.length, 4)
  assert.equal(withoutInformatics.potentialPairs.length, 0)
  assert.equal(withoutInformatics.catalogCourses.length, 51)
  assert.deepEqual(
    calculatePotentialMatchCoverage(withoutInformatics.selectedCourses, withoutInformatics.potentialPairs),
    { matchedCourseCount: 0, selectedCourseCount: 4, score: 0 },
  )
})

test('detail recommendations are empty with no saved AUEB course selections', () => {
  const comenius = selectFeaturedPartners(erasmusPartners)
    .find((partner) => partner.erasmusCode === 'SK BRATISL 02')
  const comeniusHostCourses = hostCourseRecords.filter((course) =>
    course.erasmusCode === comenius.erasmusCode &&
    course.academicYear === comenius.academicYear &&
    course.semester === 'winter',
  )
  const result = getPartnerCourseRecommendations({
    partner: comenius,
    selectedAuebCourses: auebCourseCatalog.map((course) => ({
      ...course,
      selected: false,
    })),
    matchingHostCourses: comeniusHostCourses,
    catalogCourses: hostCourseRecords.filter((course) =>
      course.erasmusCode === comenius.erasmusCode,
    ),
    semester: 'winter',
    rules: academicRules,
  })

  assert.equal(result.selectedCourses.length, 0)
  assert.equal(result.recommendedPairs.length, 0)
  assert.equal(result.potentialPairs.length, 0)
  assert.equal(result.catalogCourses.length, 51)
  assert.ok(result.academicMatch.missingEvidence.some((reason) => reason.includes('Select AUEB courses')))
  assert.deepEqual(
    calculatePotentialMatchCoverage(result.selectedCourses, result.potentialPairs),
    { matchedCourseCount: 0, selectedCourseCount: 0, score: null },
  )
})

test('potential coverage counts one selected AUEB course once despite multiple host candidates', () => {
  const selectedCourses = Array.from({ length: 5 }, (_, index) => ({
    id: `aueb:${index}`,
    selected: true,
  }))
  const potentialPairs = [
    { auebCourseId: 'aueb:2', status: 'unverified_potential' },
    { auebCourseId: 'aueb:2', status: 'unverified_potential' },
  ]

  assert.deepEqual(
    calculatePotentialMatchCoverage(selectedCourses, potentialPairs),
    { matchedCourseCount: 1, selectedCourseCount: 5, score: 20 },
  )
})

test('potential coverage excludes verified pairings and ignores unselected course candidates', () => {
  const selectedCourses = [
    { id: 'aueb:selected', selected: true },
    { id: 'aueb:unselected', selected: false },
  ]
  const potentialPairs = [
    { auebCourseId: 'aueb:selected', status: 'evidence_supported_potential' },
    { auebCourseId: 'aueb:unselected', status: 'unverified_potential' },
  ]

  assert.deepEqual(
    calculatePotentialMatchCoverage(selectedCourses, potentialPairs),
    { matchedCourseCount: 0, selectedCourseCount: 1, score: 0 },
  )
})
