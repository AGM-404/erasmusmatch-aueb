function semesterStatus(value) {
  return value?.toLowerCase() === 'yes' ? 'verified' : 'not_verified'
}

export function normalizeErasmusPartners(partnerRecords, catalogRecords) {
  const catalogsByPartnerId = new Map(
    catalogRecords.map((record) => [String(record.partner_id), record]),
  )

  return partnerRecords.map((record) => {
    const catalog = catalogsByPartnerId.get(String(record.id))
    if (!catalog) {
      throw new Error(`Missing catalog record for Erasmus partnership ${record.id}.`)
    }

    const catalogSourceUrl = catalog.official_catalog_url.trim() || null

    return {
      id: record.id,
      country: record.country,
      university: record.university,
      erasmusCode: record.erasmus_code,
      studyCycle: record.study_cycle,
      academicYear: catalog.academic_year,
      partnershipStatus: record.partner_verified === 'yes' ? 'confirmed' : 'unverified',
      catalogSourceUrl,
      catalogSourceStatus: catalogSourceUrl ? 'located' : 'not_located',
      catalogStatus: catalog.catalog_status,
      catalogSourceType: catalog.source_type,
      catalogLastChecked: catalog.last_checked || null,
      catalogRemarks: catalog.remarks,
      semesterCatalogs: {
        winter: semesterStatus(catalog.winter_2026_27_verified),
        spring: semesterStatus(catalog.spring_2027_verified),
      },
      courseDataStatus: 'not_verified',
      notes: record.notes,
    }
  })
}
