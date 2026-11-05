import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  ClipboardCopy,
  Compass,
  GraduationCap,
  Heart,
  CircleHelp,
  Mail,
  MapPin,
  Search,
  Sparkles,
  Upload,
  UserRound,
} from 'lucide-react'
import { academicRules } from './data/academicRules.js'
import auebCourseCatalog from './data/auebCourseCatalog.json' with { type: 'json' }
import featuredCourseCandidates from './data/featuredCourseCandidates.json' with { type: 'json' }
import { mergeCourseRecords, parseCourseData, validateCourseRecords } from './data/courseData.js'
import { erasmusPartners, partnershipSourceUrl } from './data/erasmusPartners.js'
import { selectFeaturedPartners, summarizeCourseVerification } from './data/featuredPartners.js'
import { getPartnerCityImage } from './data/partnerCityImages.js'
import { getPartnerDisplayCity } from './data/partnerDisplayLocations.js'
import {
  auebCourseCatalogUrl,
  getAuebCoursesForSemester,
  getSelectedAuebCourseIds,
  groupAuebCoursesByCategory,
  hydrateAuebCourseSelections,
  toggleAuebCourseSelection,
  validateAuebSelectionIds,
} from './utils/auebCourseCatalog.js'
import {
  approvalStatuses,
  buildApprovalEmail,
  calculatePairingEcts,
  createMailtoLink,
  getApprovalDraftReadiness,
  getCourseReviewWarnings,
  isSelectableHostCourse,
  normalizeCoursePairings,
  toggleCoursePairing,
  toggleSelectedHostCourse,
} from './utils/approvalRequest.js'
import {
  academicInterestCategories,
  academicInterestsStorageKey,
  parseAcademicInterestPreferences,
  serializeAcademicInterestPreferences,
} from './utils/academicInterests.js'
import {
  auebSelectionStorageKey,
  readSavedProfile,
  saveProfile as persistProfile,
} from './utils/profilePersistence.js'
import {
  calculatePotentialMatchCoverage,
  generateRecommendations,
  getPartnerCourseRecommendations,
} from './utils/recommendationEngine.js'
import './App.css'

const featuredPartners = selectFeaturedPartners(erasmusPartners)

const partnerCountries = [...new Set(featuredPartners.map(({ country }) => country))]
  .sort((left, right) => left.localeCompare(right))
const languageOptions = ['English', 'French', 'German', 'Italian', 'Spanish', 'Portuguese', 'Greek', 'Other']
const languageLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native']
const initialProfile = {
  courses: [],
  semester: 'winter',
  languages: [],
  name: '',
  email: '',
  studentNumber: '',
  department: 'Marketing and Communication',
  coordinatorEmail: '',
}

function readStoredArray(key, validate = (value) => value) {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return { value: [], error: '' }
    const value = validate(JSON.parse(stored))
    if (!Array.isArray(value)) throw new Error('Stored data must be an array.')
    return { value, error: '' }
  } catch (error) {
    return { value: [], error: `Could not read saved ${key} data: ${error.message}` }
  }
}

function readStoredAcademicInterests() {
  try {
    const stored = localStorage.getItem(academicInterestsStorageKey)
    return {
      value: stored ? parseAcademicInterestPreferences(stored) : {},
      error: '',
    }
  } catch (error) {
    return {
      value: {},
      error: `Could not read saved academic interests: ${error.message}`,
    }
  }
}

function validateStoredRequests(value) {
  if (!Array.isArray(value)) throw new Error('Stored approval requests must be an array.')
  if (!value.every((request) =>
    request && typeof request.id === 'string' &&
    approvalStatuses.includes(request.status) &&
    typeof request.partnerName === 'string' &&
    typeof request.body === 'string',
  )) {
    throw new Error('Saved approval requests have an invalid status or format.')
  }
  return value
}

function validateStoredAuebSelection(value) {
  return validateAuebSelectionIds(value)
}

function courseMatchesPartner(course, partner, partners) {
  if (course.partnerId) return course.partnerId === String(partner.id)
  if (!course.erasmusCode || course.erasmusCode !== partner.erasmusCode) return false
  return partners.filter((item) => item.erasmusCode === course.erasmusCode).length === 1
}

const tabs = [
  { id: 'explore', label: 'Explore', Icon: Compass },
  { id: 'matches', label: 'Matches', Icon: Sparkles },
  { id: 'saved', label: 'Saved', Icon: Bookmark },
  { id: 'profile', label: 'Profile', Icon: UserRound },
]

