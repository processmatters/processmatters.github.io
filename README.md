# ProcessMatters Website

Static site for ProcessMatters, deployed on Cloudflare Pages.

## Contact form

The contact form posts to the Cloudflare Pages Function at `/api/contact`.

- If the Pages secret `MAILCHANNELS_API_KEY` is set, the function sends mail through the MailChannels Email API.
- If that secret is not set yet, the function safely falls back to the existing FormSubmit endpoint so submissions keep working during setup.

### Cloudflare Pages setup

Add this secret in the Cloudflare Pages project settings:

- `MAILCHANNELS_API_KEY`

Optional environment variables:

- `CONTACT_FROM_EMAIL` defaults to `contact@processmatters.net`
- `CONTACT_TO_EMAIL` defaults to `lsilverberg@processmatters.net`

If you use MailChannels domain lock-down, add the TXT record they provide for `processmatters.net`.

Cloudflare reference:
- Pages Functions bindings: https://developers.cloudflare.com/pages/functions/wrangler-configuration/

MailChannels reference:
- Email API overview: https://mailchannels.zendesk.com/hc/en-us/articles/4407613749531
