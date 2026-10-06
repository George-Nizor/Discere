# Linear Algebra: Vectors and Maps

Updated: 2026-10-02. Status: published and running in the owner preview.

The course contains twenty lessons in five modules, eighty question-led visual beats, 120 lesson
questions, forty fresh recall cards and sixty independent course-check problems. It follows the
retrieved linear-algebra sequence in George's Mathematics (1) note. The broader mathematics and
technical-curriculum goal remains active.

## Source sequence

The full retrieved textual note is retained in
[the sanitised source snapshot](linear-algebra-source-snapshot.json). Its source page is
[Mathematics (1)](https://app.notion.com/p/3ebea4c04f4c8196bc01fe4799235753), last edited
2026-09-30T10:38:46.111Z. One unsupported bookmark block, embedded media and linked books were
not reviewed. The source note is a planning outline; mathematical facts were checked against
exact primary sections.

| Retrieved outline part | Implemented lessons |
| --- | --- |
| Scalars, vectors and matrices | Read a vector; Matrix shape and transpose |
| Vector addition and scalar multiplication | Add and scale vectors; Dot products and length; Orthogonal and unit vectors |
| Matrix multiplication, identity, inverse and transpose | Compose matrix maps; Identity and inverses; Matrix shape and transpose |
| Linear systems and Gaussian elimination | Solve by row reduction; One, none or many solutions |
| Spaces, basis and dimension | Spans and subspaces; Basis and dimension; Rank and null space |
| Eigenvectors and eigenvalues | Eigenvectors and eigenvalues; Diagonalise a map |
| Orthogonality and orthonormality | Project onto a direction; Fit with least squares; Build an orthonormal basis |
| Determinants, geometry and linear transformations | Determinants and volume; Linear transformations |
| Singular value decomposition | Singular value decomposition, including rectangular factor shapes |

Twenty exact sections of [Georgia Tech's Interactive Linear Algebra](https://textbooks.math.gatech.edu/ila/)
support vectors, systems, spaces, maps, determinants, eigenvectors and orthogonality. Its
[GNU Free Documentation License](https://textbooks.math.gatech.edu/ila/appendix-gfdl.html) is recorded.
MIT OpenCourseWare's [Singular Value Decomposition lecture](https://ocw.mit.edu/courses/18-06-linear-algebra-spring-2010/resources/lecture-29-singular-value-decomposition/)
supports the final lesson; its CC BY-NC-SA 4.0 licence is recorded. Both are reference-only.
Exact sections, editions, attribution, access dates and licences are in the reviewed bundle.
All lesson prose, problems, diagrams and SVG artwork are original Discere work.

## Learner flow

Every lesson starts with a question and given vectors or matrices. Example and Compare controls
change the given case. Before feedback, the visual conceals computed output, solution summaries,
row operations, fitted measurements and transformation/SVD playback controls.

A checked response reveals the explanation and calculated visual. Learners can inspect actual
elementary row operations, move from the identity map to the requested matrix, or step through
SVD factors. Visible unit input directions show the orthogonal factor's rotation even though
the circle retains its outline; product-map controls name A B. Blue marks identify given measurements and vectors. Calculated output uses green.
The reserved footer contains correction, Why and Continue. Long results scroll inside the pane;
first response fields fit above the footer at all three required viewports.

Four teaching questions lead into two practice questions and two different recall problems.
The course also provides twenty-problem placement, mixed and later-application checks.
Each check covers every taught lesson. Marking stays concealed until the complete set is saved.
The mixed check requires all lesson stages; later applications require a seven-day interval after
that check. Confidence, XP and independent/assisted evidence retain their separate server records.

## Verification

The exact published bundle SHA-256 is
`2955bb6a7fcd37eb373ca58a4145b0e5437688797933afc5b52fa4e2fb833fa8`.
The review accepts two writing warnings because the three elementary row operations and three
full-SVD factors are mathematically required.

[The independent numerical audit](linear-algebra-numeric-audit.json) recomputes all 195 numerical
keys using CPython 3.12.3 and NumPy 2.3.5 without importing Discere's math engine:
95 lesson/practice, forty recall and sixty course-check values. The maximum absolute difference
is 7.105427357601002e-15. All twenty-five choice keys and explanations were reviewed.

Contract and engine tests check malformed inputs, dimensions, elimination, rank/nullity, inverse
identities, projection orthogonality, least-squares residuals and SVD reconstruction. Degenerate,
reflected and small-scaled cases are included. The curriculum test binds every numerical key to
the audit and the exact publication hash, preserves authored questions/visuals/cards and checks
that complete problems have distinct given data.

Six focused browser scenarios pass against the published bundle after the final visual refinement. They open all twenty lessons
at 1440×900, 1024×768 and 390×844; exercise correction, earned feedback, fresh recall, saved
completion, all sixty check responses, keyboard controls, actual row operations and both motion
preferences. Databases and advancing test clocks are disposable.

[Responsive captures](screens/linear-algebra/) include roadmap, matrix, basis, transformation,
row reduction, least squares, SVD, correction, recall and assessment. Visual review enlarged scaled
chart labels and prevented scrolled content crossing the earned frame. The pane returns to its
question and visual when feedback appears.

## Remaining scope

This is introductory real linear algebra with two-dimensional vectors and matrices up to three
rows and columns. Rectangular SVD lessons explain full factor shapes and two singular values;
the geometric factor sequence is two-dimensional. The marking checks authored values and terms.
It does not assess arbitrary proofs, symbolic derivations or unrestricted matrix algorithms.

Larger dimensions, complex vector spaces, broader spectral theory, numerical conditioning,
general least-squares methods, learner-written derivations and applications remain required.
Editorial review is by the authoring agent under George's delegation. There is no independent
human subject review or documented learner trial. Finite examples and invariants do not prove
all-input numerical behaviour or learning effectiveness.

## Live release

The managed preview runs at [the course roadmap](http://127.0.0.1:4318/courses/linear-algebra-vectors-and-maps).
The catalogue has twelve active courses and 152 lessons. The complete 109-scenario browser suite
passed before the last isolated SVD refinement; the package gate and all six affected scenarios
passed afterwards. Production build/CSP, isolated smoke, Python readiness and doctor pass.

SQLite's online backup is `data/backups/discere-before-linear-algebra-release-20261002T031507Z.sqlite`.
Both backup and source integrity are `ok`. All prior row fingerprints, study summary and
preferences are preserved. Twenty unstarted concept rows were added (152 to 172). Opening the live interface initialised
forty unintroduced recall-card rows (282 to 322), with none entering the due queue.
There are no owner test attempts, course-check sessions or programming-project sessions/actions.
Six live read-only screenshots recorded no page errors or attempted mutations. All thirteen earlier
published bundles are unchanged byte for byte.
