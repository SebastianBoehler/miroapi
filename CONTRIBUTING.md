# Contributing

Thanks for considering a contribution to `miroapi`.

## Good First Contributions

- Refresh brittle integrations when upstream APIs or web flows change.
- Add narrow, well-documented wrappers around missing Miro endpoints.
- Improve module docs and examples so consumers understand expected credentials and side effects.
- Replace legacy patterns with smaller, testable helpers without changing public behavior unexpectedly.

## Before You Open A Pull Request

1. Open an issue first for larger changes, new integrations, or behavior changes.
2. Keep pull requests scoped. Small, reviewable changes are much easier to merge.
3. Preserve backwards compatibility when possible, or clearly document breaking changes.
4. Avoid committing credentials, cookies, tokens, or captured customer data.

## Development

```bash
npm ci
npm run validate
```

The current validation step is a lightweight smoke check that verifies package metadata and exported entry points. If you change public exports or add new top-level files, update `scripts/validate.js`.

## Style Expectations

- Prefer small modules over large files.
- Reuse helpers instead of duplicating request, cookie, or parsing logic.
- Add comments only when the code is otherwise hard to follow.
- Update the README when usage, exports, or support status changes.

## Pull Request Checklist

- The change has a clear reason and scope.
- New behavior is documented in the README or inline where needed.
- `npm run validate` passes locally.
- Sensitive values are not committed.

## Support Boundaries

This repository wraps a mix of official APIs and browser-driven flows. Some integrations may break when upstream products change authentication, request payloads, or internal endpoints. Contributions that improve observability and failure messages are especially useful.
