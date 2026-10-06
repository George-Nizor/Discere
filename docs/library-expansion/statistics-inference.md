# Statistics: distributions and inference

Started 2 October 2026. Status: authoring and implementation in progress; the live course still
contains its six published lessons. This extension continues the active full-curriculum goal.

## Source review

The complete returned text of the five child chapters under George's **The Power of Statistics**
note has been reviewed: Descriptive Statistics, Probability, Sampling, Confidence Intervals and
Hypotheses testing. [The review inventory](statistics-inference-source-review.json) records their
IDs, edit times and text lengths. The parent is `1f7ea4c04f4c821aaa1d017b47c14d4f`.

The connector did not report a truncation or unknown-block count in these responses. Embedded
figures and attached notebooks/files have not been reviewed. No attachment was downloaded or
executed. This record contains original review notes and metadata; it does not save the retrieved
bodies or temporary media links. The Foundations, Python and Insights sibling bodies remain unread.

The source outline guides scope. Discere's datasets, questions, diagrams and prose are original.
Mathematical claims and corrections are checked against primary references.

## Corrections required in the lessons

- A conditional probability is defined whenever its conditioning event has positive probability;
  it also applies to independent events. Dependence need not describe a causal influence.
- A probability sample has known positive selection probabilities. They need not all be equal.
  A random sample can still miss a subgroup; an incomplete frame and nonresponse require attention.
- Random selection and random assignment serve different purposes. Assignment supports a causal
  comparison under the experiment's assumptions; generalisation depends on how participants enter.
- The central limit theorem concerns the distribution of a standardised average under its
  assumptions. It does not make the underlying observations normal. The law of large numbers is
  the separate concentration claim. Sampling without replacement is dependent; a small sampling
  fraction can justify an approximation, rather than proving independence.
- Use sample variance with denominator n−1 when estimating population variance. State the
  quartile convention and handle ties; literal claims about exactly half the values being strictly
  above or below a median can fail with repeated values.
- A Normal population is an assumption to examine. Choosing 100 people does not guarantee a
  Normal distribution for their measurements. An outlier calls for investigation, not automatic removal.
- A t interval for an unknown population standard deviation remains valid under its assumptions
  beyond n=30. There is no exact switch to z at thirty observations. Small-sample proportion
  intervals exist; the source's claim that only means can have them is false.
- Frequentist confidence describes repeated use of a procedure under its assumptions. It does
  not state that 95% of individual observations lie in the interval or assign a posterior
  probability to the fixed parameter.
- A significance level bounds a false-rejection probability under the null model. It is not the
  probability that a rejection is wrong. A p-value conditions on the null model and test design;
  it is not the probability that the null is true or that chance caused the data.
- The source's proportion example with 0.73 versus 0.80 has a negative z statistic (−1.75).
  Doubling a one-sided probability applies to the appropriate symmetric continuous two-sided
  test, rather than every test. Choose the alternative and analysis before inspecting outcomes.
- Failure to reject does not establish no effect. Report effect size and uncertainty. Power
  depends on a specified alternative, sample size, noise and test rule.
- Observed group differences estimate an effect under design assumptions. Random assignment
  does not guarantee exact balance in a realised experiment.

## Planned teaching sequence

The first six published lessons, questions, recall cards and check items retain their IDs and
content. Twenty-two additions will extend the same roadmap:

