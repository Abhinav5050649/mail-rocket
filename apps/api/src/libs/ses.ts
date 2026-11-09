import { SESClient } from "@aws-sdk/client-ses";
import { SESv2Client } from "@aws-sdk/client-sesv2";
import { config } from "../../config";

/**
 * Shared SES clients. No explicit credentials are passed - the AWS SDK's
 * default credential provider chain reads `AWS_ACCESS_KEY_ID`/
 * `AWS_SECRET_ACCESS_KEY` from the environment itself.
 *
 * `sesClient` (SES v1) verifies sending identities. `sesV2Client` sends
 * campaign emails, since only the v2 `SendEmail` can set custom headers
 * (`List-Unsubscribe`). Both call the same `ses:*` IAM actions.
 */
export const sesClient = new SESClient({ region: config.awsRegion });
export const sesV2Client = new SESv2Client({ region: config.awsRegion });
