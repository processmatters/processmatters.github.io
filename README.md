# ProcessMatters Website

Static site for ProcessMatters, deployed on Cloudflare Pages, with a separate Cloudflare Worker for contact-form email delivery.

## Contact form

The contact form posts directly to the Cloudflare Worker at `https://processmatters-contact.processmatters.workers.dev`.

### Contact Worker

Worker source lives in `workers/processmatters-contact/`.

To redeploy it after edits:

```sh
cd "/Users/lisa/Documents/From inspiron/Work/D610 work/WEBSITE/website version 2/workers/processmatters-contact"
wrangler deploy
```

The Worker uses Cloudflare Email Routing via the `send_email` binding configured in `workers/processmatters-contact/wrangler.toml`.

Cloudflare references:
- Email Workers send email: https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
