# acro-agent-node

Install the Acro Agent into your application or service to begin logging actions to Acro.

## Installation

```
npm install @acro-sdk/agent --save
```

### Express.js

Put this before everything else in your main application file:

```typescript {lineNos=inline tabWidth=2}
import { AcroAgent } from "@acro-sdk/agent";

new AcroAgent({
  applicationId: "00000000-0000-0000-0000-000000000000",
  secret: "...",
});

const app = express();
...
```

Please see [https://learn.acro.so/docs/libraries/@acro-sdk/agent/](https://learn.acro.so/docs/libraries/@acro-sdk/agent/) for the latest docs!
