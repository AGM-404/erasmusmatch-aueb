import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeCourseRecords, normalizeCourseRecord, parseCourseData, validateCourseRecords } from '../src/data/courseData.js'
import featuredCourseCandidates from '../src/data/featuredCourseCandidates.json' with { type: 'json' }

const currentCourse = {
  partner_id: '17',
  erasmus_code: 'F TEST 01',
  academic_year: '2026-2027',
  term: 'winter',
  course_code: 'MKT101',
  course_title: 'Marketing Strategy',
  ects: '6',
  language: 'English',
  study_level: 'Bachelor',
  bachelor_eligible: 'yes',
  exchange_eligible: 'yes',
  syllabus_url: 'https://host.example.edu/courses/mkt101/syllabus',
  catalog_url: 'https://host.example.edu/exchange/courses',
  source_checked_at: '2026-09-01T10:00:00Z',
  verification_status: 'current_verified',
  description: 'A source-checked course description.',
  syllabus_text: 'A source-checked syllabus summary.',
  learning_outcomes: 'Students evaluate marketing evidence.',
}

test('normalizes a current course listing with official source metadata', () => {
  const [course] = validateCourseRecords([currentCourse])

  assert.equal(course.partnerId, '17')
  assert.equal(course.ects, 6)
  assert.equal(course.bachelorEligible, true)
  assert.equal(course.exchangeEligible, true)
  assert.equal(course.verificationStatus, 'current_verified')
  assert.equal(course.lastCheckedAt, '2026-09-01T10:00:00.000Z')
  assert.equal(course.description, 'A source-checked course description.')
  assert.equal(course.syllabusText, 'A source-checked syllabus summary.')
  assert.equal(course.learningOutcomes, 'Students evaluate marketing evidence.')
})

test('preserves explicit host subject categories and their verification flag', () => {
  const [course] = validateCourseRecords([{
    ...currentCourse,
    subject_categories: 'Marketing|Economics',
    subject_categories_verified: 'yes',
  }])

  assert.deepEqual(course.subjectCategories, ['Marketing', 'Economics'])
  assert.equal(course.subjectCategoriesVerified, true)
})

test('keeps historical and unverified candidate listings distinct', () => {
  const [historical, candidate] = validateCourseRecords([
    { ...currentCourse, verification_status: 'historical' },
    { ...currentCourse, course_code: 'MKT102', verification_status: 'unverified_candidate', source_checked_at: '' },
  ])

  assert.equal(historical.verificationStatus, 'historical')
  assert.equal(candidate.verificationStatus, 'unverified_candidate')
  assert.equal(candidate.lastCheckedAt, null)
})

test('rejects a course labeled current verified without required verification fields', () => {
  assert.throws(
    () => normalizeCourseRecord({ ...currentCourse, syllabus_url: '', exchange_eligible: '' }),
    /current_verified course is missing verified fields: exchange eligibility, syllabus_url/,
  )
})

test('exchange eligibility does not substitute for explicit Bachelor eligibility', () => {
  assert.throws(
    () => normalizeCourseRecord({ ...currentCourse, bachelor_eligible: '' }),
    /current_verified course is missing verified fields: Bachelor eligibility/,
  )
})

test('requires a timestamp rather than a loosely parsed source date', () => {
  assert.throws(
    () => normalizeCourseRecord({ ...currentCourse, source_checked_at: 'September 2026' }),
    /current_verified course is missing verified fields: source_checked_at/,
  )
})

test('course imports require HTTPS source and syllabus URLs', () => {
  assert.throws(
    () => normalizeCourseRecord({ ...currentCourse, catalog_url: 'http://host.example.edu/catalog' }),
    /catalog_url must use HTTPS/,
  )
})

