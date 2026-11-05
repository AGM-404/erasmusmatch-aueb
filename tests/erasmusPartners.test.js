import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import partnerRecords from '../ErasmusMatch_Copilot_Data/data/raw/partner_universities_2026_27.json' with { type: 'json' }
import { normalizeErasmusPartners } from '../src/data/normalizeErasmusPartners.js'
import { getPartnerCityImage, getPartnerCityImageCities } from '../src/data/partnerCityImages.js'
import { getPartnerDisplayCity } from '../src/data/partnerDisplayLocations.js'
import { parseCsv } from '../src/utils/parseCsv.js'

const catalogMasterCsv = readFileSync(
  new URL('../ErasmusMatch_Copilot_Data/data/catalogs/catalog_master.csv', import.meta.url),
  'utf8',
)
const erasmusPartners = normalizeErasmusPartners(partnerRecords, parseCsv(catalogMasterCsv))

function isCatalogVerifiedForSemester(partner, semester) {
  return (semester === 'winter' || semester === 'spring') &&
    partner.semesterCatalogs[semester] === 'verified'
}

test('all 2026-2027 partnership records are present and individually identified', () => {
  assert.equal(erasmusPartners.length, 46)
  assert.equal(new Set(erasmusPartners.map(({ id }) => id)).size, 46)
  assert.ok(erasmusPartners.every((partner) => partner.partnershipStatus === 'confirmed'))
  assert.ok(erasmusPartners.every((partner) => partner.academicYear === '2026-2027'))
})

test('repeated universities remain separate partnerships with their source study cycles', () => {
  const cyprusPartners = erasmusPartners.filter(({ erasmusCode }) => erasmusCode === 'CY NICOSIA 01')

  assert.equal(cyprusPartners.length, 2)
  assert.notEqual(cyprusPartners[0].id, cyprusPartners[1].id)
  assert.deepEqual(cyprusPartners.map(({ studyCycle }) => studyCycle), ['1', '2'])
})

test('every partner record has a display city derived from its Erasmus code', () => {
  assert.ok(erasmusPartners.every((partner) => getPartnerDisplayCity(partner.erasmusCode)))
  assert.equal(getPartnerDisplayCity('CY NICOSIA 01'), 'Nicosia')
})

test('city photos use verified Commons sources and include attribution and license metadata', () => {
  const imageCities = getPartnerCityImageCities()
  const partnerCities = new Set(erasmusPartners.map(({ erasmusCode }) => getPartnerDisplayCity(erasmusCode)))

  assert.equal(imageCities.length, 19)
  for (const city of imageCities) {
    const image = getPartnerCityImage(city)
    assert.ok(partnerCities.has(city))
    assert.ok(
      image.src.startsWith('/partner-universities/') ||
      /^https:\/\/(?:thumb|upload)\.wikimedia\.org\//.test(image.src),
    )
    assert.ok(image.source.startsWith('https://commons.wikimedia.org/wiki/File:'))
    assert.ok(image.creator)
    assert.match(image.license, /^(?:CC(?: BY(?:-SA)?(?: \d(?:\.\d)?)?|0)|Public domain)$/)
    if (image.licenseUrl) assert.ok(image.licenseUrl.startsWith('https://creativecommons.org/'))
    if (image.src.startsWith('/partner-universities/')) {
      assert.ok(existsSync(new URL(`../public${image.src}`, import.meta.url)))
    }
  }
  assert.deepEqual(
    ['Bratislava', 'Banská Bystrica', 'Sofia', 'Riga'].map((city) => getPartnerCityImage(city)?.src),
    [
      '/partner-universities/comenius-bratislava.jpg',
      '/partner-universities/matej-bel-banska-bystrica.jpg',
      '/partner-universities/sofia-university.jpg',
      '/partner-universities/university-of-latvia-riga.jpg',
    ],
  )
  assert.equal(getPartnerCityImage(getPartnerDisplayCity('A LINZ 01')), null)
  const cyprusCity = getPartnerDisplayCity('CY NICOSIA 01')
  assert.equal(cyprusCity, getPartnerDisplayCity('CY NICOSIA 01'))
  assert.equal(getPartnerCityImage(cyprusCity), getPartnerCityImage(cyprusCity))
})

test('catalog source discovery is distinct from term catalog and course verification', () => {
  assert.equal(erasmusPartners.filter((partner) => partner.catalogSourceStatus === 'located').length, 26)
  assert.equal(erasmusPartners.filter((partner) => partner.catalogSourceStatus === 'not_located').length, 20)
  assert.ok(erasmusPartners.find(({ erasmusCode }) => erasmusCode === 'B GENT 01').catalogSourceUrl)
  assert.ok(erasmusPartners.every((partner) => partner.courseDataStatus === 'not_verified'))
  assert.ok(erasmusPartners.every((partner) => !('courses' in partner)))
  assert.ok(erasmusPartners.every((partner) =>
    partner.catalogSourceStatus === 'located' ? Boolean(partner.catalogSourceUrl) : !partner.catalogSourceUrl,
  ))
})

test('CSV parsing preserves quoted commas and empty fields in the source files', () => {
  const [record] = parseCsv('id,name,notes\r\n1,"University, Faculty","line one, line two"\r\n')

  assert.deepEqual(record, {
    id: '1',
    name: 'University, Faculty',
    notes: 'line one, line two',
  })
})

test('winter and spring catalog verification remain independent and unknown is not confirmed', () => {
  assert.ok(erasmusPartners.every((partner) => partner.semesterCatalogs.winter === 'not_verified'))
  assert.ok(erasmusPartners.every((partner) => partner.semesterCatalogs.spring === 'not_verified'))
  assert.equal(erasmusPartners.filter((partner) => partner.semesterCatalogs.winter === 'verified').length, 0)
  assert.equal(erasmusPartners.filter((partner) => partner.semesterCatalogs.spring === 'verified').length, 0)
  assert.ok(erasmusPartners.every((partner) => !isCatalogVerifiedForSemester(partner, 'winter')))
  assert.ok(erasmusPartners.every((partner) => !isCatalogVerifiedForSemester(partner, 'spring')))

  const winterOnly = {
    semesterCatalogs: { winter: 'verified', spring: 'not_verified' },
  }
  assert.equal(isCatalogVerifiedForSemester(winterOnly, 'winter'), true)
  assert.equal(isCatalogVerifiedForSemester(winterOnly, 'spring'), false)
  assert.equal(isCatalogVerifiedForSemester(winterOnly, 'autumn'), false)
})
