---
name: API Security Testing
slug: api-security-testing
description: Practical methodology for finding bugs in web APIs — docs discovery, parameter fuzzing, mass assignment, and server-side parameter pollution.
category: Security
version: 1.0.0
date: 2026-08-20
tags: [api, appsec, testing, rest, owasp]
related: [web-pentesting, web-exploitation-reference, secure-code-review]
---
# API Security Testing

A practical methodology for testing the security of web APIs — built from real API pentest
notes. Use it whenever an API assessment task arrives. **Authorized testing only.**

---

## 1. Start With the Documentation

The API surface is usually exposed before the functionality.

- Hunt for API docs: `/swagger`, `/swagger-ui.html`, `/v2/api-docs`, `/api-docs`, `/openapi.json`,
  `/redoc`, `/swagger.json`, `/docs`, Postman collections.
- If the docs are protected but the endpoints are public, test the endpoints directly from
  HTTP history (Proxy history) instead.
- Read every endpoint, parameter, and schema in the docs — they define the attack surface.
- Secure your own docs: keep them up to date for legitimate testers, and gate them if they
  must stay private.

---

## 2. Enumerate HTTP Methods and Media Types

APIs behave differently per method and content type.

- **GET** — retrieves a resource.
- **PATCH** — applies partial changes to a resource (a common mass-assignment entry point).
- **OPTIONS** — reveals which methods are allowed on a resource.
- Change the `Content-Type` header (e.g. JSON vs XML) — an API may be safe with JSON but
  vulnerable to injection when it parses XML.
- Intercept a request, capture the endpoint from HTTP history, then flip `GET` to `PATCH`
  and add a JSON body:

```json
Content-Type: application/json

{
  "price": 0
}
```

- Apply an allowlist of permitted HTTP methods and validate content types server-side.

---

## 3. Mass Assignment (Auto-Binding)

Frameworks that auto-bind request parameters to internal object fields can expose hidden
parameters.

- Fuzz boolean fields — flip any `TRUE`/`FALSE` value you see in the request.
- Read through the JSON carefully and compare request vs response bodies to spot fields
  you were not meant to set (e.g. `isAdmin`, `role`, `balance`).
- Test if the API accepts extra fields that map to internal object properties.

---

## 4. Server-Side Parameter Pollution

Occurs when user input is embedded in a server-side request to an internal API without
proper encoding. Test by placing query syntax characters (`#`, `&`, `=`) in your input and
watching how the app responds.

### Query-string tests

- **Truncating:** URL-encode `#` to try to cut off the rest of the server-side request.
- **Injecting a second parameter:** URL-encode `&` to append another parameter.
- Behavior differs per backend, which leaks implementation details:
  - PHP parses the **last** parameter only.
  - ASP.NET combines both parameters (may surface as an "Invalid username" error).
  - Node.js / Express parses the **first** parameter only.

```json
GET /userSearch?name=peter%26foo=xyz&back=/home
```

Test with `<&x=y#>` and make sure the payload truncates the server-side request.

### Password-reset flow (practical example)

1. Request a password reset for a target user (e.g. `administrator`).
2. Probe with `<&x=y#>` — bruteforce the parameter name (`id`, `email`, `username`,
   `text`, ...) and find the value that returns a `200 OK`.
3. Read the static reset script (e.g. `forget-password.js`) to see what the reset field is
   named (e.g. `reset_token`).
4. Send a reset request with the discovered field to obtain a reset token for the target:

```json
username=administrator%23field=reset_token%23>
```

5. Use the token against the reset endpoint to reset the target account's password.

---

## 5. REST-Path Parameter Pollution

A RESTful API may place parameter names and values in the URL path instead of the query
string. When you find this pattern, apply the same pollution logic to the path segments —
inject delimiters and extra parameters into the path and observe the response.

---

## 6. Auth, Rate Limiting and Errors

- Test every endpoint with and without credentials; check for broken object-level
  authorization (change an ID and see if you can read/write another user's data).
- Test rate limiting on login, password reset, and OTP endpoints.
- Use **generic error messages** — detailed errors leak information useful to an attacker.
- Apply protections to **all versions** of the API, not just the current production one.

---

## 7. Prevention Checklist

- Secure API documentation unless it must be public.
- Keep docs current so testers see the real attack surface.
- Allowlist permitted HTTP methods.
- Validate the expected content type per request/response.
- Generic error messages everywhere.
- Fix and test every API version, not just the latest.

---

## 8. Reporting Notes

Frame findings as **root cause -> impact -> exploit -> fix**. Include the exact request
(with `Content-Type` header) that reproduces the bug so the fix can be verified.