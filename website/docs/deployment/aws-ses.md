---
sidebar_position: 2
title: AWS SES setup
---

# AWS SES setup

The API needs AWS credentials that can verify identities and send email through SES. It reads them through the AWS SDK's default credential chain, so the same setup works on EC2, another cloud, or a laptop.

## Permissions

| Action | Used for |
| --- | --- |
| `ses:VerifyEmailIdentity` | Registering an email identity (SES sends a verification email) |
| `ses:VerifyDomainIdentity` | Registering a domain identity (returns the TXT ownership token) |
| `ses:VerifyDomainDkim` | Starting DKIM for a domain (returns three CNAME tokens) |
| `ses:GetIdentityVerificationAttributes` | Polling until SES confirms an identity |
| `ses:SendEmail` | Sending one email per subscriber (through the SES v2 API, so it can set `List-Unsubscribe` headers) |

The policy document is [`resources/aws/ses-policy.json`](https://github.com/Abhinav5050649/mail-rocket/blob/main/resources/aws/ses-policy.json). Replace `<AWS_ACCOUNT_ID>` in it before use. `SendEmail` is scoped to the account's own identities.

## Credentials: an IAM user's access key (default)

1. Create a dedicated user holding only the SES policy:

   ```bash
   aws iam create-user --user-name mail-rocket-ses
   aws iam put-user-policy \
     --user-name mail-rocket-ses \
     --policy-name mail-rocket-ses \
     --policy-document file://resources/aws/ses-policy.json
   ```

2. Create an access key and put it in `apps/api/.env`:

   ```bash
   aws iam create-access-key --user-name mail-rocket-ses
   ```

   ```bash
   AWS_REGION=us-east-1                 # the region your SES identities live in
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   ```

3. On a server, `chmod 600 apps/api/.env`. It's gitignored.

Use a separate user and key for local development and for each server, so revoking one never breaks the others.

### Lock the key to the server

Attach [`resources/aws/ses-source-ip-restriction-policy.json`](https://github.com/Abhinav5050649/mail-rocket/blob/main/resources/aws/ses-source-ip-restriction-policy.json), with `<SERVER_PUBLIC_IP>` replaced by the server's static IP. It denies every SES call from anywhere else, so a leaked copy of the key is useless.

```bash
aws iam put-user-policy \
  --user-name mail-rocket-ses \
  --policy-name mail-rocket-ses-source-ip \
  --policy-document file://resources/aws/ses-source-ip-restriction-policy.json
```

### Rotate keys

A user can hold two keys, so rotation has no downtime:

```bash
aws iam create-access-key --user-name mail-rocket-ses              # put the new key in .env
docker compose --env-file apps/api/.env up -d --force-recreate api
aws iam update-access-key --user-name mail-rocket-ses --access-key-id <OLD_KEY_ID> --status Inactive
aws iam delete-access-key --user-name mail-rocket-ses --access-key-id <OLD_KEY_ID>
```

## Optional on EC2: an instance role

On EC2 you can skip keys entirely: a role attached to the instance gives the SDK short-lived credentials that refresh on their own.

1. Create the role with [`resources/aws/ec2-instance-role-trust-policy.json`](https://github.com/Abhinav5050649/mail-rocket/blob/main/resources/aws/ec2-instance-role-trust-policy.json) and the SES policy:

   ```bash
   aws iam create-role \
     --role-name mail-rocket-api-ec2-role \
     --assume-role-policy-document file://resources/aws/ec2-instance-role-trust-policy.json
   aws iam put-role-policy \
     --role-name mail-rocket-api-ec2-role \
     --policy-name mail-rocket-ses \
     --policy-document file://resources/aws/ses-policy.json
   ```

2. Attach it to the instance (EC2 console → the instance → Actions → Security → Modify IAM role).
3. Let containers reach the metadata service by raising the IMDSv2 hop limit to 2:

   ```bash
   aws ec2 modify-instance-metadata-options --instance-id <INSTANCE_ID> \
     --http-tokens required --http-put-response-hop-limit 2
   ```

4. Remove `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` from `.env` (keep `AWS_REGION`). Keys in the environment win over the role.

## Sandbox and send rate

- A new SES account is in the **sandbox**: it can only send to verified addresses. Request production access in the SES console to send to anyone.
- Set `SES_SEND_RATE_PER_SECOND` to your account's real send-rate quota (shown in the SES console).
