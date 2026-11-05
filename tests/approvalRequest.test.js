import assert from 'node:assert/strict'
import test from 'node:test'
import {
  approvalStatuses,
  buildApprovalEmail,
  calculatePairingEcts,
  createMailtoLink,
  getApprovalDraftReadiness,
  getCourseReviewWarnings,
  isSelectableHostCourse,
  toggleCoursePairing,
  toggleSelectedHostCourse,
} from '../src/utils/approvalRequest.js'

const verifiedHostCourse = {
  id: 'host-1',
  courseCode: 'HOST101',
  title: 'Marketing',
  ects: 30,
  language: 'English',
  academicYear: '2026-2027',
  semester: 'winter',
  verificationStatus: 'current_verified',
  bachelorEligible: true,
  exchangeEligible: true,
  catalogUrl: 'https://host.example.edu/catalog',
  syllabusUrl: 'https://host.example.edu/syllabus',
  lastCheckedAt: '2026-01-01T10:00:00Z',
}
const candidateCourse = {
  ...verifiedHostCourse,
  id: 'host-candidate',
  courseCode: 'CAND101',
  ects: 6,
  verificationStatus: 'unverified_candidate',
  language: null,
  semester: 'spring',
  bachelorEligible: null,
  exchangeEligible: null,
  catalogUrl: null,
  syllabusUrl: null,
  lastCheckedAt: null,
}
const auebCourses = [{ hostTitle: 'Marketing', auebTitle: 'Marketing Strategy', ects: 30 }]

test('allows selecting verified and unverified candidate courses but not historical listings', () => {
  const historicalCourse = { ...verifiedHostCourse, id: 'old-course', verificationStatus: 'historical' }

  assert.equal(isSelectableHostCourse(verifiedHostCourse), true)
  assert.equal(isSelectableHostCourse(candidateCourse), true)
  assert.equal(isSelectableHostCourse(historicalCourse), false)
  assert.deepEqual(toggleSelectedHostCourse([], candidateCourse), ['host-candidate'])
  assert.deepEqual(toggleSelectedHostCourse(['host-candidate'], candidateCourse), [])
  assert.deepEqual(toggleSelectedHostCourse([], historicalCourse), [])
})

test('separates provisional, strictly verified and proposed ECTS totals', () => {
  const readiness = getApprovalDraftReadiness({
    hostCourses: [verifiedHostCourse, candidateCourse, { ...candidateCourse, id: 'unknown-ects', ects: null }],
    auebCourses,
    semester: 'winter',
  })

  test('supports many-to-many pairings and counts each mapped course ECTS only once', () => {
    const hostCourses = [
      { ...candidateCourse, id: 'host-a', ects: 6 },
      { ...candidateCourse, id: 'host-b', ects: 3 },
    ]
    const auebCourses = [
      { id: 'aueb-a', title: 'AUEB A', ects: 5 },
      { id: 'aueb-b', title: 'AUEB B', ects: 4 },
    ]
    const pairings = [
      { hostCourseId: 'host-a', auebCourseId: 'aueb-a' },
      { hostCourseId: 'host-a', auebCourseId: 'aueb-b' },
      { hostCourseId: 'host-b', auebCourseId: 'aueb-a' },
      { hostCourseId: 'host-a', auebCourseId: 'aueb-a' },
      { hostCourseId: 'not-selected', auebCourseId: 'aueb-b' },
    ]
    const totals = calculatePairingEcts({
      hostCourses,
      auebCourses,
      pairings,
    })

    assert.equal(totals.pairings.length, 3)
    assert.equal(totals.hostEcts, 9)
    assert.equal(totals.auebEcts, 9)
    assert.equal(totals.mappedHostCourses.length, 2)
    assert.equal(totals.mappedAuebCourses.length, 2)
    assert.equal(toggleCoursePairing(totals.pairings, 'host-b', 'aueb-b').length, 4)
    assert.equal(toggleCoursePairing(totals.pairings, 'host-a', 'aueb-a').length, 2)
  })

  assert.equal(readiness.provisionalHostTotal, 36)
  assert.equal(readiness.verifiedHostTotal, 30)
  assert.equal(readiness.proposedAuebTotal, 30)
  assert.equal(readiness.verifiedAuebTotal, 0)
  assert.equal(readiness.draftReady, true)
  assert.equal(readiness.complete, false)
})

