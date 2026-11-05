# Contributing

Thanks for considering a contribution to PackProof.

## Development

- Node.js 18 or newer is required.
- Run `npm test` and `npm run check` before opening a pull request.
- Keep the core validation logic in `src/core.js` browser-independent so it can be tested with Node's built-in test runner.
- Do not add an upload endpoint or send user artwork to a remote service without an explicit, documented opt-in design.
- Add or update tests for changes to validation, duplicate detection or report serialization.

## Pull requests

Describe the user problem, the behavior changed and how you verified it. Be clear about browser support and any known limitations.
