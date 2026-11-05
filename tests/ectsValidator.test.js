import assert from 'node:assert/strict'
import test from 'node:test'
import { validateEcts } from '../src/utils/ectsValidator.js'

const rules = { minimumHostEcts: 30, minimumAuebEcts: 30 }

test('checks host and AUEB ECTS separately at 30 ECTS each', () => {
  const result = validateEcts({
    hostCourses: [{ courseId: 'host-1', ects: 30, verified: true }],
    recognizedHomeCourses: [{ id: 'aueb-1', ects: 24, verified: true }, { id: 'aueb-2', ects: 6, verified: true }],
    hostCatalogComplete: true,
    auebRecognitionComplete: true,
    rules,
  })

  assert.equal(result.host.status, 'met')
  assert.equal(result.host.ects, 30)
  assert.equal(result.aueb.status, 'met')
  assert.equal(result.aueb.ects, 30)
  assert.equal(result.status, 'met')
})

test('one side reaching 30 does not make the other side pass', () => {
  const result = validateEcts({
    hostCourses: [{ courseId: 'host-1', ects: 30, verified: true }],
    recognizedHomeCourses: [{ id: 'aueb-1', ects: 24, verified: true }],
    hostCatalogComplete: true,
    auebRecognitionComplete: true,
    rules,
  })

  assert.equal(result.host.status, 'met')
  assert.equal(result.aueb.status, 'not_met')
  assert.equal(result.aueb.remainingEcts, 6)
  assert.equal(result.status, 'not_met')
})

test('unverified or missing ECTS never count toward either target', () => {
  const result = validateEcts({
    hostCourses: [
      { courseId: 'host-unknown', ects: 6, verified: false },
      { courseId: 'host-no-ects', verified: true },
    ],
    recognizedHomeCourses: [{ id: 'home-unconfirmed', ects: 6, verified: false }],
    rules,
  })

  assert.equal(result.host.ects, 0)
  assert.equal(result.host.unverifiedCount, 2)
  assert.equal(result.host.status, 'requires_confirmation')
  assert.equal(result.aueb.ects, 0)
  assert.equal(result.aueb.status, 'requires_confirmation')
  assert.equal(result.host.message, 'Απαιτείται ακαδημαϊκή επιβεβαίωση')
})

test('null ECTS values are unknown even when a record is marked verified', () => {
  const result = validateEcts({
    hostCourses: [{ courseId: 'host-null', ects: null, verified: true }],
    rules,
  })

  assert.equal(result.host.ects, 0)
  assert.equal(result.host.unverifiedCount, 1)
  assert.equal(result.host.status, 'requires_confirmation')
})

test('duplicate verified course records are counted once', () => {
  const result = validateEcts({
    hostCourses: [
      { courseId: 'host-1', ects: 18, verified: true },
      { courseId: 'host-1', ects: 18, verified: true },
    ],
    hostCatalogComplete: true,
    rules,
  })

  assert.equal(result.host.ects, 18)
  assert.equal(result.host.status, 'not_met')
  assert.equal(result.aueb.status, 'requires_confirmation')
})
