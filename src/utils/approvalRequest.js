export const approvalStatuses = [
  'Draft',
  'Awaiting Review',
  'Approved',
  'Changes Requested',
  'Rejected',
]

function knownEcts(course) {
  const ects = Number(course.ects)
  return course.ects !== null &&
    course.ects !== undefined &&
    course.ects !== '' &&
    Number.isFinite(ects) &&
    ects > 0
    ? ects
    : 0
}

function hasSecureSource(value) {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function hasValidTimestamp(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
}

export function isStrictlyVerifiedHostCourse(course, semester) {
  return course.verificationStatus === 'current_verified' &&
    knownEcts(course) > 0 &&
    Boolean(course.academicYear) &&
    ['winter', 'spring'].includes(course.semester) &&
    Boolean(course.language) &&
    course.bachelorEligible === true &&
    course.exchangeEligible === true &&
    hasSecureSource(course.catalogUrl) &&
    hasSecureSource(course.syllabusUrl) &&
    hasValidTimestamp(course.lastCheckedAt) &&
    (semester === undefined || course.semester === semester)
}

function sumEcts(courses) {
  const seen = new Set()
  return courses.reduce((total, course) => {
    const id = course.id ?? course.courseId
    if (id !== undefined && id !== null) {
      if (seen.has(id)) return total
      seen.add(id)
    }
    return total + knownEcts(course)
  }, 0)
}

export function toggleCoursePairing(pairings, hostCourseId, auebCourseId) {
  const exists = pairings.some((pairing) =>
    pairing.hostCourseId === hostCourseId && pairing.auebCourseId === auebCourseId,
  )
  if (exists) {
    return pairings.filter((pairing) =>
      pairing.hostCourseId !== hostCourseId || pairing.auebCourseId !== auebCourseId,
    )
  }
  return [...pairings, { hostCourseId, auebCourseId }]
}

export function normalizeCoursePairings(pairings, hostCourses, auebCourses) {
  const hostIds = new Set(hostCourses.map((course) => course.id))
  const auebIds = new Set(auebCourses.map((course) => course.id))
  const seen = new Set()
  return pairings.filter((pairing) => {
    if (!hostIds.has(pairing.hostCourseId) || !auebIds.has(pairing.auebCourseId)) return false
    const key = `${pairing.hostCourseId}\u0000${pairing.auebCourseId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function calculatePairingEcts({
  hostCourses = [],
  auebCourses = [],
  pairings = [],
  auebEctsByCourse = {},
} = {}) {
  const normalizedPairings = normalizeCoursePairings(pairings, hostCourses, auebCourses)
  const mappedHostIds = new Set(normalizedPairings.map((pairing) => pairing.hostCourseId))
  const mappedAuebIds = new Set(normalizedPairings.map((pairing) => pairing.auebCourseId))
  const mappedHostCourses = hostCourses.filter((course) => mappedHostIds.has(course.id))
  const mappedAuebCourses = auebCourses
    .filter((course) => mappedAuebIds.has(course.id))
    .map((course) => ({
      ...course,
      ects: auebEctsByCourse[course.id] ?? course.ects ?? null,
    }))

  return {
    pairings: normalizedPairings,
    mappedHostCourses,
    mappedAuebCourses,
    hostEcts: sumEcts(mappedHostCourses),
    auebEcts: sumEcts(mappedAuebCourses),
  }
}

export function isSelectableHostCourse(course) {
  return course.verificationStatus === 'current_verified' ||
    course.verificationStatus === 'unverified_candidate'
}

export function toggleSelectedHostCourse(selectedIds, course) {
  if (!isSelectableHostCourse(course)) return selectedIds
  return selectedIds.includes(course.id)
    ? selectedIds.filter((id) => id !== course.id)
    : [...selectedIds, course.id]
}

export function getCourseReviewWarnings(course, plannedSemester) {
  const warnings = []
  if (knownEcts(course) === 0) warnings.push('Missing ECTS')
  if (!['winter', 'spring'].includes(course.semester)) {
    warnings.push('Unknown semester')
  } else if (plannedSemester && course.semester !== plannedSemester) {
    warnings.push(`Semester mismatch: ${course.semester} course, ${plannedSemester} planned`)
  }
  if (course.bachelorEligible === null || course.bachelorEligible === undefined) {
    warnings.push('Bachelor eligibility unknown')
  } else if (course.bachelorEligible !== true) {
    warnings.push('Bachelor eligibility not confirmed')
  }
  if (course.exchangeEligible === null || course.exchangeEligible === undefined) {
    warnings.push('Exchange eligibility unknown')
  } else if (course.exchangeEligible !== true) {
    warnings.push('Exchange eligibility not confirmed')
  }
  if (course.verificationStatus !== 'current_verified') {
    warnings.push(`Course verification unresolved: ${course.verificationStatus.replaceAll('_', ' ')}`)
  }
  return warnings
}

export function createMailtoLink(to, subject, body, maxLength = 1800) {
  const recipient = encodeURIComponent(to).replaceAll('%40', '@')
  const href = `mailto:${recipient}?${new URLSearchParams({ subject, body })}`
  return { href, requiresCopyFallback: href.length > maxLength }
}

export function buildApprovalEmail({
  student = {},
  coordinatorEmail = '',
  partner,
  semester,
  hostCourses,
  auebCourses = [],
  pairings = [],
  minimumHostEcts = 30,
  minimumAuebEcts = 30,
}) {
  if (coordinatorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(coordinatorEmail)) {
    throw new Error('Enter a valid coordinator email address before creating the request.')
  }
  if (!partner || !Array.isArray(hostCourses) || hostCourses.length === 0) {
    throw new Error('Select a partner and at least one host course.')
  }
  if (!Array.isArray(auebCourses)) {
    throw new Error('Proposed AUEB courses must be a list.')
  }

  const readiness = getApprovalDraftReadiness({
    hostCourses,
    auebCourses,
    semester,
    minimumHostEcts,
    minimumAuebEcts,
  })
  const semesterLabel = semester === 'winter'
    ? 'Χειμερινό'
    : semester === 'spring'
      ? 'Εαρινό'
      : 'Άγνωστο'
  const hostLines = hostCourses.map((course, index) =>
    `${index + 1}. ${course.courseCode || 'No course code'} — ${course.title || 'Untitled course'} ` +
    `(${knownEcts(course) || 'Unknown'} ECTS, ${course.language || 'language unknown'})\n` +
    `   Semester: ${course.semester || 'Unknown'} · Status: ${course.verificationStatus?.replaceAll('_', ' ') || 'Unknown'}\n` +
    `   Bachelor eligibility: ${course.bachelorEligible === null || course.bachelorEligible === undefined ? 'Unknown' : course.bachelorEligible ? 'Eligible' : 'Not confirmed'} · ` +
    `Exchange eligibility: ${course.exchangeEligible === null || course.exchangeEligible === undefined ? 'Unknown' : course.exchangeEligible ? 'Eligible' : 'Not confirmed'}\n` +
    `   Catalog: ${course.catalogUrl || 'Not provided'}\n   Syllabus: ${course.syllabusUrl || 'Not provided'}\n` +
    `   Last source check: ${course.lastCheckedAt || 'Not provided'}`,
  )
  const auebLines = auebCourses.map((course, index) => {
    const officialListing = course.catalogStatus === 'official_listing_unverified'
    const courseStatus = course.catalogStatus === 'imported_unverified'
      ? 'imported, not verified'
      : officialListing
        ? 'listed by AUEB; course details not yet verified'
        : 'student-proposed, not verified'
    const courseCode = course.courseCode || (officialListing ? 'AUEB course code not yet verified' : 'No AUEB course code')
    const ects = knownEcts(course) || (officialListing ? 'Not yet verified' : 'Unknown')
    return `${index + 1}. ${courseCode} — ${course.title || course.auebTitle || 'Untitled AUEB course'} ` +
      `(${ects} ECTS; ${courseStatus})\n` +
      `   Official AUEB course page: ${course.officialUrl || 'Not provided'}\n` +
      `   Syllabus: ${course.syllabusUrl || (officialListing ? 'Not yet verified' : 'Not provided')}`
  })
  const hostById = new Map(hostCourses.map((course) => [course.id, course]))
  const auebById = new Map(auebCourses.map((course) => [course.id, course]))
  const pairingRows = pairings.map((pairing, index) => {
    const hostCourse = hostById.get(pairing.hostCourseId)
    const auebCourse = auebById.get(pairing.auebCourseId)
    if (!hostCourse || !auebCourse) return null
    const officialAuebListing = auebCourse.catalogStatus === 'official_listing_unverified'
    const auebCourseCode = auebCourse.courseCode || (officialAuebListing ? 'AUEB course code not yet verified' : 'No AUEB code')
    const auebEcts = knownEcts(auebCourse) || (officialAuebListing ? 'Not yet verified' : 'Unknown')
    return `${index + 1}. ${hostCourse.courseCode || 'No host code'} — ${hostCourse.title} (${knownEcts(hostCourse) || 'Unknown'} host ECTS) ` +
      `↔ ${auebCourseCode} — ${auebCourse.title || auebCourse.auebTitle} (${auebEcts} AUEB ECTS)\n` +
      `   Host syllabus: ${hostCourse.syllabusUrl || 'Not provided'}\n` +
      `   Official AUEB course page: ${auebCourse.officialUrl || 'Not provided'}\n` +
      `   AUEB syllabus: ${auebCourse.syllabusUrl || (officialAuebListing ? 'Not yet verified' : 'Not provided')}\n` +
      '   Status: Pending Academic Approval'
  }).filter(Boolean)
  const warnings = hostCourses.flatMap((course) =>
    getCourseReviewWarnings(course, semester).map((warning) =>
      `${course.courseCode || course.title || 'Host course'}: ${warning}`,
    ),
  )
  const mappedHostIds = new Set([
    ...pairings.map((pairing) => pairing.hostCourseId),
    ...auebCourses.map((course) => course.hostCourseId),
  ].filter(Boolean))
  const mappedHostTitles = new Set(auebCourses.map((course) => course.hostTitle).filter(Boolean))
  for (const course of hostCourses) {
    const hasMapping = course.id
      ? mappedHostIds.has(course.id)
      : mappedHostTitles.has(course.title)
    if (!hasMapping) {
      warnings.push(`${course.courseCode || course.title || 'Host course'}: No proposed AUEB equivalency.`)
    }
  }

  if (readiness.provisionalHostTotal < minimumHostEcts) {
    warnings.push(`Provisional host ECTS are below ${minimumHostEcts}.`)
  }
  if (readiness.proposedAuebTotal < minimumAuebEcts) {
    warnings.push(`Proposed AUEB ECTS are below ${minimumAuebEcts}.`)
  }
  if (readiness.verifiedHostTotal < minimumHostEcts) {
    warnings.push(`Strictly verified host ECTS are below ${minimumHostEcts}.`)
  }
  if (readiness.verifiedAuebTotal < minimumAuebEcts) {
    warnings.push(`Verified AUEB-recognized ECTS are below ${minimumAuebEcts}.`)
  }
  warnings.push('Academic approval is pending; this provisional draft is not approved.')

  const body = [
    'Αξιότιμε/η Συντονιστή/στρια Ακαδημαϊκών Θεμάτων Erasmus,',
    '',
    'Παρακαλώ να εξετάσετε το ακόλουθο ΠΡΟΣΩΡΙΝΟ προσχέδιο Learning Agreement και τις προτεινόμενες αντιστοιχίσεις μαθημάτων.',
    'Τα παρακάτω στοιχεία δεν αποτελούν ακαδημαϊκή έγκριση. Τα εκκρεμή ζητήματα απαιτούν επιβεβαίωση πριν το Learning Agreement θεωρηθεί έτοιμο για επίσημη χρήση.',
    '',
    `Στοιχεία φοιτητή/τριας: ${student.name || 'Δεν συμπληρώθηκε'}`,
    `Email: ${student.email || 'Δεν συμπληρώθηκε'}`,
    `Αριθμός μητρώου: ${student.studentNumber || 'Δεν συμπληρώθηκε'}`,
    `Τμήμα: ${student.department || 'Δεν συμπληρώθηκε'}`,
    `Πανεπιστήμιο υποδοχής: ${partner.university || 'Not provided'}`,
    `Κωδικός Erasmus: ${partner.erasmusCode || 'Not provided'}`,
    `Ακαδημαϊκό έτος: ${hostCourses[0].academicYear || 'Unknown'}`,
    `Εξάμηνο Erasmus: ${semesterLabel}`,
    '',
    `Μαθήματα πανεπιστημίου υποδοχής — provisional total ${readiness.provisionalHostTotal} ECTS; strictly verified ${readiness.verifiedHostTotal} ECTS:`,
    ...hostLines,
    '',
    `Προτεινόμενες αντιστοιχίσεις ΟΠΑ — ${readiness.proposedAuebTotal} proposed ECTS:`,
    ...(auebLines.length > 0 ? auebLines : ['No AUEB equivalencies proposed yet.']),
    '',
    'Complete proposed course pairing table (each course ECTS is counted once in totals, even if it appears in multiple pairings):',
    ...(pairingRows.length > 0 ? pairingRows : ['No course pairings proposed.']),
    '',
    'Unresolved issues requiring coordinator confirmation:',
    ...warnings.map((warning) => `- ${warning}`),
    '',
    'No course equivalency or ECTS proposal in this message has been approved. Please advise which courses, eligibility details, sources, semester information and ECTS values require correction or confirmation.',
    '',
    'Με εκτίμηση,',
    student.name || '[Ονοματεπώνυμο φοιτητή/τριας]',
  ].join('\n')
  const subject = `Αίτημα ελέγχου προσχεδίου Erasmus — ${partner.university || 'Host university'}`
  const mailto = coordinatorEmail
    ? createMailtoLink(coordinatorEmail, subject, body)
    : { href: null, requiresCopyFallback: true }

  return {
    to: coordinatorEmail,
    subject,
    body,
    mailto: mailto.href,
    requiresCopyFallback: mailto.requiresCopyFallback,
    hostTotal: readiness.provisionalHostTotal,
    provisionalHostTotal: readiness.provisionalHostTotal,
    verifiedHostTotal: readiness.verifiedHostTotal,
    auebTotal: readiness.proposedAuebTotal,
    proposedAuebTotal: readiness.proposedAuebTotal,
  }
}

export function getApprovalDraftReadiness({
  hostCourses = [],
  auebCourses = [],
  semester,
  minimumHostEcts = 30,
  minimumAuebEcts = 30,
} = {}) {
  const provisionalHostTotal = sumEcts(hostCourses)
  const verifiedHostTotal = hostCourses.reduce(
    (total, course) => total + (isStrictlyVerifiedHostCourse(course, semester) ? knownEcts(course) : 0),
    0,
  )
  const proposedAuebTotal = sumEcts(auebCourses)
  const seenVerifiedAueb = new Set()
  const verifiedAuebTotal = auebCourses.reduce((total, course) => {
    const id = course.id ?? course.courseId
    if (id !== undefined && id !== null) {
      if (seenVerifiedAueb.has(id)) return total
      seenVerifiedAueb.add(id)
    }
    return total + (course.verified === true ? knownEcts(course) : 0)
  }, 0)
  const hostReady = verifiedHostTotal >= minimumHostEcts
  const auebReady = verifiedAuebTotal >= minimumAuebEcts

  return {
    provisionalHostTotal,
    verifiedHostTotal,
    proposedAuebTotal,
    verifiedAuebTotal,
    hostTotal: provisionalHostTotal,
    auebTotal: proposedAuebTotal,
    hostReady,
    auebReady,
    draftReady: hostCourses.length > 0,
    complete: hostCourses.length > 0 && auebCourses.length > 0 && hostReady && auebReady,
  }
}
