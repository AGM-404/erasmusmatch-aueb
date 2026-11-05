import { validateEcts } from './ectsValidator.js'
import { calculateAcademicMatch } from './academicMatching.js'
import { calculateAcademicInterestAlignment } from './academicInterests.js'

export function generateRecommendations({
  partners = [],
  studentLanguages = [],
  outstandingCourses = [],
  academicInterestRatings = {},
  semester = 'winter',
  rules = {},
} = {}) {
  const recommendations = partners
    .filter((partner) => partner.partnershipStatus === 'confirmed')
    .map((partner) => {
      const semesterVerified = partner.semesterCatalogs?.[semester] === 'verified'
      const coursesVerified = partner.courseDataStatus === 'verified'
      const validation = validateEcts({
        hostCourses: partner.verifiedCourses ?? [],
        recognizedHomeCourses: partner.verifiedRecognitions ?? [],
        hostCatalogComplete: semesterVerified && coursesVerified,
        auebRecognitionComplete: partner.recognitionDataStatus === 'verified',
        rules,
      })
      const academicMatch = calculateAcademicMatch({
        auebCourses: outstandingCourses,
        hostCourses: partner.hostCourses ?? [],
        semester,
        studentLanguages,
        partner,
      })
      const academicInterestAlignment = calculateAcademicInterestAlignment({
        hostCourses: partner.hostCourses ?? [],
        semester,
        ratings: academicInterestRatings,
      })
      const combinedScore = academicMatch.score > 0 &&
        Number.isFinite(academicInterestAlignment.score)
        ? Math.round(academicMatch.score * 0.8 + academicInterestAlignment.score * 0.2)
        : null
      const reasons = [
        'AUEB partnership is confirmed in the 2026–2027 partnership data.',
        partner.studentEligibilityVerified === true
          ? 'Student-level eligibility and exchange restrictions are verified.'
          : 'Student-level eligibility and exchange restrictions are not verified.',
        ...academicMatch.reasons,
        academicInterestAlignment.score === null
          ? 'Academic interest alignment is unavailable because verified host-course subject categories or matching student ratings are missing.'
          : `Academic interest alignment is ${academicInterestAlignment.score}% across verified host subjects: ${academicInterestAlignment.categories.join(', ')}.`,
        academicMatch.score === 0
          ? 'No combined recommendation is calculated because no selected AUEB courses have evidence-supported host matches.'
          : combinedScore === null
            ? 'Interest preferences are not included in the recommendation score; academic compatibility is shown alone.'
            : `Weighted academic recommendation: 80% course compatibility (${academicMatch.score}%) + 20% academic interest alignment (${academicInterestAlignment.score}%).`,
      ]

      return {
        partner,
        semester,
        academicMatch,
        academicInterestAlignment,
        combinedScore,
        validation,
        reasons,
        academicStatus: validation.status === 'met' &&
          semesterVerified &&
          coursesVerified &&
          partner.studentEligibilityVerified === true
          ? 'confirmed'
          : validation.status === 'not_met'
            ? 'not_met'
            : 'requires_confirmation',
      }
    })

  recommendations.sort((left, right) =>
    (right.combinedScore ?? right.academicMatch.score ?? -1) -
      (left.combinedScore ?? left.academicMatch.score ?? -1) ||
    left.partner.university.localeCompare(right.partner.university) ||
    String(left.partner.studyCycle).localeCompare(String(right.partner.studyCycle)),
  )

  return recommendations
}

export function getPartnerCourseRecommendations({
  partner,
  selectedAuebCourses = [],
  matchingHostCourses = [],
  catalogCourses = matchingHostCourses,
  studentLanguages = [],
  semester = 'winter',
  rules = {},
} = {}) {
  const selectedCourses = selectedAuebCourses.filter((course) => course.selected === true)
  const [recommendation] = generateRecommendations({
    partners: partner ? [{ ...partner, hostCourses: matchingHostCourses }] : [],
    studentLanguages,
    outstandingCourses: selectedCourses,
    semester,
    rules,
  })
  const academicMatch = recommendation?.academicMatch ?? null
  const recommendedPairs = academicMatch?.strongPairs ?? []
  const recommendedPairIds = new Set(recommendedPairs.map((pair) =>
    `${pair.auebCourseId}:${pair.hostCourseId}`,
  ))
  const potentialPairs = (academicMatch?.potentialPairs ?? []).filter((pair) =>
    pair.status === 'unverified_potential' &&
    !recommendedPairIds.has(`${pair.auebCourseId}:${pair.hostCourseId}`),
  )

  return {
    selectedCourses,
    academicMatch,
    recommendedPairs,
    potentialPairs,
    catalogCourses,
  }
}

export function calculatePotentialMatchCoverage(selectedAuebCourses = [], potentialPairs = []) {
  const selectedCourseIds = new Set(
    selectedAuebCourses
      .filter((course) => course.selected === true)
      .map((course) => course.id),
  )
  const selectedCourseCount = selectedCourseIds.size
  if (selectedCourseCount === 0) {
    return { matchedCourseCount: 0, selectedCourseCount: 0, score: null }
  }

  const matchedCourseIds = new Set(
    potentialPairs
      .filter((pair) => pair.status === 'unverified_potential' && selectedCourseIds.has(pair.auebCourseId))
      .map((pair) => pair.auebCourseId),
  )
  const matchedCourseCount = matchedCourseIds.size

  return {
    matchedCourseCount,
    selectedCourseCount,
    score: Math.round(matchedCourseCount / selectedCourseCount * 100),
  }
}
