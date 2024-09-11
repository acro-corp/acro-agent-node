/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

import { Hook as RequireHook } from "require-in-the-middle";
import { Hook as ImportHook } from "import-in-the-middle";
import { join } from "path";
import { WritableOptions } from "stream";

import { Engine } from "@acro-sdk/common-store";

import { getImportPaths, getPlugin } from "./plugins";
import { readFileSync } from "fs";
import { LogLevel } from "./logger";
import { Action } from "./action";
import { ActionStream } from "./stream";
import { getUrl } from "./url";
import { ContextManager } from "./context";

interface TrackOptions {
  actions?: Record<
    string,
    {
      methods?: string[]; // defaults to ["POST", "PATCH", "PUT", "DELETE"]
    }
  >;
  request?: Record<string, boolean>;
}

export type Logger = Record<
  "off" | "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "all",
  Function
>;

class AcroAgent {
  _applicationId: string = "";
  _secret: string = "";
  _app: string = "";
  _environment: string | undefined = process.env.NODE_ENV || "production";
  _url: string | undefined;
  _track: TrackOptions = {};
  _frameworks: Record<string, any> = {};
  _logger: Function | null =
    typeof console !== "undefined" ? console.log : null;
  _logLevel: LogLevel = LogLevel.warn;
  _hooksStarted: boolean = false;
  _requireHook: RequireHook | null = null;
  _importHook: ImportHook | null = null;
  _frameworkName: string | null = null;
  _frameworkVersion: string | null = null;
  _streamOptions: WritableOptions | null = null;
  _actionStream: ActionStream;
  _companyId: string = "";
  _store: Engine<any> | null = null;

  // async context
  context: ContextManager | null = null;

  // logger helper function
  logger: Logger;

  constructor(options: {
    applicationId: string;
    secret: string;
    app?: string;
    environment?: string;
    url?: string;
    logger?: Function;
    logLevel?: LogLevel;
    track?: TrackOptions;
    frameworks?: Record<string, any>;
    streamOptions?: WritableOptions;
    store?: Engine<any> | null;
    companyId?: string;
  }) {
    this._applicationId = options?.applicationId;
    this._secret = options?.secret;

    if (options?.app) {
      this._app = options?.app;
    } else {
      // try to grab from cwd
      try {
        const name = JSON.parse(
          readFileSync(join(process.cwd(), "package.json"), "utf-8")
        )?.name;

        if (name) {
          this._app = name;
        }
      } catch {}
    }

    if (options?.environment) {
      this._environment = options.environment;
    }

    if (options?.url) {
      this._url = options.url;
    } else {
      this._url = getUrl(this._environment, this._applicationId);
    }

    if (options?.logLevel) {
      this._logLevel = options?.logLevel;
    }

    if (options?.logger) {
      this._logger = options?.logger;
    }

    if (options?.frameworks) {
      this._frameworks = options.frameworks;
    }

    if (options?.streamOptions) {
      this._streamOptions = options.streamOptions;
    }

    this.logger = {
      off: this.log.bind(this, LogLevel.off),
      fatal: this.log.bind(this, LogLevel.fatal),
      error: this.log.bind(this, LogLevel.error),
      warn: this.log.bind(this, LogLevel.warn),
      info: this.log.bind(this, LogLevel.info),
      debug: this.log.bind(this, LogLevel.debug),
      trace: this.log.bind(this, LogLevel.trace),
      all: this.log.bind(this, LogLevel.all),
    };

    // direct integration with store, if passed in
    if (options.store) {
      this._store = options.store;

      // only read companyId if you're passing in your own store
      // otherwise it's derived from applicationId
      if (options.companyId) {
        this._companyId = options.companyId;
      }
    }

    // initialize write stream
    this._actionStream = new ActionStream(
      {
        applicationId: this._applicationId,
        secret: this._secret,
        url: this._url,
        logger: this.logger,
        store: this._store,
        companyId: this._companyId,
      },
      (this._streamOptions || {
        highWaterMark: 10,
        objectMode: true,
      }) as WritableOptions
    );

    // initialize what to track w/ defaults
    this._track = {
      ...{
        ...(options?.track || {}),
        actions: {
          ...(options?.track?.actions || {}),
          HTTP: {
            ...(options?.track?.actions?.HTTP || {}),
            methods: options?.track?.actions?.HTTP?.methods || [
              "POST",
              "PATCH",
              "PUT",
              "DELETE",
            ],
          },
        },
      },
    };

    this.context = new ContextManager();
    this.context.enable();

    this._restartHooks();
  }