function CityVisual({ city, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const image = getPartnerCityImage(city)
  const initials = city
    ? city.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
    : 'EU'

  return (
    <span className={`partner-city-visual${className ? ` ${className}` : ''}`}>
      <span className="partner-city-placeholder" aria-hidden="true"><span>{initials}</span></span>
      {image && !imageFailed && (
        <img
          className="partner-city-photo"
          src={image.src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      )}
    </span>
  )
}

function PartnerCard({ partner, city, isSaved, onToggleSave, onOpen, courseRecords }) {
  const image = getPartnerCityImage(city)
  const courseSummary = summarizeCourseVerification(partner, courseRecords, erasmusPartners)

  return (
    <article className="university-card partner-card">
      <button
        className="partner-image-button"
        type="button"
        onClick={() => onOpen(partner)}
        aria-label={`View ${partner.featuredDisplayName ?? partner.university}, ${city}, ${partner.country}`}
      >
        <CityVisual city={city} />
        <span className="image-tag partner-course-status-tag">
          {partner.featuredGroup === 'additional_candidate'
            ? 'Additional candidate · verification incomplete'
            : courseSummary.label}
        </span>
        {!image && (
          <span className="image-tag">
            Illustrative placeholder · not a university photo
          </span>
        )}
      </button>
      <button
        className={`favorite-button${isSaved ? ' is-saved' : ''}`}
        type="button"
        onClick={() => onToggleSave(`partner:${partner.id}`)}
        aria-label={isSaved ? `Remove ${partner.featuredDisplayName ?? partner.university} partnership from saved` : `Save ${partner.featuredDisplayName ?? partner.university} partnership`}
        aria-pressed={isSaved}
      >
        <Heart size={19} fill={isSaved ? 'currentColor' : 'none'} />
      </button>
      <button className="card-info" type="button" onClick={() => onOpen(partner)}>
        <span className="card-location"><MapPin size={14} /> {city}, {partner.country}</span>
        <span className="card-title">{partner.featuredDisplayName ?? partner.university}</span>
        <span className="card-link">Partnership details <ArrowRight size={15} /></span>
      </button>
    </article>
  )
}

function PartnerDetail({
  partner,
  city,
  isSaved,
  onToggleSave,
  onBack,
  onEditProfile,
  courseRecommendations,
}) {
  const image = getPartnerCityImage(city)
  const partnerCourses = courseRecommendations.catalogCourses
  const selectedAuebCourses = courseRecommendations.selectedCourses
  const recommendedPairs = courseRecommendations.recommendedPairs
  const potentialPairs = courseRecommendations.potentialPairs

  return (
    <section className="detail-view">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={17} /> Back to destinations
      </button>
      <div className="partner-detail-hero">
        <CityVisual city={city} className="partner-detail-placeholder" />
        <span className="detail-photo-label"><MapPin size={15} /> {city}, {partner.country}</span>
        <span className="image-tag partner-detail-badge">Erasmus Partner</span>
        {partner.featuredGroup === 'additional_candidate' && (
          <span className="image-tag partner-course-status-tag">Additional candidate · course verification incomplete</span>
        )}
      </div>
      <div className="detail-body">
        <div className="detail-heading">
          <div>
            <span className="eyebrow">
              {partner.partnershipStatus === 'confirmed' ? 'CONFIRMED ERASMUS PARTNERSHIP' : 'PARTNERSHIP STATUS NOT VERIFIED'} · {partner.academicYear}
            </span>
            <h1>{partner.featuredDisplayName ?? partner.university}</h1>
            <p className="detail-location"><MapPin size={16} /> {city}, {partner.country}</p>
          </div>
          <button
            className={`detail-save${isSaved ? ' is-saved' : ''}`}
            type="button"
            onClick={() => onToggleSave(`partner:${partner.id}`)}
            aria-label={isSaved ? 'Remove partnership from saved' : 'Save partnership'}
            aria-pressed={isSaved}
          >
            <Heart size={19} fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="partner-detail-panel">
          <h2>Partnership and catalog details</h2>
          <dl>
            <div><dt>Erasmus code</dt><dd>{partner.erasmusCode}</dd></div>
            <div><dt>Study cycle</dt><dd>{partner.studyCycle}</dd></div>
            <div><dt>Partnership</dt><dd>{partner.partnershipStatus === 'confirmed' ? 'Confirmed by AUEB partnership data' : 'Not verified'}</dd></div>
            <div>
              <dt>Official catalog source</dt>
              <dd>
                {partner.catalogSourceUrl
                  ? <a href={partner.catalogSourceUrl} target="_blank" rel="noreferrer">Source located · catalog status requires review</a>
                  : 'Not located'}
              </dd>
            </div>
            <div><dt>Catalog status</dt><dd>{partner.catalogStatus}</dd></div>
            <div><dt>Winter {partner.academicYear}</dt><dd>{partner.semesterCatalogs.winter === 'verified' ? 'Catalog verified' : 'Catalog not verified'}</dd></div>
            <div><dt>Spring {partner.academicYear}</dt><dd>{partner.semesterCatalogs.spring === 'verified' ? 'Catalog verified' : 'Catalog not verified'}</dd></div>
            <div><dt>Imported course listings</dt><dd>{partnerCourses.length > 0 ? `${partnerCourses.length} listing(s); review their individual status below` : 'No course or credit data loaded'}</dd></div>
          </dl>
          <section className="detail-course-section" aria-labelledby="recommended-host-courses">
            <h2 id="recommended-host-courses">Recommended for Your AUEB Courses</h2>
            {selectedAuebCourses.length === 0 ? (
              <div className="aueb-catalog-empty">
                <p>Select AUEB courses in Profile to see personalized host-course recommendations.</p>
                <button type="button" className="secondary-button" onClick={onEditProfile}>Select AUEB courses</button>
              </div>
            ) : recommendedPairs.length === 0 ? (
              <div className="approval-empty">
                <p>No verified course matches available yet for your selected AUEB courses.</p>
                {courseRecommendations.academicMatch?.missingEvidence?.length > 0 && (
                  <p>Evidence gaps: {courseRecommendations.academicMatch.missingEvidence.join('; ')}</p>
                )}
              </div>
            ) : (
              <div className="partner-course-details">
                {recommendedPairs.map((pair) => (
                  <article className="partner-course-detail-row" key={`${pair.auebCourseId}:${pair.hostCourseId}`}>
                    <strong>{pair.auebTitle} ↔ {pair.hostTitle}</strong>
                    <span>Evidence-supported academic fit · shared topics: {pair.sharedTopics.join(', ')} · shared course content: {pair.sharedContent.join(', ')}.</span>
                    <span>Host ECTS {pair.hostEcts ?? 'unknown'} · Proposed AUEB recognition ECTS {pair.auebEcts ?? 'unknown'} (unapproved) · Host status {pair.hostVerificationStatus?.replaceAll('_', ' ') ?? 'unknown'} · Pending Academic Approval.</span>
                    <span className="evidence-source-links">
                      {pair.auebUrl && <a href={pair.auebUrl} target="_blank" rel="noreferrer">Official AUEB course page</a>}
                      {pair.hostUrl && <a href={pair.hostUrl} target="_blank" rel="noreferrer">Host catalog</a>}
                      {pair.hostSyllabusUrl && <a href={pair.hostSyllabusUrl} target="_blank" rel="noreferrer">Host syllabus</a>}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="detail-course-section" aria-labelledby="potential-host-courses">
            <h2 id="potential-host-courses">Potential Matches — Verification Needed</h2>
            {selectedAuebCourses.length === 0 ? (
              <p className="approval-empty">Select AUEB courses in Profile to check for potential host-course matches.</p>
            ) : potentialPairs.length === 0 ? (
              <p className="approval-empty">No course-topic candidates with missing verification evidence were identified for the selected AUEB courses.</p>
            ) : (
              <div className="partner-course-details">
                {potentialPairs.map((pair) => (
                  <article className="partner-course-detail-row" key={`${pair.auebCourseId}:${pair.hostCourseId}`}>
                    <strong>{pair.auebTitle} ↔ {pair.hostTitle}</strong>
                    <span>
                      Topic evidence from {pair.topicEvidenceSources.join(' and ')}:
                      {' '}{pair.sharedTopics.join(', ')}. This is a candidate for review, not a verified match or approved equivalency.
                    </span>
                    <span>Host ECTS {pair.hostEcts ?? 'unknown'} · Proposed AUEB recognition ECTS {pair.auebEcts ?? 'unknown'} (unapproved) · Host status {pair.hostVerificationStatus?.replaceAll('_', ' ') ?? 'unknown'}.</span>
                    <span>Missing evidence: {pair.missingEvidence.join('; ') || 'Additional academic verification is required.'}</span>
                    <span className="evidence-source-links">
                      {pair.auebUrl && <a href={pair.auebUrl} target="_blank" rel="noreferrer">Official AUEB course page</a>}
                      {pair.hostUrl && <a href={pair.hostUrl} target="_blank" rel="noreferrer">Host catalog</a>}
                      {pair.hostSyllabusUrl && <a href={pair.hostSyllabusUrl} target="_blank" rel="noreferrer">Host syllabus</a>}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </section>
          {partnerCourses.length > 0 && (
            <section className="detail-course-section" aria-labelledby="all-host-courses">
              <h2 id="all-host-courses">Browse All Host Courses</h2>
              <p className="approval-empty">Complete imported catalogue · listings are not recommendations and retain their individual verification status.</p>
              <div className="partner-course-details">
              {partnerCourses.map((course) => (
                <div className="partner-course-detail-row" key={course.id}>
                  <strong>{course.title} <small>{course.courseCode}</small></strong>
                  <span>{course.academicYear} · {course.semester} · {course.ects ?? 'Unknown'} ECTS · {course.language ?? 'Language unknown'} · Bachelor {course.bachelorEligible === null ? 'unknown' : course.bachelorEligible ? 'eligible' : 'not eligible'} · Exchange {course.exchangeEligible === null ? 'unknown' : course.exchangeEligible ? 'eligible' : 'not eligible'}</span>
                  <span>{course.verificationStatus.replaceAll('_', ' ')} · checked {course.lastCheckedAt ?? 'date unknown'}</span>
                  {course.catalogUrl && <a href={course.catalogUrl} target="_blank" rel="noreferrer">Catalog source</a>}
                  {course.syllabusUrl && <a href={course.syllabusUrl} target="_blank" rel="noreferrer">Syllabus</a>}
                </div>
              ))}
              </div>
            </section>
          )}
          <p>City shown for display from the location encoded in the Erasmus code. It does not confirm the specific campus or course location.</p>
          {image && (
            <p className="partner-photo-credit">
              City photo by <a href={image.source} target="_blank" rel="noreferrer">{image.creator} on Wikimedia Commons</a>
              {' '}· <a href={image.licenseUrl} target="_blank" rel="noreferrer">{image.license}</a>. Cropped to fit the card.
            </p>
          )}
          {!image && <p>Illustrative placeholder only; no university photo is shown.</p>}
        </div>
      </div>
    </section>
  )
}

function App() {
  const [storedCourses] = useState(() => readStoredArray('erasmusmatch-course-listings', validateCourseRecords))
  const [storedRequests] = useState(() => readStoredArray('erasmusmatch-approval-requests', validateStoredRequests))
  const [storedAuebSelection] = useState(() => readStoredArray(auebSelectionStorageKey, validateStoredAuebSelection))
  const [storedProfile] = useState(() => readSavedProfile(window.localStorage, initialProfile))
  const [storedAcademicInterests] = useState(readStoredAcademicInterests)
  const [activeTab, setActiveTab] = useState('explore')
  const [selectedCountry, setSelectedCountry] = useState('All places')
  const [selectedPartnerSemester, setSelectedPartnerSemester] = useState('all')
  const [search, setSearch] = useState('')
  const [savedIds, setSavedIds] = useState([])
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [profile, setProfile] = useState(() => ({
    ...storedProfile.value,
    courses: hydrateAuebCourseSelections(auebCourseCatalog, storedAuebSelection.value),
  }))
  const [academicInterestRatings, setAcademicInterestRatings] = useState(storedAcademicInterests.value)
  const [courseRecords, setCourseRecords] = useState(() => mergeCourseRecords(
    validateCourseRecords(featuredCourseCandidates), storedCourses.value,
  ))
  const [approvalRequests, setApprovalRequests] = useState(storedRequests.value)
  const [coursePersistenceError, setCoursePersistenceError] = useState('')
  const [requestPersistenceError, setRequestPersistenceError] = useState('')
  const [auebSelectionPersistenceError, setAuebSelectionPersistenceError] = useState('')
  const [academicInterestPersistenceError, setAcademicInterestPersistenceError] = useState('')
  const [profilePersistenceError, setProfilePersistenceError] = useState('')
  const selectedAuebCourses = useMemo(
    () => profile.courses.filter((course) => course.selected),
    [profile.courses],
  )
  const detailCourseRecommendations = useMemo(() => {
    if (!selectedPartner) return null
    const partnerCatalog = courseRecords.filter((course) =>
      courseMatchesPartner(course, selectedPartner, erasmusPartners)
    )
    const matchingHostCourses = partnerCatalog.filter((course) =>
      course.academicYear === selectedPartner.academicYear &&
      course.semester === profile.semester,
    )
    return getPartnerCourseRecommendations({
      partner: selectedPartner,
      selectedAuebCourses,
      matchingHostCourses,
      catalogCourses: partnerCatalog,
      studentLanguages: profile.languages,
      semester: profile.semester,
      rules: academicRules,
    })
  }, [
    selectedPartner,
    courseRecords,
    profile.semester,
    profile.languages,
    selectedAuebCourses,
  ])
  const storageError = [
    storedCourses.error,
    storedRequests.error,
    storedAuebSelection.error,
    storedProfile.error,
    storedAcademicInterests.error,
    coursePersistenceError,
    requestPersistenceError,
    auebSelectionPersistenceError,
    academicInterestPersistenceError,
    profilePersistenceError,
  ].filter(Boolean).join(' ')

  useEffect(() => {
    if (storedAuebSelection.error) return
    try {
      localStorage.setItem(
        auebSelectionStorageKey,
        JSON.stringify(getSelectedAuebCourseIds(profile.courses)),
      )
      setAuebSelectionPersistenceError('')
    } catch (error) {
      setAuebSelectionPersistenceError(`AUEB course selections could not be saved in this browser: ${error.message}`)
    }
  }, [profile.courses, storedAuebSelection.error])

  function saveCurrentProfile() {
    try {
      const result = persistProfile(window.localStorage, profile)
      setProfilePersistenceError(result.error)
      return result
    } catch (error) {
      const message = `Profile could not be saved in this browser: ${error.message}`
      setProfilePersistenceError(message)
      return { success: false, error: message }
    }
  }

  useEffect(() => {
    if (storedAcademicInterests.error) return
    try {
      localStorage.setItem(
        academicInterestsStorageKey,
        serializeAcademicInterestPreferences(academicInterestRatings),
      )
      setAcademicInterestPersistenceError('')
    } catch (error) {
      setAcademicInterestPersistenceError(`Academic interest preferences could not be saved in this browser: ${error.message}`)
    }
  }, [academicInterestRatings, storedAcademicInterests.error])

  function importCourseRecords(importedCourses) {
    const updated = mergeCourseRecords(courseRecords, importedCourses)
    setCourseRecords(updated)
    try {
      if (!storedCourses.error) {
        localStorage.setItem('erasmusmatch-course-listings', JSON.stringify(updated))
        setCoursePersistenceError('')
      }
    } catch (error) {
      setCoursePersistenceError(`Course listings could not be saved in this browser: ${error.message}`)
    }
  }

  function saveApprovalRequests(update) {
    const updated = typeof update === 'function' ? update(approvalRequests) : update
    setApprovalRequests(updated)
    try {
      if (!storedRequests.error) {
        localStorage.setItem('erasmusmatch-approval-requests', JSON.stringify(updated))
        setRequestPersistenceError('')
      }
    } catch (error) {
      setRequestPersistenceError(`Approval status could not be saved in this browser: ${error.message}`)
    }
  }

  const visiblePartners = useMemo(() => {
    const query = search.trim().toLowerCase()
    return featuredPartners.filter((partner) => {
      const matchesCountry = selectedCountry === 'All places' || partner.country === selectedCountry
      const matchesSearch =
        !query ||
        `${partner.featuredDisplayName} ${partner.university} ${getPartnerDisplayCity(partner.erasmusCode) ?? ''} ${partner.country}`.toLowerCase().includes(query)
      const matchesTab = activeTab !== 'saved' || savedIds.includes(`partner:${partner.id}`)
      const matchesSemester = selectedPartnerSemester === 'all' ||
        partner.semesterCatalogs[selectedPartnerSemester] === 'verified'
      return matchesCountry && matchesSearch && matchesTab && matchesSemester
    })
  }, [activeTab, search, savedIds, selectedCountry, selectedPartnerSemester])

  function toggleSaved(id) {
    setSavedIds((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    )
  }

  function changeTab(tab) {
    setSelectedPartner(null)
    setActiveTab(tab)
    if (tab !== 'explore' && tab !== 'saved') {
      setSearch('')
      setSelectedCountry('All places')
    }
  }

  return (
    <div className="app-shell">
      <aside className="side-nav">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); changeTab('explore') }}>
          <span className="brand-mark"><GraduationCap size={23} /></span>
          <span className="brand-name">Erasmus<span>Match</span><small>AUEB</small></span>
        </a>
        <p className="nav-caption">YOUR JOURNEY</p>
        <nav className="desktop-nav" aria-label="Main navigation">
          {tabs.map(({ id, label, Icon }) => (
            <button
              className={`nav-item${activeTab === id ? ' active' : ''}`}
              key={id}
              type="button"
              onClick={() => changeTab(id)}
            >
              <Icon size={19} strokeWidth={1.8} />
              {label}
              {id === 'saved' && savedIds.length > 0 && <span className="nav-count">{savedIds.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon"><Sparkles size={17} /></span>
          <strong>Your next chapter</strong>
          <p>Big plans start with a little curiosity.</p>
          <button type="button" onClick={() => changeTab('explore')}>Find your place <ArrowRight size={14} /></button>
        </div>
        <div className="sidebar-footer">Made for AUEB students <span>✦</span></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark"><GraduationCap size={21} /></span>
            <span className="brand-name">Erasmus<span>Match</span><small>AUEB</small></span>
          </div>
          <div className="topbar-note"><span className="status-dot" /> Your next adventure starts here</div>
          <button className="avatar-button" type="button" onClick={() => changeTab('profile')} aria-label="Open profile">A</button>
        </header>

        {selectedPartner ? (
          <PartnerDetail
            partner={selectedPartner}
            city={getPartnerDisplayCity(selectedPartner.erasmusCode) ?? 'Location not listed'}
            isSaved={savedIds.includes(`partner:${selectedPartner.id}`)}
            onToggleSave={toggleSaved}
            onBack={() => setSelectedPartner(null)}
            onEditProfile={() => {
              setSelectedPartner(null)
              setActiveTab('profile')
            }}
            courseRecommendations={detailCourseRecommendations}
          />
        ) : activeTab === 'matches' ? (
          <MatchesScreen
            partners={featuredPartners}
            allPartners={erasmusPartners}
            profile={profile}
            onEditProfile={() => changeTab('profile')}
            onOpenPartner={setSelectedPartner}
            courseRecords={courseRecords}
            onImportCourses={importCourseRecords}
            approvalRequests={approvalRequests}
            setApprovalRequests={saveApprovalRequests}
            persistenceError={storageError}
            academicInterestRatings={academicInterestRatings}
            setAcademicInterestRatings={setAcademicInterestRatings}
          />
        ) : activeTab === 'profile' ? (
          <ProfileScreen
            profile={profile}
            setProfile={setProfile}
            onSaveProfile={saveCurrentProfile}
            persistenceError={storedProfile.error || storedAuebSelection.error || auebSelectionPersistenceError}
          />
        ) : (
          <section className="explore-page">
            <div className="welcome-block">
              <div className="welcome-copy">
                <span className="eyebrow"><span className="eyebrow-line" /> A WORLD OF POSSIBILITIES</span>
                <h1>Where will Erasmus<br className="desktop-break" /> take you<span className="title-period">?</span></h1>
                <p>Find a place to learn, grow and make stories of your own.</p>
              </div>
              <div className="welcome-stamp"><GlobeMark /><span>YOUR<br />WORLD<br /><strong>AWAITS</strong></span></div>
            </div>

            <div className="search-wrap">
              <Search size={20} />
              <input
                type="search"
                placeholder="Search countries, cities or universities"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search destinations"
              />
              {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search">×</button>}
              <span className="search-shortcut">⌕</span>
            </div>

            <div className="section-heading">
              <div><span className="eyebrow">YOUR NEXT STOP</span><h2>{activeTab === 'saved' ? 'Your saved places' : 'Explore destinations'}</h2></div>
              <span className="results-count">{visiblePartners.length} featured partnerships</span>
            </div>
            <div className="country-filters" aria-label="Filter by country">
              {['All places', ...partnerCountries].map((country) => (
                <button
                  className={`filter-chip${selectedCountry === country ? ' selected' : ''}`}
                  type="button"
                  key={country}
                  onClick={() => setSelectedCountry(country)}
                  aria-pressed={selectedCountry === country}
                >
                  {country === 'All places' && <Compass size={14} />}{country}
                </button>
              ))}
            </div>
            <label className="partner-semester-filter">
              <span>Partner catalog semester</span>
              <select
                value={selectedPartnerSemester}
                onChange={(event) => setSelectedPartnerSemester(event.target.value)}
                aria-label="Filter partner universities by verified semester catalog"
              >
                <option value="all">All semester statuses</option>
                <option value="winter">Winter catalog verified</option>
                <option value="spring">Spring catalog verified</option>
              </select>
            </label>
            {visiblePartners.length === 0 && selectedPartnerSemester !== 'all' && (
              <div className="sample-banner partner-empty-filter">
                <span className="sample-banner-icon"><CircleHelp size={14} /></span>
                <span>No partner catalog is verified for this semester in the current data. Unverified availability is not treated as confirmed.</span>
              </div>
            )}
            {visiblePartners.length > 0 && (
              <>
                <div className="section-heading partner-section-heading">
                  <div><span className="eyebrow">2026–2027 PARTNERSHIPS</span><h2>AUEB Erasmus partners</h2></div>
                  <span className="results-count">{visiblePartners.length} featured partnerships</span>
                </div>
                <div className="sample-banner partner-source-banner">
                  <span className="sample-banner-icon"><Check size={14} /></span>
                  <span><strong>Six featured partnerships are shown here; course verification is separate.</strong> All 46 official partnership records are retained in the underlying dataset. <a href={partnershipSourceUrl} target="_blank" rel="noreferrer">AUEB official partnership list</a>.</span>
                </div>
                <div className="partner-grid">
                  {visiblePartners.map((partner) => (
                    <PartnerCard
                      key={partner.id}
                      partner={partner}
                      city={getPartnerDisplayCity(partner.erasmusCode) ?? 'Location not listed'}
                      isSaved={savedIds.includes(`partner:${partner.id}`)}
                      onToggleSave={toggleSaved}
                      onOpen={setSelectedPartner}
                      courseRecords={courseRecords}
                    />
                  ))}
                </div>
              </>
            )}
            {visiblePartners.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon"><Search size={22} /></span>
                <h3>{activeTab === 'saved' ? 'Your shortlist is waiting.' : 'No partner destinations found.'}</h3>
                <p>{activeTab === 'saved' ? 'Save a featured AUEB Erasmus partner to keep it close.' : 'Try a different city, country, Erasmus code or university name.'}</p>
                {activeTab === 'saved' && <button type="button" className="text-button" onClick={() => changeTab('explore')}>Explore destinations <ArrowRight size={15} /></button>}
              </div>
            )}
            <footer className="page-footer">ErasmusMatch AUEB <span>·</span> Dream big, learn everywhere.</footer>
          </section>
        )}
      </main>

      <nav className="mobile-nav" aria-label="Main navigation">
        {tabs.map(({ id, label, Icon }) => (
          <button className={`mobile-nav-item${activeTab === id ? ' active' : ''}`} key={id} type="button" onClick={() => changeTab(id)}>
            <span className="mobile-icon-wrap"><Icon size={20} strokeWidth={1.9} />{id === 'saved' && savedIds.length > 0 && <i />}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function GlobeMark() {
  return <span className="globe-mark"><Compass size={34} strokeWidth={1.35} /></span>
}

function ProfileScreen({ profile, setProfile, onSaveProfile, persistenceError }) {
  const [selectedCourseSemester, setSelectedCourseSemester] = useState(1)
  const [courseSearch, setCourseSearch] = useState('')
  const [language, setLanguage] = useState(languageOptions[0])
  const [languageLevel, setLanguageLevel] = useState('B2')
  const [saveNotice, setSaveNotice] = useState('')
  const selectedAuebCourses = profile.courses.filter((course) => course.selected)
  const visibleAuebCourses = getAuebCoursesForSemester(
    profile.courses,
    selectedCourseSemester,
    courseSearch,
  )
  const auebCourseGroups = groupAuebCoursesByCategory(visibleAuebCourses, selectedCourseSemester)

  function addLanguage() {
    if (profile.languages.some((item) => item.language === language)) return
    setProfile((current) => ({
      ...current,
      languages: [...current.languages, { language, level: languageLevel }],
    }))
  }

  function handleSaveProfile() {
    setSaveNotice('')
    const result = onSaveProfile()
    if (result.success) setSaveNotice('Profile saved successfully!')
    else setSaveNotice(result.error)
  }

  return (
    <section className="profile-page profile-editor">
      <span className="eyebrow">YOUR ERASMUS JOURNEY</span>
      <h1>Set up your study profile.</h1>
      <p className="profile-intro">A few details help rank confirmed AUEB partner options. Choose courses from the official Marketing &amp; Communication catalog below; selection is saved in this browser.</p>

      <div className="profile-editor-card">
        <div className="profile-section-heading">
          <span className="planner-step">00</span>
          <div><h2>Student and coordinator details</h2><p>The coordinator address must be provided by you or your department. The app does not guess an official recipient.</p></div>
        </div>
        <div className="student-details-grid">
          <label className="profile-select-field">
            <span>Full name</span>
            <input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} autoComplete="name" />
          </label>
          <label className="profile-select-field">
            <span>Student email</span>
            <input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} autoComplete="email" />
          </label>
          <label className="profile-select-field">
            <span>Student number (optional)</span>
            <input value={profile.studentNumber} onChange={(event) => setProfile((current) => ({ ...current, studentNumber: event.target.value }))} />
          </label>
          <label className="profile-select-field">
            <span>Department</span>
            <input value={profile.department} onChange={(event) => setProfile((current) => ({ ...current, department: event.target.value }))} />
          </label>
          <label className="profile-select-field coordinator-email-field">
            <span>Coordinator email · required for request</span>
            <input type="email" value={profile.coordinatorEmail} onChange={(event) => setProfile((current) => ({ ...current, coordinatorEmail: event.target.value }))} placeholder="Enter the address supplied by AUEB" />
          </label>
        </div>
      </div>

      <div className="profile-editor-card">
        <div className="profile-section-heading">
          <span className="planner-step">01</span>
          <div><h2>Which AUEB courses would you like to take during Erasmus?</h2><p>Select previously unpassed courses, courses from your planned Erasmus semester, or later-semester courses you wish to propose for recognition. Selection does not imply eligibility or approval.</p></div>
        </div>
        <div className="aueb-catalog-source">
          <p>Course titles, categories and available descriptions or learning outcomes come from official AUEB course pages. Each course is 5 ECTS. Missing course codes, descriptions, outcomes and syllabi are left unfilled.</p>
          <a href={auebCourseCatalogUrl} target="_blank" rel="noreferrer">View official AUEB catalog</a>
        </div>
        <div className="aueb-course-summary" aria-live="polite">
          <div>
            <strong>{selectedAuebCourses.length} selected</strong>
            <span>These courses feed into Academic Match, equivalency proposals and your coordinator email.</span>
          </div>
          {selectedAuebCourses.length > 0 && (
            <ul className="aueb-selected-course-list">
              {selectedAuebCourses.map((course) => (
                <li key={course.id}>
                  <span>{course.title}</span>
                  <button
                    type="button"
                    onClick={() => setProfile((current) => ({
                      ...current,
                      courses: toggleAuebCourseSelection(current.courses, course.id),
                    }))}
                    aria-label={`Remove ${course.title} from selected courses`}
                  >Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {persistenceError && <p className="form-error" role="alert">{persistenceError}</p>}
        <div className="aueb-course-controls">
          <div className="aueb-semester-tabs" role="tablist" aria-label="Filter AUEB courses by semester">
            {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
              <button
                type="button"
                role="tab"
                id={`aueb-semester-tab-${semester}`}
                aria-selected={selectedCourseSemester === semester}
                aria-controls="aueb-semester-courses"
                className={selectedCourseSemester === semester ? 'active' : ''}
                key={semester}
                onClick={() => setSelectedCourseSemester(semester)}
              >Semester {semester}</button>
            ))}
          </div>
          <label className="aueb-course-search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">Search AUEB course titles</span>
            <input
              type="search"
              value={courseSearch}
              onChange={(event) => setCourseSearch(event.target.value)}
              placeholder="Search course titles"
            />
          </label>
        </div>
        <div id="aueb-semester-courses" role="tabpanel" aria-labelledby={`aueb-semester-tab-${selectedCourseSemester}`}>
          {auebCourseGroups.length ? auebCourseGroups.map((group) => (
            <section className="aueb-course-group" key={group.id}>
              <h3>{group.label}</h3>
              <div className="aueb-course-grid">
                {group.courses.map((course) => (
                  <div className="aueb-course-option" key={course.id}>
                    <label className="aueb-course-option-label">
                      <input
                        type="checkbox"
                        checked={course.selected}
                        onChange={() => setProfile((current) => ({
                          ...current,
                          courses: toggleAuebCourseSelection(current.courses, course.id),
                        }))}
                      />
                      <span className="aueb-course-option-content">
                        <strong>{course.title}</strong>
                        <small>Semester {course.semester} · {course.ects} ECTS · {course.courseCode ? `Course code ${course.courseCode}` : 'Course code not yet listed'}</small>
                        {course.categories.length > 0 && (
                          <span className="aueb-course-category-list">
                            {course.categories.map((category) => (
                              <span key={`${course.id}:${category.type}:${category.label}`}>
                                {category.type === 'specialization'
                                  ? category.label
                                  : category.type === 'elective'
                                    ? 'Elective'
                                    : category.type === 'required'
                                      ? 'Required'
                                      : category.label}
                              </span>
                            ))}
                          </span>
                        )}
                        {!course.available2026_2027 && (
                          <span className="aueb-course-unavailable">Not offered in 2026–2027</span>
                        )}
                      </span>
                    </label>
                    {(course.description || course.learningOutcomes) && (
                      <details className="aueb-course-details">
                        <summary>Official course content and learning outcomes</summary>
                        {course.description && <p><strong>Course content:</strong> {course.description}</p>}
                        {course.learningOutcomes && <p><strong>Learning outcomes:</strong> {course.learningOutcomes}</p>}
                      </details>
                    )}
                    <a href={course.officialUrl} target="_blank" rel="noreferrer">Official course page</a>
                  </div>
                ))}
              </div>
            </section>
          )) : (
            <p className="profile-empty-hint">No courses match this semester and search.</p>
          )}
        </div>
      </div>

      <div className="profile-editor-card">
        <div className="profile-section-heading">
          <span className="planner-step">02</span>
          <div><h2>Erasmus semester</h2><p>The semester is used to check term-specific catalog status, not to assume course availability.</p></div>
        </div>
        <label className="profile-select-field">
          <span>Planned semester · academic year 2026–2027</span>
          <select
            value={profile.semester}
            onChange={(event) => setProfile((current) => ({ ...current, semester: event.target.value }))}
          >
            <option value="winter">Winter semester</option>
            <option value="spring">Spring semester</option>
          </select>
        </label>
      </div>

      <div className="profile-editor-card">
        <div className="profile-section-heading">
          <span className="planner-step">03</span>
          <div><h2>Your language abilities</h2><p>Self-reported levels only; they are not treated as certificates or host-course requirements.</p></div>
        </div>
        <div className="profile-inline-form">
          <label className="profile-select-field">
            <span>Language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {languageOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label className="profile-select-field">
            <span>Self-reported level</span>
            <select value={languageLevel} onChange={(event) => setLanguageLevel(event.target.value)}>
              {languageLevels.map((level) => <option key={level}>{level}</option>)}
            </select>
          </label>
          <button type="button" className="secondary-button" onClick={addLanguage}>Add language</button>
        </div>
        {profile.languages.length > 0 ? (
          <ul className="profile-language-list">
            {profile.languages.map((item) => (
              <li key={item.language}>
                <span><strong>{item.language}</strong><small>{item.level} · self-reported</small></span>
                <button
                  type="button"
                  onClick={() => setProfile((current) => ({
                    ...current,
                    languages: current.languages.filter((entry) => entry.language !== item.language),
                  }))}
                  aria-label={`Remove ${item.language}`}
                >Remove</button>
              </li>
            ))}
          </ul>
        ) : <p className="profile-empty-hint">Add the languages you can study in.</p>}
      </div>

      <div className="sample-notice profile-data-notice">
        <CircleHelp size={17} />
        <span><strong>Academic data is not verified.</strong> Course ECTS, host offerings, semester availability, teaching language and course equivalencies remain unknown until confirmed by AUEB and the host university.</span>
      </div>
      {saveNotice && (
        <p className={saveNotice === 'Profile saved successfully!' ? 'profile-save-success' : 'form-error'} role={saveNotice === 'Profile saved successfully!' ? 'status' : 'alert'}>
          {saveNotice}
        </p>
      )}
      <button className="primary-button profile-save-button" type="button" onClick={handleSaveProfile}>
        Save Profile
      </button>
    </section>
  )
}

function CourseDataManager({ partners, courses, onImport }) {
  const apiUrl = import.meta.env.VITE_COURSE_DATA_API_URL ?? ''
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const counts = {
    current: courses.filter((course) => course.verificationStatus === 'current_verified').length,
    historical: courses.filter((course) => course.verificationStatus === 'historical').length,
    candidates: courses.filter((course) => course.verificationStatus === 'unverified_candidate').length,
  }

  function acceptImportedCourses(importedCourses, source) {
    onImport(importedCourses)
    setError('')
    setNotice(`${importedCourses.length} course record(s) validated from ${source}. Current listings require official evidence fields.`)
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setIsLoading(true)
    setError('')
    setNotice('')
    try {
      acceptImportedCourses(parseCourseData(await file.text(), file.name), file.name)
    } catch (importError) {
      setError(importError.message)
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  async function importApi() {
    if (!apiUrl.trim()) {
      setError('Enter your backend/API URL. The app does not discover or scrape university websites.')
      return
    }
    let url
    try {
      url = new URL(apiUrl)
    } catch {
      setError('Enter a valid backend/API URL.')
      return
    }
    if (!['https:', 'http:'].includes(url.protocol)) {
      setError('The backend/API URL must use HTTP or HTTPS.')
      return
    }

    setIsLoading(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Backend returned HTTP ${response.status}.`)
      if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Configured backend must return application/json; direct university-page imports are not supported.')
      }
      const payload = await response.json()
      const rows = Array.isArray(payload) ? payload : payload?.courses
      acceptImportedCourses(validateCourseRecords(rows), url.href)
    } catch (importError) {
      setError(`Could not import course data: ${importError.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const statusLabel = {
    current_verified: 'Current verified',
    historical: 'Historical',
    unverified_candidate: 'Unverified candidate',
  }

  return (
    <details className="course-data-manager">
      <summary><Upload size={16} /> Official course data updates <span>{courses.length} listing(s)</span></summary>
      <div className="course-data-content">
        <p>Import validated course records from a trusted backend/API or JSON/CSV. This app never scrapes university websites. Confirm the official source and verification status before importing.</p>
        <div className="course-data-counts">
          <span><strong>{counts.current}</strong> current verified</span>
          <span><strong>{counts.historical}</strong> historical</span>
          <span><strong>{counts.candidates}</strong> unverified candidates</span>
        </div>
        <div className="course-data-import-row">
          <label className="course-file-button">
            <Upload size={15} /> Choose JSON/CSV
            <input type="file" accept=".json,.csv,application/json,text/csv" onChange={importFile} disabled={isLoading} />
          </label>
          <label className="course-api-field">
            <span>Configured backend/API endpoint</span>
            <input readOnly value={apiUrl || 'Not configured · set VITE_COURSE_DATA_API_URL'} />
          </label>
          <button type="button" className="secondary-button" onClick={importApi} disabled={isLoading}>
            {isLoading ? 'Importing…' : 'Import from API'}
          </button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="import-success" role="status">{notice}</p>}
        <p className="course-data-schema">
          Required fields: partner_id or erasmus_code, academic_year, term, course_code, course_title and verification_status.
          Current verified records also require positive ECTS, language, explicit Bachelor and exchange eligibility, HTTPS catalog and syllabus links, and a valid last-checked timestamp.
          Optional description, syllabus_text and learning_outcomes fields provide course-content evidence; they do not replace verification.
        </p>
        {courses.length > 0 && (
          <div className="imported-course-list">
            {courses.slice(0, 12).map((course) => {
              const partner = partners.find((item) => courseMatchesPartner(course, item, partners))
              return (
                <article key={course.id} className={`imported-course-row ${course.verificationStatus}`}>
                  <div>
                    <strong>{course.title}</strong>
                    <span>{course.courseCode} · {partner?.university ?? course.erasmusCode ?? `Partner ${course.partnerId}`} · {course.academicYear} · {course.semester} · checked {course.lastCheckedAt ?? 'date unknown'}</span>
                  </div>
                  <div className="imported-course-meta">
                    <span>{statusLabel[course.verificationStatus]}</span>
                    <small>{course.ects ?? 'Unknown'} ECTS · {course.language ?? 'Language unknown'} · Bachelor {course.bachelorEligible === null ? 'unknown' : course.bachelorEligible ? 'eligible' : 'not eligible'} · Exchange {course.exchangeEligible === null ? 'unknown' : course.exchangeEligible ? 'eligible' : 'not eligible'}</small>
                    {course.catalogUrl && <a href={course.catalogUrl} target="_blank" rel="noreferrer">Official catalog source</a>}
                    {course.syllabusUrl && <a href={course.syllabusUrl} target="_blank" rel="noreferrer">Course syllabus</a>}
                  </div>
                </article>
              )
            })}
            {courses.length > 12 && <p className="profile-empty-hint">Showing 12 of {courses.length} imported records.</p>}
          </div>
        )}
      </div>
    </details>
  )
}

function ApprovalPanel({
  partners,
  profile,
  courses,
  requests,
  setRequests,
  onEditProfile,
}) {
  const firstCoursePartner = partners.find((partner) => courses.some((course) =>
    course.verificationStatus === 'current_verified' &&
    courseMatchesPartner(course, partner, partners),
  ))
  const [selectedPartnerId, setSelectedPartnerId] = useState(String(firstCoursePartner?.id ?? partners[0]?.id ?? ''))
  const [selectedCourseIds, setSelectedCourseIds] = useState([])
  const [coursePairings, setCoursePairings] = useState([])
  const [auebEctsByCourse, setAuebEctsByCourse] = useState({})
  const [activeDraft, setActiveDraft] = useState(null)
  const [draftBody, setDraftBody] = useState('')
  const [error, setError] = useState('')
  const [copyNotice, setCopyNotice] = useState('')
  const partner = partners.find((item) => String(item.id) === selectedPartnerId)
  const hostListings = courses.filter((course) =>
    partner &&
    courseMatchesPartner(course, partner, partners) &&
    course.academicYear === partner.academicYear,
  )
  const selectableListings = hostListings.filter(isSelectableHostCourse)
  const selectedHostCourses = selectableListings.filter((course) => selectedCourseIds.includes(course.id))
  const profileAuebCourses = profile.courses.filter((course) => course.selected)
  const validCoursePairings = normalizeCoursePairings(
    coursePairings,
    selectedHostCourses,
    profileAuebCourses,
  )
  const pairingTotals = calculatePairingEcts({
    hostCourses: selectedHostCourses,
    auebCourses: profileAuebCourses,
    pairings: validCoursePairings,
    auebEctsByCourse,
  })
  const selectedAuebCourses = pairingTotals.mappedAuebCourses.map((course) => ({
    ...course,
    verified: false,
  }))
  const readiness = getApprovalDraftReadiness({
    hostCourses: selectedHostCourses,
    auebCourses: selectedAuebCourses,
    semester: profile.semester,
  })

  function updateStatus(requestId, status) {
    setRequests((current) => current.map((request) =>
      request.id === requestId ? { ...request, status } : request,
    ))
    if (activeDraft?.id === requestId) setActiveDraft((current) => ({ ...current, status }))
  }

  function createRequest() {
    setError('')
    if (!readiness.draftReady) {
      setError('Select at least one current or unverified host-course candidate to create a provisional draft.')
      return
    }
    try {
      const email = buildApprovalEmail({
        student: profile,
        coordinatorEmail: profile.coordinatorEmail,
        partner,
        semester: profile.semester,
        hostCourses: selectedHostCourses,
        auebCourses: selectedAuebCourses,
        pairings: validCoursePairings,
      })
      const request = {
        id: `approval-${requests.length + 1}`,
        status: 'Draft',
        partnerName: partner?.university ?? 'Host university',
        subject: email.subject,
        to: email.to,
        body: email.body,
        mailto: email.mailto,
      }
      setRequests((current) => [request, ...current])
      setActiveDraft(request)
      setDraftBody(request.body)
      setCopyNotice('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  function updateDraftBody(value) {
    setDraftBody(value)
    if (!activeDraft) return
    const updated = { ...activeDraft, body: value }
    setActiveDraft(updated)
    setRequests((current) => current.map((request) => request.id === updated.id ? updated : request))
  }

  function openMailDraft() {
    if (!activeDraft) return
    if (!activeDraft.to) {
      setCopyNotice('No coordinator email is set in Profile. Copy this draft and address it using the official contact.')
      return
    }
    const mailto = createMailtoLink(activeDraft.to, activeDraft.subject, draftBody)
    if (mailto.requiresCopyFallback) {
      setCopyNotice('Το προσχέδιο είναι πολύ μεγάλο για mailto. Χρησιμοποιήστε την αντιγραφή και επικολλήστε το σε νέο email.')
      return
    }
    window.location.href = mailto.href
    setCopyNotice('Άνοιξε αίτημα email. Η κατάσταση παραμένει Draft μέχρι να την ενημερώσετε εσείς.')
  }

  async function copyDraft() {
    try {
      const recipientLine = activeDraft.to ? `To: ${activeDraft.to}\n` : ''
      await navigator.clipboard.writeText(`${recipientLine}Subject: ${activeDraft.subject}\n\n${draftBody}`)
      setCopyNotice(activeDraft.to
        ? 'Το κείμενο αντιγράφηκε. Επικολλήστε το σε νέο email προς τον συντονιστή.'
        : 'Το κείμενο αντιγράφηκε. Προσθέστε τη διεύθυνση του συντονιστή που θα βρείτε από επίσημη πηγή.')
    } catch (copyError) {
      setCopyNotice(`Δεν ήταν δυνατή η αντιγραφή: ${copyError.message}`)
    }
  }

  return (
    <section className="approval-panel">
      <div className="profile-section-heading">
        <span className="planner-step">03</span>
        <div><h2>Prepare a provisional Learning Agreement</h2><p>Select verified or unverified course candidates and propose AUEB equivalencies. This creates a reviewable email draft only; it does not submit or approve a Learning Agreement.</p></div>
      </div>
      <div className="approval-fields">
        <label className="profile-select-field">
          <span>Confirmed host partner</span>
          <select
            value={selectedPartnerId}
            onChange={(event) => { setSelectedPartnerId(event.target.value); setSelectedCourseIds([]); setCoursePairings([]) }}
          >
            {partners.map((item) => <option key={item.id} value={item.id}>{item.university} · {item.erasmusCode}</option>)}
          </select>
        </label>
        <label className="profile-select-field">
          <span>Semester · from Profile</span>
          <input readOnly value={`${profile.semester} · ${partner?.academicYear ?? 'Academic year unavailable'}`} />
        </label>
      </div>

      <h3 className="approval-subheading">Host courses</h3>
      {hostListings.length === 0 ? (
        <p className="approval-empty">No course listings are imported for this partner and academic year. Import course records above to start a provisional plan.</p>
      ) : (
        <div className="approval-course-list">
          {hostListings.map((course) => {
            const selectable = isSelectableHostCourse(course)
            const selected = selectedCourseIds.includes(course.id)
            const warnings = getCourseReviewWarnings(course, profile.semester)
            return (
              <div className={`approval-course-row${selectable ? '' : ' unavailable'}${selected ? ' selected' : ''}`} key={course.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={!selectable}
                    onChange={() => {
                      setSelectedCourseIds((current) => toggleSelectedHostCourse(current, course))
                      if (selected) {
                        setCoursePairings((current) =>
                          current.filter((pairing) => pairing.hostCourseId !== course.id),
                        )
                      }
                    }}
                  />
                  <span><strong>{course.title}</strong><small>{course.courseCode} · {course.ects ?? 'Unknown'} ECTS · {course.language ?? 'Language unknown'} · {course.semester ?? 'Unknown semester'}</small></span>
                </label>
                <div className="course-status-details">
                  <span className="course-status-label">{course.verificationStatus === 'historical' ? 'Historical · not selectable' : course.verificationStatus === 'unverified_candidate' ? 'Unverified candidate · provisional selection only' : 'Current verified · not academically approved'}</span>
                  {selected && warnings.length > 0 && (
                    <small className="course-review-warning">{warnings.join(' · ')}</small>
                  )}
                  {selected && warnings.length === 0 && <small className="course-review-warning">Academic approval is still pending.</small>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <section className="proposed-equivalencies">
        <h3 className="approval-subheading">Proposed Course Equivalencies</h3>
        <p className="approval-empty">Create one-to-one or many-to-many course pairings manually. Every mapping is Pending Academic Approval; ECTS values are shown separately and do not need to match.</p>
        {profileAuebCourses.length === 0 ? (
          <div className="aueb-catalog-empty">
            <p>No AUEB courses are selected yet. Choose courses you would like to take during Erasmus in Profile.</p>
            <button type="button" className="secondary-button" onClick={onEditProfile}>Choose AUEB courses in Profile</button>
          </div>
        ) : (
          <>
            <div className="aueb-proposal-course-list">
              {profileAuebCourses.map((course) => (
                <article className="aueb-proposal-course" key={course.id}>
                  <div>
                    <strong>{course.courseCode ? `${course.courseCode} · ` : ''}{course.title}</strong>
                    <small>
                      {course.catalogStatus === 'official_listing_unverified'
                        ? `Official AUEB listing · ${course.ects} ECTS · course-page details shown when available`
                        : course.catalogStatus === 'imported_unverified'
                          ? 'Imported catalog · source not verified'
                          : 'Student-proposed course · not verified'}
                    </small>
                    {course.description && <small>{course.description}</small>}
                    {course.learningOutcomes && <small>Learning outcomes: {course.learningOutcomes}</small>}
                    {course.syllabusUrl && <a href={course.syllabusUrl} target="_blank" rel="noreferrer">AUEB syllabus</a>}
                    {course.officialUrl && <a href={course.officialUrl} target="_blank" rel="noreferrer">Official AUEB course page</a>}
                  </div>
                  <label className="profile-select-field proposed-ects-field">
                    <span>Proposed AUEB ECTS · default 5</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={auebEctsByCourse[course.id] ?? course.ects ?? ''}
                      onChange={(event) => setAuebEctsByCourse((current) => ({
                        ...current,
                        [course.id]: event.target.value,
                      }))}
                      placeholder="Enter proposal if unknown"
                    />
                  </label>
                </article>
              ))}
            </div>
            {selectedHostCourses.length === 0 ? (
              <p className="approval-empty">Select one or more host courses above to start pairing.</p>
            ) : (
              <div className="course-pairing-builder">
                {selectedHostCourses.map((hostCourse) => (
                  <fieldset className="course-pairing-host" key={hostCourse.id}>
                    <legend>{hostCourse.courseCode} · {hostCourse.title} · {hostCourse.ects ?? 'Unknown'} host ECTS</legend>
                    <span>Pair with selected AUEB courses:</span>
                    <div className="course-pairing-options">
                      {profileAuebCourses.map((auebCourse) => {
                        const checked = validCoursePairings.some((pairing) =>
                          pairing.hostCourseId === hostCourse.id && pairing.auebCourseId === auebCourse.id,
                        )
                        return (
                          <label key={auebCourse.id}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setCoursePairings((current) =>
                                toggleCoursePairing(current, hostCourse.id, auebCourse.id),
                              )}
                            />
                            <span>{auebCourse.courseCode ? `${auebCourse.courseCode} · ` : ''}{auebCourse.title}</span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
            {validCoursePairings.length > 0 ? (
              <>
                <div className="equivalency-ects-summary">
                  <div><span>Unique paired host-course ECTS</span><strong>{pairingTotals.hostEcts}</strong></div>
                  <div><span>Unique paired AUEB-course ECTS</span><strong>{pairingTotals.auebEcts}</strong></div>
                </div>
                <p className="approval-empty">Pairing totals count each course once, even when it appears in multiple mappings. Unknown ECTS are excluded. The two totals are not required to match.</p>
                <div className="course-pairing-table-wrap">
                  <table className="course-pairing-table">
                    <thead>
                      <tr><th>Host course</th><th>AUEB course</th><th>Host ECTS</th><th>AUEB ECTS</th><th>Syllabi and status</th></tr>
                    </thead>
                    <tbody>
                      {validCoursePairings.map((pairing) => {
                        const hostCourse = selectedHostCourses.find((course) => course.id === pairing.hostCourseId)
                        const auebCourse = selectedAuebCourses.find((course) => course.id === pairing.auebCourseId)
                        return (
                          <tr key={`${pairing.hostCourseId}-${pairing.auebCourseId}`}>
                            <td>{hostCourse.courseCode} · {hostCourse.title}</td>
                            <td>{auebCourse.courseCode ? `${auebCourse.courseCode} · ` : ''}{auebCourse.title}</td>
                            <td>{hostCourse.ects ?? 'Unknown'}</td>
                            <td>{auebCourse.ects ?? 'Not yet verified'}</td>
                            <td className="pairing-sources">
                              {hostCourse.syllabusUrl && <a href={hostCourse.syllabusUrl} target="_blank" rel="noreferrer">Host syllabus</a>}
                              {auebCourse.syllabusUrl && <a href={auebCourse.syllabusUrl} target="_blank" rel="noreferrer">AUEB syllabus</a>}
                              {auebCourse.officialUrl && <a href={auebCourse.officialUrl} target="_blank" rel="noreferrer">AUEB course page</a>}
                              <strong>Pending Academic Approval</strong>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="approval-empty">No course pairings proposed yet. Choose AUEB course(s) under each selected host course.</p>
            )}
          </>
        )}
        <p className="approval-privacy-note">Automated suggestions require verified course descriptions, syllabus text or learning outcomes for both courses, plus meaningful title/topic overlap. Syllabus links are not fetched or treated as course content, and title-only similarity is never scored.</p>
      </section>

      <div className="approval-ects-totals">
        <div><span>Provisional host ECTS · known selected values</span><strong>{readiness.provisionalHostTotal} / 30</strong><small>{readiness.provisionalHostTotal >= 30 ? 'Provisional target reached; not official readiness.' : `Below 30 by ${30 - readiness.provisionalHostTotal} provisional ECTS.`} Unknown ECTS are excluded.</small></div>
        <div><span>Verified host ECTS · strict course checks</span><strong>{readiness.verifiedHostTotal} / 30</strong><small>{readiness.hostReady ? 'Verified host target reached' : `Need ${Math.max(0, 30 - readiness.verifiedHostTotal)} more strictly verified ECTS`}</small></div>
        <div><span>Proposed AUEB ECTS</span><strong>{readiness.proposedAuebTotal} / 30</strong><small>{readiness.proposedAuebTotal >= 30 ? 'Proposal reaches 30; still unverified.' : `Below 30 by ${30 - readiness.proposedAuebTotal} proposed ECTS.`} Not approved.</small></div>
      </div>
      <div className="approval-warning">
        <strong>Official Learning Agreement readiness: {readiness.complete ? 'Ready for coordinator review' : 'Not ready'}</strong>
        <p>{readiness.complete
          ? 'Strict host-course checks and both verified 30 ECTS requirements are met. Coordinator approval is still required.'
          : 'This provisional plan is not ready for an official Learning Agreement. Unverified courses and student-proposed AUEB credits do not count toward official readiness.'}</p>
        <ul>
          <li>Unknown ECTS, semester, Bachelor eligibility or exchange eligibility require confirmation.</li>
          <li>Academic approval is pending and is never granted automatically.</li>
        </ul>
      </div>
      <p className="approval-privacy-note">Imported listings and approval drafts are stored in this browser only. Drafts may contain personal details; use a trusted device and remove browser storage when appropriate.</p>
      {!profile.coordinatorEmail && <p className="approval-warning">No coordinator email is set in Profile. You can still create and copy the email text; add an official address yourself before sending.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button
        type="button"
        className="primary-button approval-create-button"
        onClick={createRequest}
        disabled={!readiness.draftReady}
      >
        <Mail size={16} /> Generate provisional email draft
      </button>

      {requests.length > 0 && (
        <div className="approval-history">
          <h3 className="approval-subheading">Approval status · manually maintained</h3>
          {requests.map((request) => (
            <div className="approval-history-row" key={request.id}>
              <button type="button" className="approval-history-title" onClick={() => { setActiveDraft(request); setDraftBody(request.body); setCopyNotice('') }}>
                <strong>{request.partnerName}</strong><small>{request.subject}</small>
              </button>
              <label className="profile-select-field">
                <span>Status</span>
                <select value={request.status} onChange={(event) => updateStatus(request.id, event.target.value)}>
                  {approvalStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
            </div>
          ))}
        </div>
      )}

      {activeDraft && (
        <div className="approval-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setActiveDraft(null)
        }}>
          <section className="approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-draft-title">
            <button type="button" className="approval-modal-close" onClick={() => setActiveDraft(null)} aria-label="Close email draft">×</button>
            <span className="eyebrow">REVIEW BEFORE SENDING</span>
            <h2 id="approval-draft-title">Academic approval email draft</h2>
            <p>{activeDraft.to
              ? <>To: <strong>{activeDraft.to}</strong></>
              : <>No coordinator address provided. Copy the text and use an official address from your department.</>
            } · Status: <strong>{activeDraft.status}</strong>. Opening the email app does not send the message or change this status.</p>
            <label className="profile-select-field">
              <span>Subject</span>
              <input value={activeDraft.subject} onChange={(event) => {
                const subject = event.target.value
                setActiveDraft((current) => ({ ...current, subject }))
                setRequests((current) => current.map((item) => item.id === activeDraft.id ? { ...item, subject } : item))
              }} />
            </label>
            <label className="profile-select-field draft-body-field">
              <span>Editable email body</span>
              <textarea value={draftBody} onChange={(event) => updateDraftBody(event.target.value)} rows={13} />
            </label>
            {copyNotice && <p className="import-success" role="status">{copyNotice}</p>}
            <div className="approval-modal-actions">
              {activeDraft.to && <button type="button" className="primary-button" onClick={openMailDraft}><Mail size={15} /> Open email app</button>}
              <button type="button" className="secondary-button" onClick={copyDraft}><ClipboardCopy size={15} /> Copy email text</button>
              <label className="profile-select-field">
                <span>Update status manually</span>
                <select value={activeDraft.status} onChange={(event) => updateStatus(activeDraft.id, event.target.value)}>
                  {approvalStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function RecommendationMatchBar({
  label,
  score,
  unknownLabel,
  explanation,
  valueLabel,
}) {
  const scored = Number.isFinite(score)
  return (
    <div className="recommendation-match-bar academic">
      <div className="recommendation-match-label">
        <strong>{label}</strong>
        <span>{scored ? valueLabel ?? `${score}%` : unknownLabel}</span>
      </div>
      {scored
        ? (
          <div
            className="recommendation-match-track"
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score}
            aria-valuetext={valueLabel ?? `${score}%`}
          >
            <span style={{ width: `${score}%` }} />
          </div>
        )
        : <p className="recommendation-match-unscored">{unknownLabel}</p>}
      <small>{explanation}</small>
    </div>
  )
}

function MatchesScreen({
  partners,
  allPartners,
  profile,
  onEditProfile,
  onOpenPartner,
  courseRecords,
  onImportCourses,
  approvalRequests,
  setApprovalRequests,
  persistenceError,
  academicInterestRatings,
  setAcademicInterestRatings,
}) {
  const [resultsRequested, setResultsRequested] = useState(false)
  const selectedCourses = profile.courses.filter((course) => course.selected)
  const visibleCourseRecords = courseRecords.filter((course) =>
    partners.some((partner) => courseMatchesPartner(course, partner, allPartners)),
  )
  const recommendationPartners = useMemo(() => partners.map((partner) => {
    const hostCourses = visibleCourseRecords.filter((course) =>
      courseMatchesPartner(course, partner, allPartners) &&
      course.academicYear === partner.academicYear &&
      course.semester === profile.semester,
    )
    const currentCourses = visibleCourseRecords.filter((course) =>
      courseMatchesPartner(course, partner, allPartners) &&
      course.academicYear === partner.academicYear &&
      course.semester === profile.semester &&
      course.verificationStatus === 'current_verified',
    )
    const eligibleCourses = currentCourses.filter((course) =>
      course.bachelorEligible === true && course.exchangeEligible === true,
    )
    return {
      ...partner,
      hostCourses,
      verifiedCourses: eligibleCourses.map((course) => ({
        courseId: course.id,
        ects: course.ects,
        verified: true,
      })),
      courseDataStatus: partner.courseDataStatus,
      teachingLanguages: [...new Set(eligibleCourses.map((course) => course.language).filter(Boolean))],
      teachingLanguagesVerified: eligibleCourses.length > 0,
    }
  }), [partners, visibleCourseRecords, allPartners, profile.semester])
  const recommendations = useMemo(
    () => generateRecommendations({
      partners: recommendationPartners,
      studentLanguages: profile.languages,
      outstandingCourses: selectedCourses,
      academicInterestRatings,
      semester: profile.semester,
      rules: academicRules,
    }),
    [
      recommendationPartners,
      profile.languages,
      academicInterestRatings,
      profile.semester,
      selectedCourses,
    ],
  )
  const ects = recommendations[0]?.validation

  return (
    <section className="matches-page">
      <div className="matches-intro">
        <span className="eyebrow"><span className="eyebrow-line" /> PARTNER RECOMMENDER</span>
        <h1>Find a study destination.</h1>
        <p>Compare your selected AUEB courses with available host-university courses using verified academic evidence.</p>
      </div>

      <div className="academic-disclaimer matches-status-notice">
        <Sparkles size={16} />
        <span><strong>Evidence-gated academic matching.</strong> A course fit requires verified course-topic and course-content evidence. Missing evidence is shown as unknown, never as a score.</span>
      </div>

      <div className="planner-panel matches-profile-summary">
        <div className="planner-heading">
          <div><span className="planner-step">01</span><div><h2>Your profile</h2><p>{selectedCourses.length} selected AUEB course(s) · {profile.languages.length} self-reported language(s) · {profile.semester} semester</p></div></div>
          <button type="button" className="secondary-button" onClick={onEditProfile}>Edit profile</button>
        </div>
        <p className="rules-caption"><CircleHelp size={15} /> Selected courses come from the official AUEB catalog. Course details and equivalencies remain unverified until confirmed.</p>
      </div>

      {persistenceError && <p className="form-error" role="alert">{persistenceError}</p>}
      <section className="planner-panel academic-interests-panel">
        <div className="planner-heading">
          <div>
            <span className="planner-step">02</span>
            <div><h2>Academic Interests</h2><p>Optional preferences refine rankings only when verified host-course subjects are available.</p></div>
          </div>
        </div>
        <div className="academic-interest-grid">
          {academicInterestCategories.map((category) => (
            <label className="profile-select-field" key={category}>
              <span>{category}</span>
              <select
                value={academicInterestRatings[category] ?? ''}
                onChange={(event) => setAcademicInterestRatings((current) => {
                  const updated = { ...current }
                  if (event.target.value === '') delete updated[category]
                  else updated[category] = Number(event.target.value)
                  return updated
                })}
              >
                <option value="">Not rated</option>
                <option value="1">1 · Not interested</option>
                <option value="2">2 · Slightly interested</option>
                <option value="3">3 · Neutral</option>
                <option value="4">4 · Interested</option>
                <option value="5">5 · Very interested</option>
              </select>
            </label>
          ))}
        </div>
        <p className="rules-caption"><CircleHelp size={15} /> Interest ratings are not course eligibility or approval. No interest score is shown unless host-course subjects and categories are verified.</p>
      </section>
      <CourseDataManager partners={partners} courses={visibleCourseRecords} onImport={onImportCourses} />
      <div className="planner-panel find-matches-panel">
        <p>Course evidence remains primary. If verified host subject data is available, preferences contribute at most 20% to a recommendation.</p>
        <button type="button" className="primary-button" onClick={() => setResultsRequested(true)}>
          Find My Erasmus Matches
        </button>
      </div>

      {resultsRequested && <>
      <div className="matches-results-heading">
        <div><span className="eyebrow">CONFIRMED PARTNERSHIPS · 2026–2027</span><h2>Ranked destination candidates</h2></div>
        <span className="selected-count">{recommendations.length} featured partnerships</span>
      </div>

      {ects && (
        <div className="credit-summary ects-check-summary">
          <div className="credit-metric">
            <span>HOST UNIVERSITY · 30 ECTS TARGET</span>
            <strong>{ects.host.ects}<small> confirmed / {ects.host.minimumEcts}</small></strong>
            <i>{ects.host.message}</i>
          </div>
          <div className="credit-metric">
            <span>AUEB RECOGNITION · 30 ECTS TARGET</span>
            <strong>{ects.aueb.ects}<small> confirmed / {ects.aueb.minimumEcts}</small></strong>
            <i>{ects.aueb.message}</i>
          </div>
        </div>
      )}

      <div className="academic-disclaimer">
        <CircleHelp size={16} /><span><strong>Απαιτείται ακαδημαϊκή επιβεβαίωση.</strong> Imported course listings can provide course-level evidence, but catalog completeness, course access, recognition and student eligibility remain separate checks. Unknown or unverified credits are not counted.</span>
      </div>

      <div className="recommendation-list">
        {recommendations.map((recommendation, index) => {
          const partner = recommendation.partner
          const city = getPartnerDisplayCity(partner.erasmusCode) ?? 'Location not listed'
          const cityImage = getPartnerCityImage(city)
          const courseSummary = summarizeCourseVerification(partner, visibleCourseRecords, allPartners)
          const potentialMatchCoverage = calculatePotentialMatchCoverage(
            selectedCourses,
            recommendation.academicMatch.potentialPairs,
          )
          const preliminaryCandidates = recommendation.academicMatch.potentialPairs.filter((pair) =>
            pair.status === 'unverified_potential',
          )
          return (
            <article className="recommendation-card" key={partner.id}>
              <div className="recommendation-header">
                <div className="recommendation-partner-visual"><CityVisual city={city} /></div>
                <div className="recommendation-title">
                  <span className="eyebrow">PARTNER CANDIDATE {String(index + 1).padStart(2, '0')} · {city}, {partner.country}</span>
                  <h3>{partner.featuredDisplayName}</h3>
                  <span className="rank-caption course-verification-caption">
                    {partner.featuredGroup === 'additional_candidate'
                      ? 'Additional candidate · course verification incomplete'
                      : courseSummary.label}
                  </span>
                </div>
                <span className={`validation-badge ${recommendation.academicMatch.status === 'supported' ? 'potential_match' : recommendation.academicMatch.status === 'no_verified_fit' ? 'not_met' : 'cannot_confirm'}`}>
                  {recommendation.academicMatch.status === 'supported'
                    ? 'Potential course fit · pending academic approval'
                    : recommendation.academicMatch.status === 'no_verified_fit'
                      ? 'No verified academic course fit'
                      : 'Insufficient academic evidence'}
                </span>
              </div>
              <p className="recommendation-explanation">
                Confirmed partnership · Erasmus code {partner.erasmusCode} · study cycle {partner.studyCycle}. This confirms the partnership record only, not student eligibility or course access.
                {' '}{cityImage
                  ? <>City image: {cityImage.creator} · {cityImage.license} (<a href={cityImage.source} target="_blank" rel="noreferrer">source</a>).</>
                  : 'Illustrative placeholder · not a university photo.'}
              </p>
              <div className="recommendation-match-panel">
                <RecommendationMatchBar
                  label="Academic Match"
                  score={recommendation.academicMatch.score}
                  unknownLabel="Not yet scoreable"
                  explanation={recommendation.academicMatch.score === null
                    ? selectedCourses.length === 0
                      ? 'Select AUEB courses before evidence-qualified academic fit can be scored.'
                      : recommendation.academicMatch.missingEvidence.slice(0, 2).join(' ')
                    : 'Share of selected AUEB courses with evidence-qualified host-course matches.'}
                />
                <RecommendationMatchBar
                  label="Potential Match Coverage"
                  score={potentialMatchCoverage.score}
                  valueLabel={potentialMatchCoverage.score === null
                    ? undefined
                    : `${potentialMatchCoverage.matchedCourseCount} of ${potentialMatchCoverage.selectedCourseCount} selected courses have potential matches (${potentialMatchCoverage.score}%)`}
                  unknownLabel="Select AUEB courses to see potential coverage"
                  explanation={potentialMatchCoverage.score === null
                    ? 'Preliminary candidates require verification and academic approval.'
                    : `${preliminaryCandidates.length} preliminary host-course candidate(s), requiring verification; not approved equivalencies.`}
                />
                <RecommendationMatchBar
                  label="Academic Interest Alignment"
                  score={recommendation.academicInterestAlignment.score}
                  unknownLabel="Not enough verified information"
                  explanation={recommendation.academicInterestAlignment.categories.length
                    ? `Based on verified host subjects: ${recommendation.academicInterestAlignment.categories.join(', ')}.`
                    : 'Verified host-course subject categories or matching ratings are unavailable.'}
                />
                {recommendation.academicMatch.score !== null && (
                  <RecommendationMatchBar
                    label={recommendation.combinedScore !== null
                      ? 'Weighted Academic Recommendation'
                      : recommendation.academicMatch.score === 0
                        ? 'Academic Match · no combined score'
                        : 'Academic Compatibility'}
                    score={recommendation.combinedScore ?? recommendation.academicMatch.score}
                    unknownLabel={recommendation.academicMatch.score === 0
                      ? 'Not combined · no verified course fit'
                      : 'Academic compatibility only'}
                    explanation={recommendation.academicMatch.score === 0
                      ? 'No weighted score because no selected AUEB courses have evidence-supported host matches.'
                      : recommendation.combinedScore === null
                      ? 'Showing academic compatibility alone; preference alignment is unavailable or cannot compensate for a lack of course fit.'
                      : '80% course compatibility + 20% verified academic interest alignment.'}
                  />
                )}
              </div>
              <details className="recommendation-reasons-details">
                <summary>Why this university?</summary>
                <ul className="recommendation-reasons">
                  {recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
                <div className="recommendation-evidence-grid">
                  <section>
                    <h4>Academic interest alignment</h4>
                    {recommendation.academicInterestAlignment.score === null
                      ? <p>Not enough verified information. Verified host-course subject categories and student ratings are required.</p>
                      : <p>{recommendation.academicInterestAlignment.score}% across verified host subjects: {recommendation.academicInterestAlignment.categories.join(', ')}. The weighted recommendation uses 80% course compatibility and 20% interest alignment.</p>}
                  </section>
                  <section>
                    <h4>Academic course evidence</h4>
                    {recommendation.academicMatch.potentialPairs.length > 0 ? (
                      <ul className="recommendation-evidence-list">
                        {recommendation.academicMatch.potentialPairs.map((pair) => (
                          <li key={`${pair.auebCourseId}:${pair.hostCourseId}`}>
                            <strong>{pair.auebTitle} ↔ {pair.hostTitle}</strong>
                            <span>
                              {pair.status === 'evidence_supported_potential'
                                ? `Evidence-supported potential pairing · shared topic: ${pair.sharedTopics.join(', ')} · shared content: ${pair.sharedContent.join(', ')}. Still Pending Academic Approval.`
                                : `Topic overlap only; not a verified match. Missing: ${pair.missingEvidence.join('; ')}.`}
                            </span>
                            <span>
                              Host ECTS {pair.hostEcts ?? 'unknown'} · AUEB ECTS {pair.auebEcts ?? 'unknown'} (may differ; coordinator review required) ·
                              {' '}host semester {pair.hostSemester ?? 'unknown'} · language {pair.hostLanguage ?? 'unknown'} ·
                              {' '}Bachelor eligibility {pair.bachelorEligible === true ? 'yes' : pair.bachelorEligible === false ? 'no' : 'unknown'} ·
                              {' '}exchange eligibility {pair.exchangeEligible === true ? 'yes' : pair.exchangeEligible === false ? 'no' : 'unknown'} ·
                              {' '}verification {pair.hostVerificationStatus?.replaceAll('_', ' ') ?? 'unknown'}
                            </span>
                            <span className="evidence-source-links">
                              {pair.auebUrl && <a href={pair.auebUrl} target="_blank" rel="noreferrer">Official AUEB course page</a>}
                              {pair.hostUrl && <a href={pair.hostUrl} target="_blank" rel="noreferrer">Host catalog</a>}
                              {pair.hostSyllabusUrl && <a href={pair.hostSyllabusUrl} target="_blank" rel="noreferrer">Host syllabus</a>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No potential course pairing can be established from the available title/topic evidence.</p>
                    )}
                    {recommendation.academicMatch.reasons.map((reason) => <p key={reason}>{reason}</p>)}
                    {recommendation.academicMatch.missingEvidence.length > 0 && (
                      <>
                        <strong>Missing or unverified academic evidence</strong>
                        <ul className="recommendation-evidence-list">
                          {recommendation.academicMatch.missingEvidence.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </>
                    )}
                  </section>
                </div>
              </details>
              <button className="text-button recommendation-details-button" type="button" onClick={() => onOpenPartner(partner)}>
                Partnership and source details <ArrowRight size={15} />
              </button>
            </article>
          )
        })}
      </div>
      <p className="matches-footnote">Academic Match is based only on course evidence. Proposed equivalencies remain pending coordinator approval and do not imply student eligibility.</p>
      <ApprovalPanel
        partners={partners}
        profile={profile}
        courses={visibleCourseRecords}
        requests={approvalRequests}
        setRequests={setApprovalRequests}
        onEditProfile={onEditProfile}
      />
      </>}
    </section>
  )
}

export default App
