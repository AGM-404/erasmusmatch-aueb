import { isStrictlyVerifiedHostCourse } from './approvalRequest.js'

const stopWords = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'about', 'this', 'that', 'course',
  'courses', 'introduction', 'principles', 'study', 'studies', 'of', 'to', 'in',
  'on', 'at', 'by', 'an', 'a', 'και', 'στη', 'στο', 'στις', 'στα', 'των', 'του',
  'της', 'τα', 'τις', 'με', 'για', 'από', 'εισαγωγη', 'μαθημα', 'μαθηματα',
])

const topicAliases = new Map([
  ['πληροφορικη', 'computing'],
  ['υπολογιστης', 'computing'],
  ['υπολογιστες', 'computing'],
  ['υπολογιστικα', 'computing'],
  ['computer', 'computing'],
  ['computers', 'computing'],
  ['computing', 'computing'],
  ['informatics', 'computing'],
  ['βαση', 'database'],
  ['βασης', 'database'],
  ['βασεις', 'database'],
  ['βασεων', 'database'],
  ['database', 'database'],
  ['databases', 'database'],
  ['sql', 'database'],
  ['δεδομενα', 'data'],
  ['δεδομενων', 'data'],
  ['data', 'data'],
  ['διαχειριση', 'management'],
  ['management', 'management'],
  ['δικτυο', 'network'],
  ['δικτυα', 'network'],
  ['network', 'network'],
  ['networks', 'network'],
])

const broadTopics = new Set([
  'business',
  'computing',
  'data',
  'economics',
  'management',
  'marketing',
  'network',
  'psychology',
])

function searchableTerms(value) {
  return new Set(
    [...new Set(
      String(value ?? '')
        .normalize('NFKD')
        .replace(/\p{Diacritic}/gu, '')
        .toLocaleLowerCase()
        .match(/[\p{L}\p{N}]{3,}/gu)
        ?.filter((term) => !stopWords.has(term)) ?? [],
    )].map((term) => topicAliases.get(term) ?? term),
  )
}

function courseContent(course) {
  return [
    course.description,
    course.syllabusText,
    course.learningOutcomes,
  ].filter((value) => typeof value === 'string' && value.trim()).join(' ')
}