test('builds a reviewable email without a recipient or met ECTS targets and lists unresolved issues', () => {
  const draft = buildApprovalEmail({
    student: { name: 'Student Example', email: 'student@example.edu', studentNumber: '12345', department: 'MBC' },
    coordinatorEmail: '',
    partner: { university: 'Host University', erasmusCode: 'F TEST 01' },
    semester: 'winter',
    hostCourses: [candidateCourse],
    auebCourses: [],
  })

  assert.equal(draft.to, '')
  assert.equal(draft.mailto, null)
  assert.equal(draft.requiresCopyFallback, true)
  assert.equal(draft.provisionalHostTotal, 6)
  assert.equal(draft.verifiedHostTotal, 0)
  assert.equal(draft.proposedAuebTotal, 0)
  assert.match(draft.subject, /Erasmus/)
  assert.match(draft.body, /Student Example/)
  assert.match(draft.body, /Provisional host ECTS/)
  assert.match(draft.body, /unverified candidate/)
  assert.match(draft.body, /Bachelor eligibility: Unknown/)
  assert.match(draft.body, /Exchange eligibility: Unknown/)
  assert.match(draft.body, /Semester mismatch/)
  assert.match(draft.body, /No proposed AUEB equivalency/)
  assert.match(draft.body, /Missing ECTS|6 ECTS/)
  assert.match(draft.body, /Academic approval is pending/)
  assert.match(draft.body, /has been approved/)
})

test('uses a supplied coordinator address and includes source links in the review draft', () => {
  const draft = buildApprovalEmail({
    student: { name: 'Student Example' },
    coordinatorEmail: 'coordinator@example.edu',
    partner: { university: 'Host University', erasmusCode: 'F TEST 01' },
    semester: 'winter',
    hostCourses: [verifiedHostCourse],
    auebCourses,
  })

  test('email includes complete course pairings, separate ECTS and both syllabus links', () => {
    const host = { ...verifiedHostCourse, ects: 6 }
    const secondHost = { ...candidateCourse, id: 'host-2', courseCode: 'HOST102', title: 'Consumer Research', ects: 4 }
    const aueb = {
      id: 'aueb-course-1',
      courseCode: 'AUEB101',
      title: 'Marketing Strategy',
      ects: 5,
      syllabusUrl: 'https://aueb.example.edu/syllabus',
      officialUrl: 'https://www.dept.aueb.gr/el/mbc/content/marketing-strategy',
    }
    const draft = buildApprovalEmail({
      student: {},
      partner: { university: 'Host University' },
      semester: 'winter',
      hostCourses: [host, secondHost],
      auebCourses: [aueb],
      pairings: [
        { hostCourseId: host.id, auebCourseId: aueb.id },
        { hostCourseId: secondHost.id, auebCourseId: aueb.id },
      ],
    })

    assert.equal(draft.hostTotal, 10)
    assert.equal(draft.auebTotal, 5)
    assert.match(draft.body, /Complete proposed course pairing table/)
    assert.match(draft.body, /HOST101 — Marketing \(6 host ECTS\)/)
    assert.match(draft.body, /AUEB101 — Marketing Strategy \(5 AUEB ECTS\)/)
    assert.match(draft.body, /HOST102 — Consumer Research \(4 host ECTS\)/)
    assert.match(draft.body, /https:\/\/host\.example\.edu\/syllabus/)
    assert.match(draft.body, /https:\/\/aueb\.example\.edu\/syllabus/)
    assert.match(draft.body, /Official AUEB course page: https:\/\/www\.dept\.aueb\.gr\/el\/mbc\/content\/marketing-strategy/)
    assert.match(draft.body, /Pending Academic Approval/)
    assert.match(draft.body, /each course ECTS is counted once/)
  })

  assert.equal(draft.to, 'coordinator@example.edu')
  assert.match(draft.mailto, /^mailto:coordinator@example\.edu/)
  assert.equal(draft.provisionalHostTotal, 30)
  assert.equal(draft.verifiedHostTotal, 30)
  assert.equal(draft.proposedAuebTotal, 30)
  assert.match(draft.body, /https:\/\/host\.example\.edu\/catalog/)
  assert.match(draft.body, /https:\/\/host\.example\.edu\/syllabus/)
})

