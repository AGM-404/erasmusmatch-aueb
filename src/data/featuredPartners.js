export const featuredPartnerConfig = [
  { erasmusCode: 'B GENT 01', displayName: 'Ghent University', group: 'core' },
  { erasmusCode: 'SK BRATISL 02', displayName: 'Comenius University in Bratislava', group: 'core' },
  { erasmusCode: 'SK BANSKA 01', displayName: 'Matej Bel University in Banska Bystrica', group: 'core' },
  { erasmusCode: 'BG SOFIA 06', displayName: 'Sofia University St. Kliment Ohridski', group: 'core' },
  { erasmusCode: 'A WIEN 05', displayName: 'WU Vienna University of Economics and Business', group: 'additional_candidate' },
  { erasmusCode: 'LV RIGA 01', displayName: 'University of Latvia', group: 'additional_candidate' },
]

export function selectFeaturedPartners(partners, config = featuredPartnerConfig) {
  const partnersByCode = new Map()
  for (const partner of partners) {
    const records = partnersByCode.get(partner.erasmusCode) ?? []
    records.push(partner)
    partnersByCode.set(partner.erasmusCode, records)
  }

  return config.flatMap((entry) => (partnersByCode.get(entry.erasmusCode) ?? []).map((partner) => ({
    ...partner,
    featuredGroup: entry.group,
    featuredDisplayName: entry.displayName ?? partner.university,
  })))
}

export function summarizeCourseVerification(partner, courseRecords, allPartners = [partner]) {
  const listings = courseRecords.filter((course) =>
    course.partnerId
      ? course.partnerId === String(partner.id)
      : course.erasmusCode === partner.erasmusCode &&
        allPartners.filter((item) => item.erasmusCode === course.erasmusCode).length === 1,
  )
  const currentVerified = listings.filter((course) => course.verificationStatus === 'current_verified').length
  const historical = listings.filter((course) => course.verificationStatus === 'historical').length
  const candidates = listings.filter((course) => course.verificationStatus === 'unverified_candidate').length

  return {
    currentVerified,
    historical,
    candidates,
    complete: partner.semesterCatalogs?.winter === 'verified' &&
      partner.semesterCatalogs?.spring === 'verified' &&
      partner.courseDataStatus === 'verified',
    label: partner.featuredGroup === 'additional_candidate'
      ? 'Additional candidate · course verification incomplete'
      : currentVerified > 0
        ? `${currentVerified} current verified listing(s) · completeness unconfirmed`
        : 'Course verification incomplete',
  }
}
