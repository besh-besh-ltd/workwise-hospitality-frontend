# Page-level tests

Everything under `pages/` is a route: `next build` tries to collect page data
from every file there, so a `*.test.js` sitting next to the page it tests fails
the production build with `ReferenceError: expect is not defined`. Component,
hook, service and util tests live beside their source because those trees are
not routed — page tests cannot.

So page tests live here, mirroring the route path, and import the page through
the `@/` alias:

```js
import CreateRateContractPage from "@/pages/dashboard/buyer/rate-contracts/create";
```