test('supports validated JSON and CSV uploads and rejects duplicate listings', () => {
  const json = parseCourseData(JSON.stringify({ courses: [currentCourse] }), 'courses.json')
  assert.equal(json.length, 1)

  const csv = [
    Object.keys(currentCourse).join(','),
    Object.values(currentCourse).join(','),
  ].join('\n')
  assert.equal(parseCourseData(csv, 'courses.csv')[0].courseCode, 'MKT101')
  assert.throws(() => validateCourseRecords([currentCourse, currentCourse]), /Duplicate course listing/)
  assert.throws(() => parseCourseData('[]', 'courses.json'), /at least one course record/)
})

test('new imports update matching course listings without removing unrelated records', () => {
  const [first] = validateCourseRecords([currentCourse])
  const [updated, other] = validateCourseRecords([
    { ...currentCourse, course_title: 'Marketing Strategy updated' },
    { ...currentCourse, course_code: 'MKT102' },
  ])
  const merged = mergeCourseRecords([first], [updated, other])

  assert.equal(merged.length, 2)
  assert.equal(merged.find((course) => course.courseCode === 'MKT101').title, 'Marketing Strategy updated')
})

test('Ghent course verification reflects official 2026-2027 source coverage', () => {
  const records = validateCourseRecords(featuredCourseCandidates)
  const ghent = records.filter((course) => course.erasmusCode === 'B GENT 01')

  assert.equal(records.length, 139)
  assert.equal(ghent.length, 33)
  assert.equal(ghent.filter((course) => course.verificationStatus === 'current_verified').length, 28)
  assert.equal(ghent.filter((course) => course.description).length, 28)
  assert.equal(ghent.filter((course) => course.learningOutcomes).length, 29)
  assert.equal(ghent.filter((course) => course.exchangeEligible === true).length, 29)
  assert.equal(ghent.filter((course) => course.bachelorEligible === true).length, 29)

  const unresolvedCodes = ghent.filter((course) => course.courseCode.startsWith('CATALOG-GHENT-'))
  assert.equal(unresolvedCodes.length, 3)
  assert.ok(unresolvedCodes.every((course) => course.verificationStatus === 'unverified_candidate'))

  const economics = ghent.find((course) => course.title === 'Economics')
  assert.equal(economics.verificationStatus, 'unverified_candidate')
  assert.equal(economics.bachelorEligible, null)

  const businessSkills = ghent.find((course) => course.title === 'Business Skills')
  assert.equal(businessSkills.verificationStatus, 'unverified_candidate')
  assert.equal(businessSkills.exchangeEligible, null)
})

test('Comenius verification distinguishes current sheets from stale or conflicting sources', () => {
  const records = validateCourseRecords(featuredCourseCandidates)
  const comenius = records.filter((course) => course.erasmusCode === 'SK BRATISL 02')

  assert.equal(records.length, 139)
  assert.equal(comenius.length, 51)
  assert.equal(comenius.filter((course) => course.verificationStatus === 'current_verified').length, 15)
  assert.equal(comenius.filter((course) => course.verificationStatus === 'unverified_candidate').length, 36)
  assert.equal(comenius.filter((course) => course.ects !== null).length, 51)
  assert.equal(comenius.filter((course) => course.exchangeEligible === true).length, 51)
  assert.equal(comenius.filter((course) => course.syllabusText).length, 39)
  assert.equal(comenius.filter((course) => course.learningOutcomes).length, 39)

  const codeConflict = comenius.find((course) => course.title === 'International Financial Reporting Standards')
  assert.equal(codeConflict.verificationStatus, 'unverified_candidate')
  assert.equal(codeConflict.syllabusUrl, null)
  assert.match(codeConflict.notes, /FM\.KEF\/271AB\/21/)

  const languageUnknown = comenius.find((course) => course.title === 'Droit commercial français (FL)')
  assert.equal(languageUnknown.language, null)
  assert.equal(languageUnknown.verificationStatus, 'unverified_candidate')

  const parallelCourseCode = comenius.find((course) => course.title === 'Project management - Foundation FR')
  assert.equal(parallelCourseCode.verificationStatus, 'unverified_candidate')
  assert.match(parallelCourseCode.courseCode, /ENTRY-2/)
})
