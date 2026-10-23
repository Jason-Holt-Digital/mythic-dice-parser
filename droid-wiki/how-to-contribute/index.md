# Contributing

Start with the [architecture](../overview/architecture.md), then choose the relevant [system](../systems/index.md) or [feature](../features/index.md). This is one Dart library, not an application workspace.

## Repository expectations

`CONTRIBUTING.md` asks contributors to read `CODE_OF_CONDUCT.md`. The latter defines community standards, reporting, and enforcement. Read it before participating.

`CONTRIBUTING.md` does not prescribe branch names, reviewer counts, or a pull-request template. Release automation has a separate commit convention in `.github/RELEASES.md`: `fix:` and `feat:` trigger releases; breaking changes use `!` or a `BREAKING CHANGE:` footer. Use that format in squash titles too. `chore:` alone does not trigger a release. See [Automation and publishing](../deployment.md).

The local workflow below is recommended practice, not an additional enforced policy.

## Pick up a change

1. Write down the failing notation, expected dice or metadata, and actual behavior. For randomness-related bugs, capture exact input faces.
2. Find the responsible layer using the [source map](../overview/architecture.md): grammar, AST operation, roller, result model, or push.
3. Add a narrow deterministic regression before broadening the implementation. See [Testing](testing.md).
4. Check [patterns and conventions](patterns-and-conventions.md), especially immutable results, public exports, and asynchronous errors.
5. Use the [development workflow](development-workflow.md) to validate the change.

For questions about historical code, see the [contact map](../maintainers.md). It is inferred from history, not a formal ownership policy.

## Suggested pull-request description

Explain the behavior change, a minimal notation example, compatibility implications, and checks actually run. Distinguish a grammar change from a scoring or push change. List checks you could not run and why. Link an issue if one exists; no issue-first requirement is documented here.

## Recommended definition of done

- A regression checks the affected dice and metadata, not only the total.
- Formatting and fatal-info analysis pass.
- Relevant tests pass locally, followed by VM and Chrome suites where available.
- Both examples run with assertions when behavior they exercise changes.
- Public behavior changes are reflected in appropriate examples, documentation, and `CHANGELOG.md`.
- No generated output, credentials, or unrelated dependency changes enter the diff.

These are recommendations aligned with the checked-in validation commands. They are not a claim about branch protection or required reviews. Automation and publishing are documented separately in [Automation and publishing](../deployment.md).

## Key source files

| Path | Why read it |
| --- | --- |
| `CONTRIBUTING.md` | Existing contribution instructions |
| `.github/RELEASES.md` | Release-triggering commits and squash titles |
| `CODE_OF_CONDUCT.md` | Community standards and enforcement |
| `analysis_options.yaml` | Actual analysis rules |
| `.github/workflows/dart.yml` | Executable validation sequence |
| `lib/mythic_dice_parser.dart` | Public API boundary |
