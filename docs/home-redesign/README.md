# Home, Courses and You — 2 October 2026

George's two new Brilliant screenshots govern this round. The primary tabs are Home, Courses and
You. Review and Settings remain real secondary actions. There are no leaderboards, premium
controls or bottom chat panel on Home.

Home now centres the chosen course: original cover artwork, actual module, completed-lesson
progress, two or three upcoming pedestal stops, and one Start or Resume action. Choosing a course
is saved in the URL. The selected icon stays visible after keyboard selection, reload and viewport
changes. The Home resume action opens the saved active stage; the player restores its saved
question position. A completed lesson advances to the next unfinished authored lesson in that
course. When every lesson is finished, the primary action becomes View course and opens the
roadmap. Default timestamps supplied for an untouched journey do not make it say Resume.

The side panel uses the existing daily goal, recorded streak and week. Due recall cards open the
actual review queue. A small selection of unstarted production courses replaces the duplicated
full catalogue; the complete illustrated learning paths remain on Courses.

You opens at `/you`. Old `/progress` links redirect with their query and fragment preserved.
The page shows a weekly summary, level/streak, All time / Week / Month / Year filters, response and
completion totals, a keyboard-readable activity chart, course progress and earned milestones.
Independent and assisted concept evidence remains available in an expandable section.

Statistics are aggregate-only reads of saved learning events. Days use the saved time zone.
The week starts Monday; month and year are calendar periods; all-time history is not truncated
to the older seventy-day calendar. A question counts once per local day, using its latest checked
result. Saved corrections therefore affect accuracy, as explained by the visible information
control. Recall ratings are counted separately. Empty accounts show no invented accuracy.
A recorded transfer challenge counts as a practice day; visits and reward-only days do not.
No answers, private question identifiers or marking authority are returned by the stats endpoint.

The original course artwork and reviewed SVG pedestal are reused. Responsive captures were
inspected at 1440×900, 1024×768 and 390×844 against the supplied screenshots. Start/Resume fits
in the first screen at all three sizes, above phone navigation. The three phone tabs keep their text labels. Existing reduced-motion
preferences remain in force.

Release verification passes `pnpm check`: lint, strict typechecking, 1,295 package tests and
fourteen stored bundle validations. Production build/CSP and the isolated smoke check pass;
smoke delivers all 152 active lessons. Doctor reports a usable environment. Chromium uses the
existing unpacked libraries beneath `/tmp/discere-browser-libs`.

The complete 113-scenario browser run passed 112 scenarios and exposed one obsolete Progress
summary-text assertion. After updating that assertion and the responsive repairs, all seventeen
affected Home, journey and reward/sound scenarios passed together. All four Home/You scenarios
passed again after the completed-course action refinement. The entire suite was not repeated
after that refinement. Component tests also verify that a finished course opens its roadmap.

SQLite's online backup created
`data/backups/discere-before-home-redesign-release-20261002T044132Z.sqlite`.
Source and backup integrity are `ok`. After the managed preview restart and all live captures,
every previous row fingerprint and table count, study summary and preference was identical.
No rows were added or removed. Owner attempts and course-check sessions remain zero; stored
review cards remain 322. Browser and smoke checks use disposable databases.

Six read-only captures of the live Home and You pages at 1440×900, 1024×768 and 390×844 recorded
no horizontal overflow, page errors, API failures or attempted writes. Start/Resume fits within
the first screen at each size, above phone navigation. Saved course selection and question
resumption, keyboard chart navigation and date filters were exercised in the isolated browser tests.

- [Live Home on desktop](screens/live-home-1440.png) and [phone](screens/live-home-390.png)
- [Live Home on tablet](screens/live-home-1024.png)
- [Live You on desktop](screens/live-you-1440.png), [tablet](screens/live-you-1024.png) and [phone](screens/live-you-390.png)

The preview serves [Home](http://127.0.0.1:4318/), [Courses](http://127.0.0.1:4318/courses) and
[You](http://127.0.0.1:4318/you). [Verification metadata](verification.json) retains the counts and live-capture results.
The wider goal remains active: twelve foundation courses do not complete all requested topics
and technical curricula.
