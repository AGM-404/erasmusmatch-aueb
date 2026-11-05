export const auebCourseCatalogUrl = 'https://www.dept.aueb.gr/el/mbc_courses'

export function validateAuebSelectionIds(value) {
  if (!Array.isArray(value) || !value.every((id) => typeof id === 'string')) {
    throw new Error('Saved AUEB course selections must be a list of course IDs.')
  }
  return [...new Set(value)]
}

export function hydrateAuebCourseSelections(courses, selectedIds) {
  const selected = new Set(validateAuebSelectionIds(selectedIds))
  return courses.map((course) => ({ ...course, selected: selected.has(course.id) }))
}

export function getSelectedAuebCourseIds(courses) {
  return [...new Set(courses.filter((course) => course.selected).map((course) => course.id))]
}

export function toggleAuebCourseSelection(courses, courseId) {
  return courses.map((course) =>
    course.id === courseId ? { ...course, selected: !course.selected } : course,
  )
}

export function getAuebCoursesForSemester(courses, semester, query = '') {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return courses.filter((course) => {
    const semesters = course.semesters ?? [course.semester]
    const matchesSemester = semesters.includes(Number(semester))
    const searchableText = [
      course.title,
      ...course.categories.map((category) => category.label),
    ].join(' ').toLocaleLowerCase()
    return matchesSemester && (!normalizedQuery || searchableText.includes(normalizedQuery))
  })
}

export function groupAuebCoursesByCategory(courses, semester) {
  if (Number(semester) < 7) {
    return courses.length ? [{ id: 'required', label: 'Required courses', courses }] : []
  }

  const groups = new Map()
  for (const course of courses) {
    const specializations = course.categories.filter((category) => category.type === 'specialization')
    const group = specializations[0]
      ? { id: `specialization:${specializations[0].label}`, label: `Specialization · ${specializations[0].label}` }
      : { id: 'electives', label: 'Electives' }
    if (!groups.has(group.id)) groups.set(group.id, { ...group, courses: [] })
    groups.get(group.id).courses.push(course)
  }
  return [...groups.values()]
}
