import { parseCsv } from '../utils/parseCsv.js'

const terms = new Set(['winter', 'spring'])
const statuses = new Set(['current_verified', 'historical', 'unverified_candidate'])

function firstValue(record, ...keys) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return String(record[key]).trim()
  }
  return ''
}

function parseBoolean(value) {
  const normalized = String(value).trim().toLowerCase()
  if (['true', 'yes', '1'].includes(normalized)) return true
  if (['false', 'no', '0'].includes(normalized)) return false
  return null
}

function normalizedStatus(value) {
  const normalized = value.trim().toLowerCase().replaceAll(' ', '_')
  if (['verified', 'current', 'current_verified'].includes(normalized)) return 'current_verified'
  if (['historical', 'historical_verified'].includes(normalized)) return 'historical'
  if (['candidate', 'unverified', 'unverified_candidate'].includes(normalized)) {
    return 'unverified_candidate'
  }
  return normalized
}

function validHttpUrl(value, field, rowNumber) {
  if (!value) return null
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`Row ${rowNumber}: ${field} must be a valid HTTPS URL.`)
  }
  if (url.protocol !== 'https:') {
    throw new Error(`Row ${rowNumber}: ${field} must use HTTPS.`)
  }
  return url.href
}

function isValidTimestamp(value) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
}

export function normalizeCourseRecord(record, rowNumber = 1) {
  const partnerId = firstValue(record, 'partner_id', 'partnerId')
  const erasmusCode = firstValue(record, 'erasmus_code', 'erasmusCode')
  const academicYear = firstValue(record, 'academic_year', 'academicYear')
  const semester = firstValue(record, 'term', 'semester')
    .toLowerCase()
    .replace('winter', 'winter')
    .replace('spring', 'spring')
  const courseCode = firstValue(record, 'course_code', 'courseCode')
  const title = firstValue(record, 'course_title', 'title', 'courseTitle')
  const rawEcts = firstValue(record, 'ects')
  const ects = rawEcts === '' ? null : Number(rawEcts)
  const language = firstValue(record, 'language')
  const studyLevel = firstValue(record, 'study_level', 'studyLevel')
  const bachelorEligible = parseBoolean(firstValue(record, 'bachelor_eligible', 'bachelorEligible'))
  const exchangeEligible = parseBoolean(firstValue(record, 'exchange_eligible', 'exchangeEligible'))
  const syllabusUrl = validHttpUrl(firstValue(record, 'syllabus_url', 'syllabusUrl'), 'syllabus_url', rowNumber)
  const catalogUrl = validHttpUrl(firstValue(record, 'catalog_url', 'catalogUrl', 'source_url', 'sourceUrl'), 'catalog_url', rowNumber)
  const description = firstValue(record, 'description', 'course_description')
  const syllabusText = firstValue(record, 'syllabus_text', 'syllabusText')
  const learningOutcomes = firstValue(record, 'learning_outcomes', 'learningOutcomes')
  const rawSubjectCategories = record.subject_categories ?? record.subjectCategories ?? ''
  const subjectCategories = Array.isArray(rawSubjectCategories)
    ? rawSubjectCategories.map((category) => String(category).trim()).filter(Boolean)
    : String(rawSubjectCategories).split(/[|;]/).map((category) => category.trim()).filter(Boolean)
  const subjectCategoriesVerified = parseBoolean(firstValue(
    record,
    'subject_categories_verified',
    'subjectCategoriesVerified',
  ))
  const lastCheckedAt = firstValue(record, 'source_checked_at', 'last_checked_at', 'lastCheckedAt')
  const verificationStatus = normalizedStatus(firstValue(record, 'verification_status', 'verificationStatus', 'status'))

  if (!partnerId && !erasmusCode) throw new Error(`Row ${rowNumber}: partner_id or erasmus_code is required.`)
  if (!academicYear) throw new Error(`Row ${rowNumber}: academic_year is required.`)
  if (!terms.has(semester)) throw new Error(`Row ${rowNumber}: term must be winter or spring.`)
  if (!courseCode || !title) throw new Error(`Row ${rowNumber}: course_code and course_title are required.`)
  if (!statuses.has(verificationStatus)) {
    throw new Error(`Row ${rowNumber}: verification_status must be current_verified, historical or unverified_candidate.`)
  }
  if (rawEcts && (!Number.isFinite(ects) || ects <= 0)) {
    throw new Error(`Row ${rowNumber}: ECTS must be a positive number or blank.`)
  }

  if (verificationStatus === 'current_verified') {
    const missing = [
      ['ECTS', ects !== null],
      ['language', Boolean(language)],
      ['Bachelor eligibility', bachelorEligible !== null],
      ['exchange eligibility', exchangeEligible !== null],
      ['syllabus_url', Boolean(syllabusUrl)],
      ['catalog_url', Boolean(catalogUrl)],
      ['source_checked_at', isValidTimestamp(lastCheckedAt)],
    ].filter(([, present]) => !present).map(([field]) => field)
    if (missing.length > 0) {
      throw new Error(`Row ${rowNumber}: current_verified course is missing verified fields: ${missing.join(', ')}.`)
    }
  }

  return {
    id: `${partnerId || erasmusCode}:${academicYear}:${semester}:${courseCode}`,
    partnerId,
    erasmusCode,
    academicYear,
    semester,
    courseCode,
    title,
    ects,
    language: language || null,
    studyLevel: studyLevel || null,
    bachelorEligible,
    exchangeEligible,
    description: description || null,
    syllabusText: syllabusText || null,
    learningOutcomes: learningOutcomes || null,
    subjectCategories,
    subjectCategoriesVerified,
    syllabusUrl,
    catalogUrl,
    lastCheckedAt: isValidTimestamp(lastCheckedAt) ? new Date(lastCheckedAt).toISOString() : null,
    verificationStatus,
    notes: firstValue(record, 'notes'),
  }
}

export function validateCourseRecords(records) {
  if (!Array.isArray(records)) throw new Error('Course data must be a JSON array or an object with a courses array.')
  const normalized = records.map((record, index) => normalizeCourseRecord(record, index + 1))
  const ids = new Set()
  for (const course of normalized) {
    if (ids.has(course.id)) throw new Error(`Duplicate course listing: ${course.courseCode} (${course.academicYear}, ${course.semester}).`)
    ids.add(course.id)
  }
  return normalized
}

export function parseCourseData(text, fileName) {
  const extension = fileName.toLowerCase().split('.').pop()
  let records
  if (extension === 'json') {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`, { cause: error })
    }
    records = Array.isArray(parsed) ? parsed : parsed?.courses
  } else if (extension === 'csv') {
    records = parseCsv(text)
  } else {
    throw new Error('Choose a .json or .csv course data file.')
  }
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('The import must contain at least one course record.')
  }
  return validateCourseRecords(records)
}

export function mergeCourseRecords(existing, incoming) {
  const records = new Map(existing.map((course) => [course.id, course]))
  for (const course of incoming) records.set(course.id, course)
  return [...records.values()]
}
