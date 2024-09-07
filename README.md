# acro-agent-node

## Installation

### Express.js

Put this before everything else in your main application file:

```typescript
import { AcroAgent } from "@acro-sdk/agent";

new AcroAgent({
  applicationId: "00000000-0000-0000-0000-000000000000",
  secret: "...",
});

const app = express();
...
```

Many other options are available in this constructor. For example, to log all GET requests as well as POST, PATCH, PUT, and DELETE, and log all debug info to the console:

```typescript
import { AcroAgent, LogLevel } from "@acro-sdk/agent";

new AcroAgent({
  applicationId: "00000000-0000-0000-0000-000000000000",
  secret: "...",
  logLevel: LogLevel.debug,
  track: {
    actions: {
      HTTP: {
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      },
    },
  },
});

const app = express();
...
```