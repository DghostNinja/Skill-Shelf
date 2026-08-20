# Known False-Positive Patterns

These recur constantly in Dart AOT static analysis and get flagged as vulnerabilities by less careful passes (including, sometimes, other automated tools or models run over the same artifacts). Checking for these explicitly — and saying so in the report when ruled out — is what separates a credible assessment from an alarmist keyword-grep dump.

## Long hex strings that look like secret keys

Cryptography libraries (PointyCastle and similar) embed standard, **publicly known** elliptic-curve domain parameters — e.g. NIST P-256's prime/order, or secp256k1's generator point — as constants. These are long, high-entropy-looking hex blobs that pattern-match "hardcoded key" on sight, but they're identical across every app using the library; they're published mathematical constants, not secrets. Compare: a real hardcoded key is unique to *this* app; a curve parameter is the same in every app, in every open-source implementation, and in the relevant standards document. If a suspicious hex blob's length and structure matches a known curve parameter (search for the leading bytes), it's very likely this, not a finding.

## Legacy crypto algorithm names (MD5, SHA-1, DES, RC4, ECB)

Crypto libraries commonly ship an internal algorithm-name **registry/factory table** — a lookup structure mapping string names to implementations, covering every algorithm the library supports, including deprecated ones, regardless of whether the app uses them. Finding the string `"MD5"` or `"RC4"` in the pool dump proves the library *can* do MD5/RC4, not that the app *does*. Before flagging this as a real weakness, look for an actual app-code call site (not just the library's own internal registration code) that instantiates and uses the weak algorithm for something security-relevant. Absent that, this is informational at most: "present, no evidence of use — worth a deliberate check during a source-level review."

## `badCertificate`-looking strings that aren't cert-bypass code

Some HTTP client libraries (e.g. Dio) have an exception-type enum with a member literally named something like `badCertificate` — this is metadata for error handling, not a callback that accepts bad certificates. Don't flag a TLS bypass based on this string alone; look for an actual `HttpOverrides` subclass, `badCertificateCallback` assignment, or equivalent that changes real certificate-validation behavior.

## WebView-looking flags that belong to a different plugin

Strings like `enableJavaScript`/`enableDomStorage`/`allowFileAccess` can belong to an in-app-browser plugin (e.g. `url_launcher`'s in-app view) rather than the app's own embedded `WebView` widget. Confirm which class/file the flag actually lives in before attributing it to the app's own WebView configuration.

## Firebase config values

`apiKey`, `appId`, `projectId`, etc. as *string literals in JSON schema field names* (used for parsing a config object) are not the same as the *actual embedded values*. Even when real values are found, Firebase API keys are not meant to be secret — they're protected by Firebase's own security rules, not by being hidden — so even a genuine hit here is typically low severity, not a hardcoded-secret finding on par with an API bearer token or private key.

## Flavor/environment-specific behavior that's expected for the build under analysis

Staging URLs, a vendor's proof-of-concept/test endpoint, an `HttpOverrides` subclass named for a non-production flavor, or mock/test service implementations are **all normal and correct** if — and only if — the build actually being analyzed is that flavor. This is the single most common source of overstated severity in this kind of analysis. Always confirm which flavor/environment the binary resolves to (a static `appFlavor`-style field, a `flavors.dart`-equivalent switch, or a live network capture's `Host` header) before treating flavor-specific content as a vulnerability. The correct framing when you can't yet confirm the build is "expected for this build, needs confirmation this doesn't also appear in production" — not "confirmed vulnerability."

## "Fake"/mock service classes present in the release binary

Presence in the compiled snapshot only proves the code wasn't tree-shaken out — it does not prove the mock implementation is ever *selected* at runtime. Before flagging this as an authentication-bypass or config-tampering risk, find and read the actual dependency-injection/service-locator registration code to see what environment-string condition, if any, gates the fake implementation, and what value the app's actual entrypoint sets that environment string to. This can go either way: sometimes it's a real, wired-open bypass; sometimes (as is common with well-built apps using frameworks like Stacked) it's cleanly gated and unreachable in any build that identifies as `"prod"`/`"test"`. Don't assume either outcome — trace it.
