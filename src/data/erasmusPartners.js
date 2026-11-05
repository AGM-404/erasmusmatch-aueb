import partnerRecords from '../../ErasmusMatch_Copilot_Data/data/raw/partner_universities_2026_27.json' with { type: 'json' }
import catalogMasterCsv from '../../ErasmusMatch_Copilot_Data/data/catalogs/catalog_master.csv?raw'
import { normalizeErasmusPartners } from './normalizeErasmusPartners.js'
import { parseCsv } from '../utils/parseCsv.js'

export const partnershipSourceUrl =
  'https://www.dept.aueb.gr/sites/default/files/mbc/ME_KinitikotitaSpoudes2026.2027.pdf'

export const erasmusPartners = normalizeErasmusPartners(
  partnerRecords,
  parseCsv(catalogMasterCsv),
)

export function isCatalogVerifiedForSemester(partner, semester) {
  return (semester === 'winter' || semester === 'spring') &&
    partner.semesterCatalogs[semester] === 'verified'
}