test('reports missing ECTS, unknown semester and eligibility as explicit course warnings', () => {
  const warnings = getCourseReviewWarnings({
    ...candidateCourse,
    ects: null,
    semester: null,
  }, 'winter')

  assert.ok(warnings.includes('Missing ECTS'))
  assert.ok(warnings.includes('Unknown semester'))
  assert.ok(warnings.includes('Bachelor eligibility unknown'))
  assert.ok(warnings.includes('Exchange eligibility unknown'))
})

test('email draft identifies missing ECTS as unresolved', () => {
  const draft = buildApprovalEmail({
    student: {},
    partner: { university: 'Host University' },
    semester: 'winter',
    hostCourses: [{ ...candidateCourse, ects: null }],
  })

  assert.match(draft.body, /Missing ECTS/)
  assert.match(draft.body, /Unknown ECTS/)
})

test('official Learning Agreement readiness requires strict host data and verified 30+30 ECTS', () => {
  const officialAuebCourses = [{ id: 'aueb-1', ects: 30, verified: true }]
  const ready = getApprovalDraftReadiness({
    hostCourses: [verifiedHostCourse],
    auebCourses: officialAuebCourses,
    semester: 'winter',
  })
  const unverifiedHost = getApprovalDraftReadiness({
    hostCourses: [{ ...verifiedHostCourse, verificationStatus: 'unverified_candidate' }],
    auebCourses: officialAuebCourses,
    semester: 'winter',
  })
  const wrongSemester = getApprovalDraftReadiness({
    hostCourses: [verifiedHostCourse],
    auebCourses: officialAuebCourses,
    semester: 'spring',
  })
  const unverifiedAueb = getApprovalDraftReadiness({
    hostCourses: [verifiedHostCourse],
    auebCourses: [{ ...officialAuebCourses[0], verified: false }],
    semester: 'winter',
  })
  const incompleteAueb = getApprovalDraftReadiness({
    hostCourses: [verifiedHostCourse],
    auebCourses: [{ id: 'aueb-1', ects: 24, verified: true }],
    semester: 'winter',
  })

  assert.equal(ready.complete, true)
  assert.equal(unverifiedHost.complete, false)
  assert.equal(unverifiedHost.verifiedHostTotal, 0)
  assert.equal(wrongSemester.complete, false)
  assert.equal(wrongSemester.verifiedHostTotal, 0)
  assert.equal(unverifiedAueb.complete, false)
  assert.equal(incompleteAueb.complete, false)
})

test('does not accept an invalid provided coordinator address', () => {
  assert.throws(() => buildApprovalEmail({
    student: {},
    coordinatorEmail: 'not-an-email',
    partner: { university: 'Host University' },
    semester: 'spring',
    hostCourses: [candidateCourse],
    auebCourses: [],
  }), /valid coordinator email/)
})

test('long email drafts expose a copy fallback instead of an oversized mailto URL', () => {
  const short = createMailtoLink('coordinator@example.edu', 'Approval', 'Short draft', 1800)
  const long = createMailtoLink('coordinator@example.edu', 'Approval', 'x'.repeat(2500), 1800)

  assert.equal(short.requiresCopyFallback, false)
  assert.equal(long.requiresCopyFallback, true)
})

test('supports manual, non-automatic academic approval statuses', () => {
  assert.deepEqual(approvalStatuses, ['Draft', 'Awaiting Review', 'Approved', 'Changes Requested', 'Rejected'])
})