  log(level: LogLevel, message?: string, ...args: any) {
    if (
      level <= this._logLevel &&
      this._logger &&
      typeof this._logger === "function"
    ) {
      this._logger.apply(this, [
        `[${LogLevel[level]}] [acro-agent-node] ${message || ""}`,
        ...args,
      ]);
    }
  }

  setFramework(name: string | null, version: string | null) {
    this._frameworkName = name;
    this._frameworkVersion = version;
  }

  setTrackDefaults(defaults: any) {
    this._track = {
      ...defaults,
      ...this._track,
    };
  }

  getFrameworkOptions(framework: string) {
    return this._frameworks?.[framework];
  }

  shouldTrackAction(action: any) {
    // if not included in methods to track
    if (
      this._track?.actions?.[action?.action?.type]?.methods &&
      !this._track?.actions?.[action?.action?.type]?.methods?.includes(
        action?.action?.verb
      )
    ) {
      return false;
    }

    return true;
  }

  createAction(action: Action): Action {
    const { request, ...rest } = action || {};

    // filter out request params that we don't want
    Object.keys(request || {}).forEach((key) => {
      if (request?.[key] && this._track?.request?.[key] === false) {
        delete request[key];
      }
    });

    return {
      ...rest,
      request: {
        ...request,
      },
      timestamp: action.timestamp || new Date().toISOString(),
      clientId: this._applicationId,
      app: this._app,
      environment: this._environment,
      framework: {
        name: this._frameworkName || undefined,
        version: this._frameworkVersion || undefined,
      },
    };
  }

  trackAction(action: Action) {
    this.logger?.debug(`trackAction: ${JSON.stringify(action)}`);

    if (!this._actionStream) {
      this.logger?.error(`trackAction object not instantiated`);
    } else {
      this._actionStream.write(action);
    }
  }

  _createHook<T>(
    hookType: string,
    exports: T,
    name: string,
    basedir: string | undefined | void
  ) {
    let version: string = "";

    if (basedir) {
      try {
        version = JSON.parse(
          readFileSync(join(basedir, "package.json"), "utf-8")
        )?.version as string;
      } catch (err) {
        // do nothing
      }
    }

    this.logger?.debug(
      `_createHook: Creating ${hookType}: ${name}@${version} from ${basedir}`
    );

    try {
      const plugin = getPlugin(name);

      if (plugin) {
        return plugin<typeof exports>(this, exports, version);
      }
    } catch (err: any) {
      this.logger?.error(
        `_createHook: Error loading ${hookType}: ${err.name}, ${err.message}, ${err.stack}`
      );
    }

    return exports;
  }

  _restartHooks() {
    if (this._requireHook) {
      this._requireHook.unhook();
    }

    if (this._importHook) {
      this._importHook.unhook();
    }

    this._requireHook = new RequireHook(
      getImportPaths(),
      { internals: true },
      (exports, name, basedir) => {
        return this._createHook<typeof exports>(
          "RequireHook",
          exports,
          name,
          basedir
        );
      }
    );

    this._importHook = new ImportHook(
      getImportPaths(),
      { internals: true },
      (exports, name, basedir) => {
        return this._createHook<typeof exports>(
          "ImportHook",
          exports,
          name,
          basedir
        );
      }
    );
  }

  destroy() {
    if (this._requireHook) {
      this._requireHook.unhook();
      this._requireHook = null;
    }

    if (this._importHook) {
      this._importHook.unhook();
      this._importHook = null;
    }
  }
}

export { AcroAgent };
