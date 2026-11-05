# ErasmusMatch AUEB

**A personalized Erasmus course planning and recommendation prototype for students of the Athens University of Economics and Business (AUEB).**

ErasmusMatch AUEB is a React + Vite web application designed primarily for students of the Department of Marketing & Communication. It helps students explore Erasmus partner universities, select their AUEB courses, discover potentially relevant host-university courses, compare academic matching evidence, and prepare provisional Learning Agreement proposals.

The application includes a **personalized course suggestion system** that updates its recommendations according to the student's selected AUEB courses.

**Important:** ErasmusMatch is an academic planning and decision-support prototype. Suggested course matches are not officially approved equivalencies. Final course recognition, Erasmus eligibility, and Learning Agreement approval remain the responsibility of the relevant university coordinators.

---

## 1. Main features

### Explore Erasmus universities

The application displays six featured Erasmus partner universities:

1. Ghent University — Belgium
2. Comenius University in Bratislava — Slovakia
3. Matej Bel University in Banská Bystrica — Slovakia
4. Sofia University St. Kliment Ohridski — Bulgaria
5. WU Vienna University of Economics and Business — Austria
6. University of Latvia — Latvia

The first four universities are core featured destinations. WU Vienna and the University of Latvia are additional candidates with incomplete host-course verification.

The source dataset preserves 46 individual AUEB partnership records, including separate partnership records and study cycles where applicable.

Each university page provides available partnership information, course listings, source references, and academic verification notices.

### AUEB student profile and course selection

