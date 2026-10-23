# Releases

This repository uses Release Please to manage the parser's version, changelog, and release tags. All parser releases come from this repository.

## What it manages

- One root component that uses the `dart` strategy.
- The baseline version is 8.3.0, the current `pubspec.yaml` version. No `v8.2.0` or `v8.3.0` tag exists, so the first release scans from `bootstrap-sha`.
- Tags use the form `vVERSION`.
- Release Please updates `pubspec.yaml`, `CHANGELOG.md`, and the manifest.
- This setup does not add an automatic GLPub publisher.

## Set up the token

The workflow needs an Actions secret named `RELEASE_PLEASE_TOKEN`. Without it, the workflow fails before the release action. It does not fall back to `GITHUB_TOKEN`, and it does not use Factory, Droid, an API key, or any AI service.

1. Create a fine-grained personal access token.
2. Set the resource owner to `Jason-Holt-Digital`.
3. Choose selected repository access, then select this repository.
4. Give it read and write access to Contents, Pull requests, and Issues.
5. If the organization requires approval for new tokens, get the token approved.
6. Save it as a repository Actions secret. You can also use an organization Actions secret that grants access to this repository.

Never print the token in logs or output. The workflow `permissions` block does not change what the token can do. Only the token's own permissions control that.

The credential preflight check only proves two things: the secret exists, and the token can read the repository. It does not prove the token can write.

## Run the workflow

- Push to `main`, or
- Open Actions, select Release Please, click Run workflow, and choose branch `main`.

## Write commits that trigger a release

- `fix:` and `feat:` commits trigger a release.
- To mark a breaking change, add `!` after the type or add a `BREAKING CHANGE:` footer.
- When you squash merge, use this same format in the squash title.
- `chore:` commits do not trigger a release on their own.

## First run

The first run may not open a release PR. When a release PR does open, compare its diff and changelog with the 8.3.0 baseline and with earlier tags. If an earlier tag matches, Release Please can scan from that tag instead of `bootstrap-sha`, so older commits may still show up in the notes.

## Verify a release

A green run with nothing to release does not fully prove the setup works. To prove it:

1. Merge a real `fix:` or `feat:` change into `main`.
2. Check that Release Please opens a release PR and that its checks pass.
3. Merge the release PR when you want to publish the release.
4. Check that the GitHub release and its `v` tag exist.

Do not make dummy changes or dummy releases to test the setup.

## Files

- [Workflow](workflows/release-please.yml)
- [Release Please config](../release-please-config.json)
- [Release manifest](../.release-please-manifest.json)
