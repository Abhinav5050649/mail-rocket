import { SESClient } from "@aws-sdk/client-ses";
import { config } from "../../config";

/**
 * Shared SES client used to send campaign emails. No explicit credentials
 * are passed - the AWS SDK's default credential provider chain reads
 * `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` from the environment itself.
 */
export const sesClient = new SESClient({ region: config.awsRegion });
