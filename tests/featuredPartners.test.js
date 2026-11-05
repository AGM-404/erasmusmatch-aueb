import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import partnerRecords from '../ErasmusMatch_Copilot_Data/data/raw/partner_universities_2026_27.json' with { type: 'json' }
import { normalizeErasmusPartners } from '../src/data/normalizeErasmusPartners.js'
import { featuredPartnerConfig, selectFeaturedPartners, summarizeCourseVerification } from '../src/data/featuredPartners.js'
import { parseCsv } from '../src/utils/parseCsv.js'
import { generateRecommendations } from '../src/utils/recommendationEngine.js'

const catalogMasterCsv = readFileSync(
  new URL('../ErasmusMatch_Copilot_Data/data/catalogs/catalog_master.csv', import.meta.url),
  'utf8',
)
const allPartners = normalizeErasmusPartners(partnerRecords, parseCsv(catalogMasterCsv))
const featuredPartners = selectFeaturedPartners(allPartners)

test('featured config selects the requested six while preserving all source partnership records', () => {
  assert.equal(allPartners.length, 46)
  assert.equal(featuredPartners.length, 6)
  assert.deepEqual(featuredPartners.map(({ erasmusCode }) => erasmusCode), [
    'B GENT 01',
    'SK BRATISL 02',
    'SK BANSKA 01',
    'BG SOFIA 06',
    'A WIEN 05',
    'LV RIGA 01',
  ])
})

test('additional candidates are visibly distinct and marked incomplete', () => {
  const additional = featuredPartners.filter(({ featuredGroup }) => featuredGroup === 'additional_candidate')

  assert.deepEqual(additional.map(({ erasmusCode }) => erasmusCode), ['A WIEN 05', 'LV RIGA 01'])
  assert.ok(additional.every((partner) =>
    summarizeCourseVerification(partner, []).label.includes('Additional candidate · course verification incomplete'),
  ))
})

test('course verification summary distinguishes verified listings from candidates and historical rows', () => {
  const partner = featuredPartners[0]
  const summary = summarizeCourseVerification(partner, [
    { partnerId: String(partner.id), verificationStatus: 'current_verified' },
    { partnerId: String(partner.id), verificationStatus: 'historical' },
    { partnerId: String(partner.id), verificationStatus: 'unverified_candidate' },
  ])

  assert.equal(summary.currentVerified, 1)
  assert.equal(summary.historical, 1)
  assert.equal(summary.candidates, 1)
  assert.equal(summary.complete, false)
  assert.match(summary.label, /current verified listing/)
})

test('recommender receives all six featured partnerships for academic evaluation', () => {
  const recommendations = generateRecommendations({
    partners: featuredPartners,
    semester: 'winter',
    rules: { minimumHostEcts: 30, minimumAuebEcts: 30 },
  })

  assert.equal(recommendations.length, 6)
  assert.equal(recommendations[0].partner.country, 'Slovakia')
  assert.ok(recommendations.every(({ academicStatus }) => academicStatus === 'requires_confirmation'))
})

test('feature configuration can be expanded without changing the source partnership data', () => {
  const expandedConfig = [...featuredPartnerConfig, { erasmusCode: 'A LINZ 01', group: 'additional_candidate' }]
  const expanded = selectFeaturedPartners(allPartners, expandedConfig)

  assert.equal(expanded.length, 7)
  assert.equal(allPartners.length, 46)
})
