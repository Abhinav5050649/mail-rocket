# AWS requirements

What the API's AWS SES integration (`src/libs/ses.ts` and its callers) needs from AWS: the IAM permissions its credentials must carry, and how to give the API those credentials. Credentials themselves are never handled here - see [example.env](example.env) (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`AWS_REGION`) and [CLAUDE.md](CLAUDE.md#instructions)/[AGENTS.md](AGENTS.md#instructions) ("never read/print `.env`").

## SES permissions

The SDK calls actually made against SES, and where each one is made:

| Action | Used in | Purpose |
| --- | --- | --- |
| `ses:VerifyEmailIdentity` | `src/services/IdentityService.ts` (`verifyWithSes`) | Registers an `email`-type identity and triggers SES's verification email. |
| `ses:VerifyDomainIdentity` | `src/services/IdentityService.ts` (`verifyWithSes`) | Registers a `domain`-type identity and returns the TXT ownership token. |
| `ses:VerifyDomainDkim` | `src/services/IdentityService.ts` (`verifyWithSes`) | Starts DKIM verification for a `domain`-type identity and returns the 3 CNAME tokens. |
| `ses:GetIdentityVerificationAttributes` | `src/queues/IdentityVerificationWorker.ts` | Polled by the identity-verification worker until SES reports `Success`. |
| `ses:SendEmail` | `src/services/SendCampaignService.ts` (`sendChunk`) | Sends one campaign email per subscriber, through the SES v2 API (the same IAM action as v1) so it can set `List-Unsubscribe` headers. |

The policy document for these is [resources/aws/ses-policy.json](../../resources/aws/ses-policy.json) (repo root). Replace `<AWS_ACCOUNT_ID>` in it with the real account id before using it.

Notes:
- The `Verify*`/`GetIdentityVerificationAttributes` actions are scoped to `Resource: "*"` because a `VerifyEmailIdentity`/`VerifyDomainIdentity` call creates the identity - there's no ARN to scope to beforehand. `SendEmail` is scoped to `identity/*` in the account so the credentials can only send from identities that account owns.
- A brand-new SES account is in the **sandbox**: `SendEmail` only succeeds if both the sender identity and every subscriber are verified. Moving to production sending (arbitrary subscribers) requires a one-time SES sending-limits increase request in the AWS console/Support - that's an AWS account setting, not an IAM permission, so it isn't in the policy file.
- `SES_SEND_RATE_PER_SECOND` (see [example.env](example.env)) should track the account's actual SES send-rate quota, not an IAM concept.

## Credentials: an IAM user's access keys (the default)

The API reads credentials through the AWS SDK's default credential provider chain (`src/libs/ses.ts` passes none of its own), so the simplest setup works wherever the API runs - EC2, another cloud, a VM at home, a laptop: a dedicated IAM user whose access key goes in `.env`.

1. Create the user and give it only the SES policy:

   ```bash
   aws iam create-user --user-name mail-rocket-ses
   aws iam put-user-policy \
     --user-name mail-rocket-ses \
     --policy-name mail-rocket-ses \
     --policy-document file://../../resources/aws/ses-policy.json
   ```

2. Create an access key (`aws iam create-access-key --user-name mail-rocket-ses`) and put the key id and secret in `.env` as `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, next to `AWS_REGION` (the region your SES identities live in). The SDK reads them straight from the environment, not through [config.ts](config.ts).
3. On a server, make `.env` readable by its owner only: `chmod 600 apps/api/.env`. It's gitignored, so it never reaches the repo.

Use a separate user (and key) for local development and for each server, so revoking one never breaks the others.

A key never expires on its own, so if one leaks it works until it's revoked. These keep that risk small without adding any moving parts:

- **Least privilege.** The user holds only the policy above, so a leaked key can verify identities and send from the account's verified ones - nothing else in the AWS account.
- **Lock the server's key to the server.** Attach [resources/aws/ses-source-ip-restriction-policy.json](../../resources/aws/ses-source-ip-restriction-policy.json) after replacing `<SERVER_PUBLIC_IP>` with the server's public IP (an Elastic IP on EC2, or any static IP elsewhere). It denies every SES call from anywhere else, so a leaked copy of that key is useless:

  ```bash
  aws iam put-user-policy \
    --user-name mail-rocket-ses \
    --policy-name mail-rocket-ses-source-ip \
    --policy-document file://../../resources/aws/ses-source-ip-restriction-policy.json
  ```

  `aws:SourceIp` is the address AWS sees the call come from, so this needs a static public IP, and it doesn't apply to calls through a VPC endpoint. Skip it for a local-development key, or use your own IP.
- **Rotate now and then** (and at once if a key may have leaked). A user can hold two keys, so it's a no-downtime swap:

  ```bash
  aws iam create-access-key --user-name mail-rocket-ses              # new key -> put it in .env
  docker compose --env-file apps/api/.env up -d --force-recreate api # restart the API with it
  aws iam update-access-key --user-name mail-rocket-ses --access-key-id <OLD_KEY_ID> --status Inactive
  aws iam delete-access-key --user-name mail-rocket-ses --access-key-id <OLD_KEY_ID>  # once sends still work
  ```

- **Notice misuse.** The SES sending quota caps how much a stolen key can send, and a CloudWatch alarm on the SES `Send` metric (or the account's bounce/complaint rates) flags unusual volume.

## Optional on EC2: an instance role instead of keys

On EC2 the API can skip keys entirely. An IAM role attached to the instance gives the SDK short-lived credentials from the instance metadata service, refreshed automatically - no key in `.env`, nothing to rotate, and no code change (the same default credential chain finds them).

1. Create the role with the trust policy in [resources/aws/ec2-instance-role-trust-policy.json](../../resources/aws/ec2-instance-role-trust-policy.json) (it trusts the `ec2.amazonaws.com` service principal) and the SES policy:

   ```bash
   aws iam create-role \
     --role-name mail-rocket-api-ec2-role \
     --assume-role-policy-document file://../../resources/aws/ec2-instance-role-trust-policy.json
   aws iam put-role-policy \
     --role-name mail-rocket-api-ec2-role \
     --policy-name mail-rocket-ses \
     --policy-document file://../../resources/aws/ses-policy.json
   ```

2. Attach it to the instance through an instance profile (EC2 console: the instance -> Actions -> Security -> Modify IAM role).
3. Let containers reach the metadata service: the API runs in Docker, one network hop further than the instance itself, and IMDSv2's default hop limit of 1 stops it there (the SDK then fails with a credentials error). Raise the limit to 2:

   ```bash
   aws ec2 modify-instance-metadata-options --instance-id <INSTANCE_ID> \
     --http-tokens required --http-put-response-hop-limit 2
   ```

4. Delete the `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` lines from `.env` (keep `AWS_REGION`). Keys in the environment take precedence over the role, so leaving them in means the role is never used.

## Sending from another AWS account's identity

SES identities aren't cross-account by default. If an organization wants to send from a domain/email verified under another AWS account, that identity's owner must attach an SES **identity policy** (a resource-based policy on the SES identity itself, not on this project's IAM user/role) granting this account's IAM user/role `ses:SendEmail` on that identity. This project doesn't do this today (every identity created via `IdentityService.create` is verified directly under the account whose credentials the API uses), but it's the mechanism to reach for if that changes.

## Related docs

- [README.md](README.md) - setup, architecture, deployment.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - flow diagrams, including identity verification and campaign send.
