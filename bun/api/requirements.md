# AWS requirements

What the API's AWS SES integration (`src/libs/ses.ts` and its callers) needs from AWS: the IAM permissions its credentials must carry, and the trust relationships that back those credentials. Credentials themselves are never handled here - see [example.env](example.env) (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`) and [CLAUDE.md](CLAUDE.md#instructions)/[AGENTS.md](AGENTS.md#instructions) ("never read/print `.env`").

## SES permissions

The SDK calls actually made against SES, and where each one is made:

| Action | Used in | Purpose |
| --- | --- | --- |
| `ses:VerifyEmailIdentity` | `src/services/IdentityService.ts` (`verifyWithSes`) | Registers an `email`-type identity and triggers SES's verification email. |
| `ses:VerifyDomainIdentity` | `src/services/IdentityService.ts` (`verifyWithSes`) | Registers a `domain`-type identity and returns the TXT ownership token. |
| `ses:VerifyDomainDkim` | `src/services/IdentityService.ts` (`verifyWithSes`) | Starts DKIM verification for a `domain`-type identity and returns the 3 CNAME tokens. |
| `ses:GetIdentityVerificationAttributes` | `src/queues/IdentityVerificationWorker.ts` | Polled by the identity-verification worker until SES reports `Success`. |
| `ses:SendEmail` | `src/services/SendCampaignService.ts` (`sendChunk`) | Sends one campaign email per recipient. |

The policy document for these is [resources/aws/ses-local-test-user-policy.json](resources/aws/ses-local-test-user-policy.json). To configure a local IAM user (e.g. `local-test-user`) for local dev/testing:

```bash
aws iam put-user-policy \
  --user-name local-test-user \
  --policy-name mail-rocket-ses \
  --policy-document file://resources/aws/ses-local-test-user-policy.json
```

Replace `<AWS_ACCOUNT_ID>` in the policy file with the real account id first. Then create an access key for that user (`aws iam create-access-key --user-name local-test-user`) and put the resulting key/secret in `.env` as `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` - they're read directly by the AWS SDK's default credential provider chain, not by [config.ts](config.ts).

Notes:
- The `Verify*`/`GetIdentityVerificationAttributes` actions are scoped to `Resource: "*"` because a `VerifyEmailIdentity`/`VerifyDomainIdentity` call creates the identity - there's no ARN to scope to beforehand. `SendEmail` is scoped to `identity/*` in the account so the user can only send from identities that account owns.
- A brand-new SES account is in the **sandbox**: `SendEmail` only succeeds if both the sender identity and every recipient are verified. Moving to production sending (arbitrary recipients) requires a one-time SES sending-limits increase request in the AWS console/Support - that's an AWS account setting, not an IAM permission, so it isn't in the policy file.
- `SES_SEND_RATE_PER_SECOND` (see [example.env](example.env)) should track the account's actual SES send-rate quota, not an IAM concept.

## Trust relationships

An IAM **user** (like `local-test-user`) has no trust policy of its own - trust policies apply to IAM **roles**, which are assumed rather than logged into. Two trust relationships are relevant to how this project is deployed/could be deployed:

1. **EC2 instance role (recommended for the EC2 deployment described in [README.md](README.md#deployment-docker-on-ec2))**. The current deployment reads static `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` from `.env` on the instance. The safer alternative is an IAM role attached to the EC2 instance profile, so the SDK's default credential provider chain picks up temporary credentials automatically and no long-lived key sits in `.env`. That role needs the trust policy in [resources/aws/ec2-instance-role-trust-policy.json](resources/aws/ec2-instance-role-trust-policy.json) (trusts the `ec2.amazonaws.com` service principal) plus the permissions policy above attached to it, e.g.:

   ```bash
   aws iam create-role \
     --role-name mail-rocket-api-ec2-role \
     --assume-role-policy-document file://resources/aws/ec2-instance-role-trust-policy.json
   aws iam put-role-policy \
     --role-name mail-rocket-api-ec2-role \
     --policy-name mail-rocket-ses \
     --policy-document file://resources/aws/ses-local-test-user-policy.json
   ```

   Then attach the role to the instance via an instance profile, and drop `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` from `.env` entirely.

2. **SES sending authorization (only if a sending identity is owned by a different AWS account than the one running this API)**. SES identities aren't cross-account by default - if an organization in this app wants to send from a domain/email verified under another AWS account, that identity's owner must attach an SES **identity policy** (a resource-based policy on the SES identity itself, not on this project's IAM user/role) granting this account's IAM user/role `ses:SendEmail`/`ses:SendRawEmail` on that identity. This project doesn't do this today (every identity created via `IdentityService.create` is verified directly under the account whose credentials are in `.env`), but it's the mechanism to reach for if that changes.

## Related docs

- [README.md](README.md) - setup, architecture, deployment.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - flow diagrams, including identity verification and campaign send.
