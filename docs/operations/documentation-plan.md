<!-- doc-id: documentation-plan -->
# Documentation management

[한국어](documentation-plan.ko.md)

This document defines the repository's documentation structure and update procedure. It is an active procedure. Implementation state is maintained in [features](../features.md).

<a id="ownership"></a>
## Canonical documents

Each topic has one English canonical document and one `.ko.md` translation. [config/documents.json](../../config/documents.json) selects the Markdown documents of the repository, common documents and package documents alike, and every document carries a `doc-id` marker that names its topic once in the repository. Other documents link to the canonical topic instead of repeating its rules.

| Location | Content |
| --- | --- |
| `README.md` | Project overview, minimum start procedure, document links |
| `docs/spec/` | Approved behavior, structures, API contracts, acceptance criteria |
| `docs/features.md` | Implementation, verification evidence, distribution status |
| `docs/operations/` | Current installation, execution, verification, publication procedures |
| `CHANGELOG.md` | Actual changes, reasons, verification |
| `docs/plans/` | Proposals pending approval |
| `benchmarks/` | Reproducible performance comparisons and benchmark inputs |
| `AGENTS.md` | Development procedure and required checks |
| Outside Git | Personal preferences, conversation context, local authentication and backup details |

Specifications describe contracts. Feature records describe implemented behavior. Distribution records describe observed publication. These states are independent.

<a id="updates"></a>
## Update procedure

1. Read the applicable specification before changing code.
2. If the direction changes, update the specification first and mark unfinished implementation explicitly.
3. Include behavior changes, affected documentation, feature state, and changelog entries in the same change.
4. Update English and Korean together. Compare their information, commands, links, and status values.
5. Run the applicable checks against the changed files. Do not use results for different source files as current evidence.
6. Record publication only after checking the remote source, release, or package result.

After a proposal is approved, update the specification and remove the proposal document. Correct existing rules when they conflict with the approved contract or observed behavior.

<a id="checks"></a>
## Documentation checks

`make docs-check` (check-documents of `@polyspec/kit`) checks document pairs, local link targets and anchors, matching section identifiers and code blocks, Korean translation revision hashes, the checklist, the values of the feature table, and the changelog sections. It also rejects local home-directory paths in documents. `make evidence-check` (`scripts/check-evidence.mts`) checks the feature rows against the evidence they name and rejects local home-directory paths in reports. Neither compares verification records with the current sources, so a documentation review does not require a full verification run.

The Korean file's `source-sha256` comment records the English revision reviewed for that translation. Update it only after reviewing the translation. Matching hashes do not prove translation accuracy. The checker does not verify external website availability or prose meaning; those require review against code and test results.

`make check` runs the verifier tests, every registered JSON implementation, and the evidence check with `--records` (`make verify-all`), which also rejects an aggregate or PIE record of the checkout (`var/records`) whose source hashes differ from the current sources. [PIE verification](validation.md#pie) records a separate build and shared case result. Hosted CI runs these checks: `.github/workflows/ci.yml` runs the full suite on every pushed commit of `main` and every pull request ([hosted CI](validation.md#ci)).

<a id="records"></a>
## Technical records

Documents describe current behavior. Changelogs describe actual changes and verification. Commit messages and code comments identify the subject, operation, object, and result directly. State a necessary cause in one sentence. Use the same information in English and Korean. Do not include figurative language, personification, conversation history, or personal judgments.

Preserve correct code. Decide whether to revert from correctness and harmful effects, not merely from a difference in intent. Record the actual reason for a change. Separate unrelated changes into separate commits when possible.

External project comparisons belong only in an explicitly requested comparison report. Dependencies, executable verification inputs, and normative format requirements can be identified where required to reproduce or understand current behavior.