The Profile section contains 94 AUEB Marketing & Communication course listings, sourced from the [official AUEB department course catalog](https://www.dept.aueb.gr/el/mbc_courses) and its linked course pages.

Students can:

- Browse courses by semester (1–8).
- Search for courses by title.
- Review specialization and elective categories.
- Examine available descriptions and learning outcomes.
- Select AUEB courses they wish to study or seek recognition for during Erasmus.
- Save their selections in browser storage.

Each listed AUEB course carries 5 ECTS.

Unavailable descriptions, learning outcomes, and syllabi are not invented. Courses marked as not offered during the 2026–2027 academic year remain visible with explicit warnings.

### Personalized course suggestion system

The central functionality of ErasmusMatch is its personalized course suggestion system.

The system uses the student's saved AUEB course selections and the available host-university course information to identify potentially relevant academic opportunities.

For each university, the application distinguishes between:

- **Recommended for Your AUEB Courses:** Courses meeting the application's stricter academic evidence requirements, where sufficient information is available.
- **Potential Matches — Verification Needed:** Preliminary candidates that may be academically relevant but lack sufficient evidence for a verified recommendation.
- **Browse All Host Courses:** The complete imported host-course listings, displayed separately from personalized suggestions.

Recommendations respond to changes in the student's selected AUEB courses.

The system considers available course titles, descriptions, syllabus information, learning outcomes, ECTS, semester, teaching language, eligibility, and verification status according to its matching rules.

Topical similarity alone is insufficient to establish an approved academic equivalency.

### University comparison indicators

The Matches page provides three separate indicators for each featured university.

**Academic Match**

A strict evidence-qualified indicator based on the application's academic matching rules.

A numerical score is displayed only when sufficient verified academic evidence and required host-course metadata are available.

Otherwise, the interface displays **"Not yet scoreable"**, together with an explanation of the missing evidence.

Unverified course candidates do not increase the Academic Match score.

**Potential Match Coverage**

A preliminary discovery indicator showing the percentage of distinct selected AUEB courses that have at least one potential host-university course candidate.

The calculation is:

**Potential Match Coverage = (Selected AUEB courses with preliminary candidates ÷ Total selected AUEB courses) × 100**

Each selected AUEB course is counted once, even when multiple host courses are identified.

For example, if a student selects five AUEB courses and one has potential matches at Comenius University, the displayed coverage is **20%**.

This percentage represents preliminary course discovery, not academic equivalency approval.

**Academic Interest Alignment**

An additional indicator based on available academic interest and verified subject information.

A score is shown only when sufficient supporting evidence is available. Otherwise, the application displays **"Not enough verified information"** rather than inventing a percentage.

### Example recommendation

A student selecting **Introduction to Informatics (5231)** at AUEB may see the following preliminary candidates at Comenius University:

- Computer Science (EN)
- Data Management

Both are presented as potential course candidates requiring further verification.

The application distinguishes the host university's ECTS from any proposed AUEB recognition ECTS. Proposed recognition is not automatically verified or approved.

This example illustrates how ErasmusMatch connects a student's selected courses to relevant host-university course information while preserving academic uncertainty.

### ECTS planning and validation

ErasmusMatch independently tracks:

- Host-university ECTS.
- AUEB-recognized ECTS.

The application uses separate 30-ECTS planning targets.

Strict verified-credit calculations count only explicitly verified records with valid numeric ECTS. Unknown or unverified credits are excluded.

A proposed course equivalency does not establish verified AUEB recognition.

The 30-ECTS indicators are planning checks, not confirmation of Erasmus eligibility or coordinator approval.

### Provisional Learning Agreement planning

Students can create provisional Learning Agreement proposals using available host-university course listings.

The application supports:

- Selecting eligible host-course candidates for provisional planning.
- Pairing host courses with one or more selected AUEB courses.
- Associating an AUEB course with multiple host courses.
- Tracking host and proposed AUEB recognition ECTS separately.
- Avoiding duplicate counting in course totals.
- Reviewing unresolved academic evidence.
- Preparing proposed course pairings for coordinator review.

Current verified and unverified-candidate listings can be used for provisional planning where permitted by the application's rules. Historical listings remain unavailable for selection.

Every proposed pairing remains **Pending Academic Approval** until confirmed through the official university process.

### Coordinator email drafts and approval tracking

ErasmusMatch can generate an editable Greek-language email draft containing:

- Proposed host/AUEB course pairings.
- Separate host and AUEB ECTS values.
- Available course and syllabus links.
- Unresolved academic verification issues.
- Pending approval notices.

The application does not automatically send emails.

When a coordinator email address is supplied, the draft can be opened in the student's email application. Otherwise, the text can be copied.

The application also supports manually managed approval-request states:

- Draft
- Awaiting Review
- Approved
- Changes Requested
- Rejected

These states are stored locally and are not connected to an official AUEB approval system. A manually selected status does not prove that the university has approved a request.

---

## 2. Technologies

The application uses:

- React
- Vite
- JavaScript
- CSS
- JSON and CSV academic datasets
- Browser local storage
- Automated JavaScript tests
- ESLint
- Git and GitHub for version control

The application is designed to run locally in a modern web browser.

---

## 3. Installation and local development

### Prerequisites

Install Node.js and npm.

### Clone the repository

```bash
git clone https://github.com/AGM-404/erasmusmatch-aueb.git
```

Enter the project directory:

```bash
cd erasmusmatch-aueb
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local address displayed by Vite in your browser.

The default Vite address is usually:

```text
http://localhost:5173/
```

A different port may be used if that port is already occupied.

**Note:** The GitHub repository is private. Cloning requires an authorized GitHub account with repository access.

### Windows PowerShell

If PowerShell blocks the npm script because of execution-policy restrictions, use:

```powershell
npm.cmd install
npm.cmd run dev
```

This does not require changing the system's PowerShell execution policy.

---

## 4. Testing and validation

Run the automated tests:

```bash
npm test
```

Run ESLint:

```bash
npm run lint
```

Build the production application:

```bash
npm run build
```

### Latest local validation

**Validation date: 5 November 2026**

- 73 automated tests passed.
- ESLint passed.
- Vite production build completed successfully.

The build reports an existing non-blocking warning about JavaScript chunk size.

The automated tests cover functionality including course selection, personalized recommendations, preliminary match coverage, academic matching safeguards, featured partners, ECTS validation, course data handling, and provisional Learning Agreement planning.

Passing these tests confirms that the tested application behavior works as expected. It does not constitute official academic verification of course equivalencies.

---

## 5. Academic datasets and verification

### AUEB course catalog

The application includes 94 AUEB Marketing & Communication course listings.

The primary bundled course dataset is:

`src/data/auebCourseCatalog.json`

The application preserves available official course identifiers, semester information, categories, descriptions, learning outcomes, source references, and explicit availability notices.

Missing academic information remains unverified.

### Erasmus partnership data

The source partnership data is stored under:

`ErasmusMatch_Copilot_Data/`

The application preserves the 46 individual partnership records and uses the configured featured-partner list to display six universities.

The featured-partner configuration is maintained in:

`src/data/featuredPartners.js`

### Host-university course data

The bundled host-course dataset contains **139 records** across four featured universities:

| University | Imported host courses | Current-verified listings |
|---|---:|---:|
| Ghent University | 33 | 28 |
| Comenius University in Bratislava | 51 | 15 |
| Matej Bel University | 51 | 0 |
| Sofia University | 4 | 0 |
| WU Vienna | Not yet imported | — |
| University of Latvia | Not yet imported | — |
| **Total** | **139** | **43** |

The remaining 96 records are not marked current-verified.

The `current_verified` label refers to the application's host-course record verification requirements. It does **not** mean that AUEB has approved the course as equivalent to an AUEB course.

Host-course listings may include academic year, semester, course code, title, ECTS, teaching language, study level, eligibility, source links, last-checked date, and verification status.

The supported statuses include:

- `current_verified`
- `historical`
- `unverified_candidate`

A partial collection of verified listings does not establish that a university's complete course catalog has been verified.

### Data imports

The application supports validated JSON and CSV course-data imports, as well as a configured JSON backend/API endpoint through:

`VITE_COURSE_DATA_API_URL`

The application does not automatically scrape university websites.

Imported data is subject to validation and provenance checks. Imported records may persist in browser local storage.

Providing a source URL or passing schema validation does not independently prove that a course is officially offered, accessible to an exchange student, or approved for AUEB recognition.

---

## 6. Project structure

```text
erasmusmatch-aueb/
├── public/
├── src/
│   ├── assets/
│   ├── data/
│   │   ├── auebCourseCatalog.json
│   │   ├── academicRules.js
│   │   ├── courseData.js
│   │   ├── featuredCourseCandidates.json
│   │   └── featuredPartners.js
│   ├── utils/
│   │   ├── recommendationEngine.js
│   │   ├── academicMatching.js
│   │   ├── ectsValidator.js
│   │   ├── auebCourseCatalog.js
│   │   └── approvalRequest.js
│   ├── App.jsx
│   └── App.css
├── tests/
├── ErasmusMatch_Copilot_Data/
├── DATA_IMPORT_NOTES.md
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

This structure highlights the main application components and academic datasets rather than every project file.

---

## 7. Data storage and privacy

Student course selections and certain planning records are stored in the browser's local storage.

Other Profile information may remain within the current browser session.

The application is not connected to an official AUEB student information system and does not independently verify student enrollment, course completion, Erasmus eligibility, or academic approval.

Users should avoid entering sensitive personal information when demonstrating the prototype.

---

## 8. Limitations and future improvements

ErasmusMatch is a working recommendation prototype with the following limitations:

- Host-course catalog coverage is incomplete across the featured universities.
- WU Vienna and the University of Latvia do not yet have imported host-course catalogs in the bundled application data.
- Some host-course records lack current syllabi, descriptions, learning outcomes, or verified teaching-language information.
- Preliminary suggestions may be available even when strict Academic Match scoring is not possible.
- Potential Match Coverage measures discovery coverage, not academic equivalency confidence.
- Academic Interest Alignment may be unavailable when verified preference or subject information is insufficient.
- Course availability, exchange access, eligibility, and recognition require confirmation from official sources.
- Browser-local approval statuses are not official university decisions.
- The application does not automatically submit Learning Agreements or coordinator requests.

Potential future improvements include broader verified course coverage, additional official syllabus evidence, more complete academic-interest information, improved course comparison, and integration with authorized institutional approval workflows.

---

## 9. Academic responsibility

**ErasmusMatch provides suggestions, not official equivalency decisions.**

A potential host-course match must not be interpreted as confirmation that:

- The course will be offered during the student's Erasmus semester.
- The student is eligible to enroll.
- The host university will grant access.
- The host ECTS will be recognized by AUEB.
- The proposed AUEB course equivalency has been approved.
- A Learning Agreement has received official authorization.

All final decisions require verification against current university information and confirmation through the appropriate academic approval procedures.

---

## 10. Project purpose

ErasmusMatch AUEB demonstrates how a student-centered web application can support Erasmus academic planning by combining structured university data, personalized course selection, preliminary course suggestions, transparent evidence requirements, and provisional Learning Agreement preparation.

Its main contribution is the separation of **potential academic opportunities** from **verified academic recommendations and official recognition decisions**, allowing students to explore options without presenting uncertain information as confirmed.