function overlap(left, right) {
  return [...left].filter((term) => right.has(term))
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function secureOfficialAuebSource(course) {
  return isHttpsUrl(course.officialUrl)
}

function verifiedAuebCourse(course) {
  const missing = []
  if (!['verified', 'current_verified'].includes(course.catalogStatus) &&
      course.verificationStatus !== 'current_verified') {
    missing.push('official AUEB course details are not verified')
  }
  if (!course.courseCode) missing.push('AUEB course code is unknown')
  if (!Number.isFinite(Number(course.ects)) || Number(course.ects) <= 0) missing.push('AUEB ECTS are unknown')
  if (!course.language) missing.push('AUEB course language is unknown')
  if (!Number.isInteger(Number(course.semester)) || Number(course.semester) < 1 || Number(course.semester) > 8) {
    missing.push('AUEB course semester is unknown')
  }
  if (!secureOfficialAuebSource(course)) missing.push('verified official AUEB source is unavailable')
  if (!courseContent(course)) missing.push('AUEB course description, syllabus text or learning outcomes are unavailable')
  return { verified: missing.length === 0, missing }
}

function languageIsSuitable(course, studentLanguages) {
  const language = String(course.language ?? '').toLocaleLowerCase()
  return studentLanguages.some(({ language: studentLanguage }) =>
    String(studentLanguage).toLocaleLowerCase() === language,
  )
}

export function calculateAcademicMatch({
  auebCourses = [],
  hostCourses = [],
  semester,
  studentLanguages = [],
  partner = {},
} = {}) {
  const selectedCourses = auebCourses.filter((course) => course.selected !== false)
  const missingEvidence = new Set()
  const potentialPairs = []
  const strongPairs = []
  const reasons = []

  if (selectedCourses.length === 0) {
    return {
      score: null,
      status: 'pending',
      potentialPairs,
      strongPairs,
      reasons,
      missingEvidence: ['Select AUEB courses in Profile to assess academic fit.'],
    }
  }

  const catalogComplete =
    partner.semesterCatalogs?.[semester] === 'verified' &&
    partner.courseDataStatus === 'verified'
  if (!catalogComplete) {
    missingEvidence.add(`A complete verified ${semester} host-course catalog is unavailable.`)
  }
  if (partner.studentEligibilityVerified !== true) {
    missingEvidence.add('Student-level eligibility and exchange restrictions are not verified.')
  }
  if (hostCourses.length === 0) {
    missingEvidence.add(`No host-course listings are available for the ${semester} semester.`)
  }
  if (studentLanguages.length === 0) {
    missingEvidence.add('Add your study languages in Profile to assess host-course teaching-language suitability.')
  }

  const hostRecordsVerified = hostCourses.length > 0 && hostCourses.every((course) =>
    isStrictlyVerifiedHostCourse(course, semester),
  )
  if (!hostRecordsVerified) {
    missingEvidence.add('One or more host listings lack strict verification of ECTS, semester, language, eligibility, sources or source-check date.')
  }
  const hostDescriptionsComplete = hostCourses.length > 0 && hostCourses.every((course) => courseContent(course))
  if (!hostDescriptionsComplete) {
    missingEvidence.add('Verified host descriptions, syllabus text or learning outcomes are unavailable.')
  }

  let coursesWithStrongEvidence = 0
  let auebEvidenceComplete = true
  for (const auebCourse of selectedCourses) {
    const auebEvidence = verifiedAuebCourse(auebCourse)
    if (!auebEvidence.verified) {
      auebEvidenceComplete = false
      for (const item of auebEvidence.missing) {
        missingEvidence.add(`${auebCourse.title}: ${item}.`)
      }
    }

    const auebTopics = searchableTerms(auebCourse.title)
    const auebContent = searchableTerms(courseContent(auebCourse))
    let hasStrongMatch = false
    for (const hostCourse of hostCourses) {
      const sharedTitleTopics = overlap(auebTopics, searchableTerms(hostCourse.title))
      const sharedContentTopics = overlap(auebContent, searchableTerms(courseContent(hostCourse)))
      const specificTitleTopics = sharedTitleTopics.filter((topic) => !broadTopics.has(topic))
      const meaningfulContentTopics = sharedContentTopics.filter((topic) => !broadTopics.has(topic))
      const independentContentTopics = sharedContentTopics.filter((topic) =>
        !sharedTitleTopics.includes(topic),
      )
      const supportingContent = sharedTitleTopics.length > 0
        ? meaningfulContentTopics.length > 0 || independentContentTopics.length > 0
        : meaningfulContentTopics.length > 0
      if (!supportingContent) continue
      const sharedTopics = [...new Set([...sharedTitleTopics, ...sharedContentTopics])]
      const pairMissing = []
      if (sharedTitleTopics.length === 0) {
        pairMissing.push('matching topical evidence in both course titles')
      } else if (specificTitleTopics.length === 0) {
        pairMissing.push('a specific topic shared by both course titles beyond broad subject terms')
      }
      if (!courseContent(auebCourse)) {
        pairMissing.push('AUEB descriptions, syllabus text or learning outcomes')
      }
      if (!courseContent(hostCourse)) {
        pairMissing.push('host descriptions, syllabus text or learning outcomes')
      }
      if (meaningfulContentTopics.length < 3) {
        pairMissing.push('meaningful overlap in descriptions, syllabi or learning outcomes')
      }
      if (!auebEvidence.verified) pairMissing.push(...auebEvidence.missing)
      if (!isStrictlyVerifiedHostCourse(hostCourse, semester)) {
        pairMissing.push('strict verification of host ECTS, semester, language, eligibility and source')
      }
      if (!languageIsSuitable(hostCourse, studentLanguages)) {
        pairMissing.push('a declared student language matching the host course language')
      }
      if (!catalogComplete) pairMissing.push('a complete verified host catalog')

      const strong = pairMissing.length === 0
      const pair = {
        auebCourseId: auebCourse.id,
        auebTitle: auebCourse.title,
        auebCourseCode: auebCourse.courseCode,
        auebUrl: auebCourse.officialUrl,
        hostCourseId: hostCourse.id,
        hostTitle: hostCourse.title,
        hostCourseCode: hostCourse.courseCode,
        hostUrl: hostCourse.catalogUrl,
        hostSyllabusUrl: hostCourse.syllabusUrl,
        hostEcts: hostCourse.ects,
        auebEcts: auebCourse.ects,
        hostSemester: hostCourse.semester,
        auebSemester: auebCourse.semester,
        hostLanguage: hostCourse.language,
        bachelorEligible: hostCourse.bachelorEligible,
        exchangeEligible: hostCourse.exchangeEligible,
        hostVerificationStatus: hostCourse.verificationStatus,
        sharedTopics,
        sharedTitleTopics,
        sharedContent: meaningfulContentTopics,
        topicEvidenceSources: [
          ...(sharedTitleTopics.length > 0 ? ['course titles'] : []),
          ...(sharedContentTopics.length > 0 ? ['descriptions, syllabi or learning outcomes'] : []),
        ],
        missingEvidence: [...new Set(pairMissing)],
        status: strong ? 'evidence_supported_potential' : 'unverified_potential',
      }
      potentialPairs.push(pair)
      if (strong) {
        strongPairs.push(pair)
        hasStrongMatch = true
      }
    }

    if (hasStrongMatch) {
      coursesWithStrongEvidence += 1
      const matches = strongPairs
        .filter((pair) => pair.auebCourseId === auebCourse.id)
        .map((pair) => `${pair.hostTitle} (shared topic evidence: ${pair.sharedTopics.join(', ')}; content evidence: ${pair.sharedContent.join(', ')})`)
      reasons.push(`${auebCourse.title} has verified topic and course-content overlap with ${matches.join('; ')}. This remains a proposal, not an approved equivalency.`)
    } else {
      const titleCandidates = potentialPairs.filter((pair) => pair.auebCourseId === auebCourse.id)
      if (titleCandidates.length) {
        reasons.push(`${auebCourse.title} shares title/topic terms with ${titleCandidates.map((pair) =>
          `${pair.hostTitle}, but ${pair.missingEvidence.join(' and ')}`,
        ).join('; ')}. This is not a verified match.`)
      } else {
        reasons.push(`${auebCourse.title}: no host title/topic overlap can be established from the available listings; descriptions and learning outcomes are also unavailable for comparison.`)
      }
    }
  }

  const sufficientEvidence = catalogComplete &&
    hostRecordsVerified &&
    hostDescriptionsComplete &&
    partner.studentEligibilityVerified === true &&
    studentLanguages.length > 0 &&
    auebEvidenceComplete
  const score = sufficientEvidence
    ? Math.round(coursesWithStrongEvidence / selectedCourses.length * 100)
    : null
  return {
    score,
    status: score === null ? 'pending' : score > 0 ? 'supported' : 'no_verified_fit',
    potentialPairs,
    strongPairs,
    reasons,
    missingEvidence: [...missingEvidence],
  }
}
