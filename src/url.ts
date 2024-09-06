/**
 * Copyright Acro Data Solutions, Inc. and other contributors where applicable.
 * Licensed under the BSD 2-Clause License; you may not use this file except in
 * compliance with the BSD 2-Clause License.
 */

export function getUrl(
  environment: string | undefined,
  applicationId: string
): string {
  switch (environment) {
    case "production":
    default:
      return `https://data.acro.so/${applicationId}/actions`;
  }
}
