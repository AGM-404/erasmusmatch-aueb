import assert from 'node:assert/strict'
import test from 'node:test'
import catalog from '../src/data/auebCourseCatalog.json' with { type: 'json' }
import {
  auebCourseCatalogUrl,
  getAuebCoursesForSemester,
  getSelectedAuebCourseIds,
  groupAuebCoursesByCategory,
  hydrateAuebCourseSelections,
  toggleAuebCourseSelection,
  validateAuebSelectionIds,
} from '../src/utils/auebCourseCatalog.js'

test('bundles official AUEB course pages, ECTS, descriptions and learning outcomes where published', () => {
  assert.equal(auebCourseCatalogUrl, 'https://www.dept.aueb.gr/el/mbc_courses')
  assert.equal(catalog.length, 94)
  assert.ok(catalog.every((course) =>
    course.id.startsWith('aueb:') &&
    course.officialUrl.startsWith('https://www.dept.aueb.gr/el/mbc/content/') &&
    course.ects === 5 &&
    course.syllabusUrl === null,
  ))
  assert.equal(catalog.filter((course) => course.courseCode).length, 87)
  assert.equal(catalog.filter((course) => course.description).length, 81)
  assert.equal(catalog.filter((course) => course.learningOutcomes).length, 70)
  assert.ok(catalog.filter((course) => course.description || course.learningOutcomes).every((course) =>
    course.officialUrl.startsWith('https://www.dept.aueb.gr/el/mbc/content/'),
  ))
  assert.ok(catalog.every((course) =>
    !course.description?.includes('Επιδιωκόμενα μαθησιακά αποτελέσματα') &&
    !course.learningOutcomes?.includes('Συνιστώμενη βιβλιογραφία') &&
    !course.learningOutcomes?.includes('Τρόπος παράδοσης'),
  ))
  assert.ok(catalog.filter((course) => !course.description).every((course) =>
    course.description === null,
  ))
  assert.deepEqual(
    Array.from({ length: 8 }, (_, index) =>
      getAuebCoursesForSemester(catalog, index + 1).length,
    ),
    [6, 6, 6, 6, 6, 5, 31, 28],
  )
})

test('filters by semester and searches official course titles', () => {
  const semesterOne = getAuebCoursesForSemester(catalog, 1)
  assert.equal(semesterOne.length, 6)
  assert.ok(getAuebCoursesForSemester(catalog, 1, 'μάρκετινγκ').some((course) =>
    course.title === 'Εισαγωγή στο Μάρκετινγκ',
  ))
  assert.deepEqual(getAuebCoursesForSemester(catalog, 2, 'Εισαγωγή στο Μάρκετινγκ'), [])
})

test('selection IDs hydrate and persist without duplicate course records', () => {
  const courseId = catalog[0].id
  const storedIds = validateAuebSelectionIds([courseId, courseId, 'removed-course'])
  const hydrated = hydrateAuebCourseSelections(catalog, storedIds)

  assert.equal(hydrated.filter((course) => course.selected).length, 1)
  assert.deepEqual(getSelectedAuebCourseIds(hydrated), [courseId])
  const toggled = toggleAuebCourseSelection(hydrated, courseId)
  assert.deepEqual(getSelectedAuebCourseIds(toggled), [])
  assert.throws(() => validateAuebSelectionIds([courseId, 42]), /list of course IDs/)
})

test('later-semester courses remain selectable regardless of the planned Erasmus semester', () => {
  const laterCourse = getAuebCoursesForSemester(catalog, 8)[0]
  const selected = toggleAuebCourseSelection(
    hydrateAuebCourseSelections(catalog, []),
    laterCourse.id,
  )

  assert.equal(laterCourse.semester, 8)
  assert.equal(selected.find((course) => course.id === laterCourse.id).selected, true)
  assert.deepEqual(getSelectedAuebCourseIds(selected), [laterCourse.id])
})

test('courses shared by specializations appear once and retain every category', () => {
  const sharedCourses = catalog.filter((course) => course.title === 'Ψηφιακό Εμπόριο')
  assert.equal(sharedCourses.length, 1)
  assert.deepEqual(
    sharedCourses[0].categories.map((category) => category.label),
    ['Διεθνής Επιχειρηματικότητα και Καινοτομία', 'Ψηφιακό Μάρκετινγκ'],
  )
  const grouped = groupAuebCoursesByCategory(
    getAuebCoursesForSemester(catalog, 8),
    8,
  )
  assert.equal(grouped.flatMap((group) => group.courses).filter((course) =>
    course.id === sharedCourses[0].id,
  ).length, 1)
})

test('preserves explicit 2026–2027 unavailability notices', () => {
  const unavailable = catalog.filter((course) => !course.available2026_2027)
  assert.equal(unavailable.length, 4)
  assert.ok(unavailable.every((course) => course.semester === 7))
})
