---
title: FAQ
---

# FAQ

## Why did I build Mail Rocket?

I first worked with Mailchimp while I was doing my undergrad. Since then I've wanted to build my own tool for managing and sending email campaigns, both to have one and to learn how this kind of system works underneath: sending identities, templates, scheduling, rate-limited sending, and tracking.

Mail Rocket is how I did that. I recently had the time to build it, so I did.

## What's next?

The MVP is done. It covers what I set out to build and the parts I wanted to explore.

I'll add more when I have time. On the list:

- **Custom SMTP servers**, so you can send through providers other than AWS SES.
- **Bounce and complaint tracking**, so hard bounces and spam complaints are recorded and those addresses are no longer mailed.

There are no dates for these.

## Can I contribute?

Yes, please do. If there's something you'd like Mail Rocket to do, whether it's one of the features above, a bug fix or an idea of your own, fork the [repository](https://github.com/Abhinav5050649/mail-rocket), build it and open a pull request. For anything big, open an issue first so we can agree on the approach before you put in the work.