| Lesson | Main visual or interaction |
| --- | --- |
| Read the middle half | Sorted observations, median-of-halves box and percentile ties |
| Estimate spread from a sample | Deviations and the n−1 divisor |
| Update a probability | Two-way frequency table and changed base rates |
| Average over possible outcomes | Discrete probability bars, uniform and Bernoulli cases |
| Count repeated successes | Binomial mass bars and a selected event |
| Count arrivals over time | Poisson rate and interval comparisons |
| Measure distance in standard deviations | Normal curve, z positions and interval area |
| Choose a sampling method | Existing population model with contrasted selection plans |
| A distribution of averages | Exact enumeration of small samples with replacement |
| Why larger samples vary less | Common-scale sampling curves and standard errors |
| An interval that moves | Finite reproducible sequence of simulated confidence intervals |
| Estimate a mean with known spread | Normal interval, confidence and sample-size comparisons |
| Allow for estimated spread | t intervals and degrees of freedom |
| Estimate a proportion | Wilson interval, including boundary-count examples |
| State a testable claim | Null target, sample estimate and signed test statistic |
| Read a tail probability | One-sided and two-sided test regions |
| Judge the size of an effect | Common units, interval width and a practical threshold |
| Recognise false alarms and missed effects | Repeated-test outcomes and a power comparison |
| Compare two independent groups | Given summaries and a Welch difference interval |
| Compare changes in the same units | Paired observations and differences |
| Design a fair experiment | Treatment assignment, blocks and confounding comparisons |
| Account for many tests | Multiple opportunities for false rejection and a family threshold |

Every added lesson needs four answered visual beats, two skills-check questions, two new recall
cards, and distinct placement, mixed and seven-day delayed questions. Numeric and open responses
remain part of the course. Values must be recomputed independently before publication.

## Primary references already checked

- [NIST: confidence limits for a mean](https://www.itl.nist.gov/div898/handbook/eda/section3/eda352.htm)
- [NIST: binomial distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366i.htm)
- [NIST: Poisson distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366j.htm)
- [NIST: Normal distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm)
- [NIST: Wilson and exact proportion intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)
- [ASA: p-value interpretation principles](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf)
- [Penn State: central limit theorem](https://online.stat.psu.edu/stat414/Lesson27)
- [Statistics Canada: probability sampling](https://www150.statcan.gc.ca/n1/edu/power-pouvoir/ch13/prob/5214899-eng.htm)

## Publication and verification

Use the existing validated authoring, exact-hash review and publication path. A baseline manifest
will verify that the six published lessons and every old assessment item remain unchanged.
The new models must have strict bounded schemas, independent numeric fixtures, accessible givens
and keyboard controls. Derived numerical readouts follow the existing server-granted feedback
state. Finite motion respects manual and system reduced-motion preferences.

Before release: narrow engine/schema/component checks, independent question/card/check audit,
all course beats at desktop/tablet/phone sizes, source and editorial review, package check,
production build/CSP and isolated smoke. Back up the owner database before publication/restart
and prove prior rows and preferences preserved afterwards. The Home/You release remains current
until these gates pass.

The complete Google programme, its attached practical notebooks, and the full statistics subject
remain broader than this extension. Regression, multivariate methods, causal inference, Bayesian
inference and independent analysis projects will need further source review and implementation.

## Visual implementation brief

Use the current dark learning canvas and the existing course artwork. Blue marks encode given
data; green marks encode revealed estimates or intervals; amber dashed marks distinguish an
interval that misses its target. Never rely on colour alone. A fixed axis, an explicit condition
or a paired line must explain what is being compared.

The new explorer compares two or three authored cases. Bayes tables can isolate an evidence
column; repeated-sampling diagrams reveal a finite, reproducible sequence; paired diagrams keep
unit correspondence visible. Each action has native keyboard controls and a text equivalent.
Computed probability labels, confidence endpoints, summary statistics and test decisions appear
only after submitted-answer feedback. Exploration does not create new attempts or rewards.

Plots use deterministic SVG geometry rather than generated pictures. All input values remain
visible in normal text or a table, with compact responsive plots below. Case changes and feedback
may animate once; system and app reduced-motion settings disable animation. No continuous loop
is needed to explain a sampling distribution.

## Scope change — 2 October 2026

George asked to wrap new material and verify the existing product. The 22-lesson plan above is
unpublished and no new lesson or course has been added. The bounded model, calculation and visual
scaffolding is retained as work in progress; its focused checks passed (40 numerical, 34 schema,
42 component checks). The current task is the existing-library and feature quality pass, recorded
in `../quality-pass/README.md`. Do not claim the extension is a published or complete curriculum.
