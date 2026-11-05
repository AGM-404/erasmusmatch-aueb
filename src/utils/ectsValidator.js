function verifiedTotal(courses, getId) {
  const seen = new Set()
  let ects = 0
  let unverifiedCount = 0

  for (const course of courses) {
    const id = getId(course)
    if (id === undefined || id === null || seen.has(id)) continue
    seen.add(id)

    const courseEcts = Number(course.ects)
    if (
      course.verified !== true ||
      course.ects === null ||
      course.ects === undefined ||
      course.ects === '' ||
      !Number.isFinite(courseEcts) ||
      courseEcts < 0
    ) {
      unverifiedCount += 1
      continue
    }
    ects += courseEcts
  }

  return { ects, unverifiedCount }
}

function validateSide(courses, minimumEcts, catalogComplete, getId) {
  const total = verifiedTotal(courses, getId)
  const meetsTarget = total.ects >= minimumEcts
  const status = meetsTarget
    ? 'met'
    : catalogComplete && total.unverifiedCount === 0
      ? 'not_met'
      : 'requires_confirmation'

  return {
    ...total,
    minimumEcts,
    remainingEcts: Math.max(0, minimumEcts - total.ects),
    status,
    message: status === 'met'
      ? 'The target is reached by explicitly verified ECTS.'
      : status === 'not_met'
        ? 'Verified ECTS are below the target.'
        : 'Απαιτείται ακαδημαϊκή επιβεβαίωση',
  }
}

export function validateEcts({
  hostCourses = [],
  recognizedHomeCourses = [],
  hostCatalogComplete = false,
  auebRecognitionComplete = false,
  rules = {},
} = {}) {
  const host = validateSide(
    hostCourses,
    Number(rules.minimumHostEcts) || 30,
    hostCatalogComplete,
    (course) => course.courseId ?? course.id,
  )
  const aueb = validateSide(
    recognizedHomeCourses,
    Number(rules.minimumAuebEcts) || 30,
    auebRecognitionComplete,
    (course) => course.courseId ?? course.id,
  )

  return {
    host,
    aueb,
    status: host.status === 'requires_confirmation' || aueb.status === 'requires_confirmation'
      ? 'requires_confirmation'
      : host.status === 'met' && aueb.status === 'met'
        ? 'met'
        : 'not_met',
  }
}
