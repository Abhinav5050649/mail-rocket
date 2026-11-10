---
sidebar_position: 4
title: Templates and variables
---

# Templates and variables

A template is the HTML body of a campaign's email. The body and the campaign's **subject** can both contain `{{variable_name}}` placeholders, filled in separately for each subscriber at send time.

```html
<p>Hi {{subscriber_first_name}},</p>
<p>Here's what's new at {{organization_name}} this month.</p>
<p>You're getting this because you're in: {{group_name}}.</p>
```

In the web app, the template editor's **Insert variable** menu lists every variable.

## Variables

| Variable | Resolves to |
| --- | --- |
| `{{subscriber_first_name}}` | The subscriber's first name |
| `{{subscriber_last_name}}` | The subscriber's last name |
| `{{subscriber_full_name}}` | First and last name, joined with a space (whichever parts exist) |
| `{{subscriber_email}}` | The subscriber's email address |
| `{{group_name}}` | Every group the subscriber is in, alphabetical and comma-separated |
| `{{campaign_name}}` | The campaign's name |
| `{{campaign_start_date}}` | The campaign's start date, in the organization's time zone |
| `{{organization_name}}` | The organization's name (set with `PATCH /organization`) |
| `{{sender_email}}` | The address the campaign sends from: the email identity, or `<from_local_part>@<domain>` for a domain identity |

## Missing values

A placeholder is **unresolved** for a subscriber when it names a variable that doesn't exist, or the value is empty for that subscriber (for example, no first name on file).

If anything in the subject or body is unresolved, **that subscriber isn't sent an email**. Their delivery is marked `failed` with the missing variable names as the reason, and everyone else in the campaign is sent normally. It's better to skip someone than to send "Hi ," or a raw `{{placeholder}}`.

:::tip
Before scheduling, check that every subscriber has the fields your template uses, or stick to variables that are always present, such as `{{subscriber_email}}`.
:::

## One library, many campaigns

Templates are a shared library. Each campaign picks one (`template_id`), and the same template can be used by any number of campaigns. Editing a template changes every campaign that hasn't sent yet. To keep an old version, copy it into a new template first.
