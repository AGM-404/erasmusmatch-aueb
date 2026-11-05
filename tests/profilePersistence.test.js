import assert from 'node:assert/strict'
import test from 'node:test'
import catalog from '../src/data/auebCourseCatalog.json' with { type: 'json' }
import {
  auebSelectionStorageKey,
  getProfileSaveValidationError,
  profileDetailsStorageKey,
  readSavedProfile,
  saveProfile,
} from '../src/utils/profilePersistence.js'
import { getSelectedAuebCourseIds, hydrateAuebCourseSelections } from '../src/utils/auebCourseCatalog.js'

function createStorage(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries))
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    entries,
  }
}

const initialProfile = {
  name: '',
  email: '',
  studentNumber: '',
  department: 'Marketing and Communication',
  coordinatorEmail: '',
  semester: 'winter',
  languages: [],
  courses: [],
}

test('saving profile persists details and course IDs separately while preserving preferences', () => {
  const storage = createStorage({
    'erasmusmatch-academic-interests-v1': '{"version":1,"ratings":{"Marketing":4}}',
  })
  const [selectedCourse] = hydrateAuebCourseSelections(catalog, [catalog[0].id])
    .filter((course) => course.selected)
  const profile = {
    ...initialProfile,
    name: 'Alex Student',
    email: 'alex@example.edu',
    studentNumber: '12345',
    coordinatorEmail: '',
    languages: [{ language: 'English', level: 'C1' }],
    courses: [selectedCourse],
  }

  assert.deepEqual(saveProfile(storage, profile), { success: true, error: '' })
  assert.deepEqual(JSON.parse(storage.getItem(profileDetailsStorageKey)), {
    name: 'Alex Student',
    email: 'alex@example.edu',
    studentNumber: '12345',
    department: 'Marketing and Communication',
    coordinatorEmail: '',
    semester: 'winter',
    languages: [{ language: 'English', level: 'C1' }],
  })
  assert.deepEqual(JSON.parse(storage.getItem(auebSelectionStorageKey)), [catalog[0].id])
  assert.deepEqual(
    getSelectedAuebCourseIds(hydrateAuebCourseSelections(
      catalog,
      JSON.parse(storage.getItem(auebSelectionStorageKey)),
    )),
    [catalog[0].id],
  )
  assert.equal(storage.getItem('erasmusmatch-academic-interests-v1'), '{"version":1,"ratings":{"Marketing":4}}')

  const loaded = readSavedProfile(storage, initialProfile)
  assert.equal(loaded.error, '')
  assert.equal(loaded.value.email, profile.email)
  assert.deepEqual(loaded.value.languages, profile.languages)
  assert.deepEqual(loaded.value.courses, initialProfile.courses)
})

test('profile validation requires basic student details but not coordinator email or student number', () => {
  assert.match(getProfileSaveValidationError(initialProfile), /full name/)
  assert.match(getProfileSaveValidationError({ ...initialProfile, name: 'Alex' }), /student email/)
  assert.match(getProfileSaveValidationError({
    ...initialProfile,
    name: 'Alex',
    email: 'not-an-email',
  }), /valid student email/)
  assert.equal(getProfileSaveValidationError({
    ...initialProfile,
    name: 'Alex Student',
    email: 'alex@example.edu',
  }), '')
})

test('failed storage writes throw so the interface cannot show a success state', () => {
  const storage = {
    setItem() {
      throw new Error('Storage is unavailable.')
    },
  }
  const profile = {
    ...initialProfile,
    name: 'Alex Student',
    email: 'alex@example.edu',
  }
  assert.throws(() => saveProfile(storage, profile), /Storage is unavailable/)
})
