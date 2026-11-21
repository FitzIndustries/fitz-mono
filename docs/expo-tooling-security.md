# Expo tooling security review (FITZ-21)

Reviewed on 2026-11-21 after updating the application to Expo `58.0.26` and
running Expo's compatibility installer. The compatible package versions remain
selected by Expo rather than by unrelated major-version overrides.

## Remediation

The SDK update selected the current SDK 58 patch releases for Expo, Expo Dev
Client, Expo Router, Expo SQLite, and Expo Web Browser. Narrow pnpm overrides
then backport patched releases within the versions already required by the Expo,
React Native, and ESLint dependency graphs:

- `ws` 7.5.10 -> 7.5.11
- `picomatch` 2.3.1 -> 2.3.2
- `brace-expansion` 1.1.11 -> 1.1.21
- `@humanfs/node` 0.16.7 -> 0.16.8
- `mysql2` 3.11.3 -> 3.23.1 when that optional Better Auth dependency is
  present

The overrides include the vulnerable source version in each selector. They do
not collapse different dependency majors onto one global version.

The current Expo graph also resolves `node-forge` 1.4.3, PostCSS 8.5.32,
`xml2js` 0.6.0, and `sax` 1.4.1 without an npm audit advisory. `undici` is not
present in the Expo workspace dependency graph. No critical or high advisory
remains on a path rooted at `apps__expo`.

## Remaining advisory

`pnpm audit` reports one moderate advisory in the Expo graph:

- `minimatch` 10.2.6 through `expo > @expo/fingerprint` is affected by
  GHSA-3ppc-4f35-3m26 (globparts amplification). The patched release is
  minimatch 11.0.1, but `@expo/fingerprint` 0.21.10 currently declares
  `^10.2.6`. Forcing minimatch 11 would cross the upstream compatibility range
  and violate this ticket's compatibility rule.

This path is build-time Expo fingerprint tooling, not application runtime code.
The application does not expose its glob patterns to remote or customer input;
the CLI runs against trusted repository files. Until Expo publishes a compatible
fingerprint package, do not run Expo tooling against untrusted projects or
attacker-controlled fingerprint inputs. Remove this mitigation when Expo moves
to patched minimatch 11 or backports the fix to its supported range.

## Verification

Run from the repository root with the pinned Node and pnpm versions:

```sh
pnpm audit --json
pnpm --filter @fitzindustries/expo exec expo install --check
cd apps/expo && pnpm dlx expo-doctor@1.21.8
pnpm --filter @fitzindustries/expo lint
pnpm --filter @fitzindustries/expo typecheck
pnpm --filter @fitzindustries/expo format
```

When evaluating the audit JSON, filter `advisories[*].findings[*].paths` to
paths beginning with `apps__expo>`. The repository contains other workspaces
whose unrelated advisories are outside FITZ-21.
