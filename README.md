This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

See [the codebase guide](docs/ARCHITECTURE.md) for routes, photo data flow,
admin/upload boundaries, and the proposed workflow for the photo redesign.

See [the photo redesign brainstorm](docs/PHOTO_REDESIGN_BRAINSTORM.md) for
portfolio references, navigation options, content ideas, and the live Supabase
review with prioritized improvements.

See [the Supabase implementation record](docs/SUPABASE_CHANGES.md) for the applied
permissions fix, private snapshot, independent photo v2 tables, and database tests.

The first UI checkpoint is at `/photo-preview` on the local dev server.
See [preview progress](docs/PHOTO_PREVIEW_PROGRESS.md) for the current review scope.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### Image optimization costs

`next.config.ts` limits image optimization to one quality (75), WebP output,
nine widths, and the local image directory / approved remote paths without query
strings. Photo components declare their rendered sizes so browsers can request
smaller variants for cards and admin thumbnails. Keep these sizes aligned with
their layouts when changing grid columns or container widths.

Optimized images have a minimum cache lifetime of 31 days. **Use a new filename
when replacing a photo**; overwriting the same R2 key can leave visitors seeing
the cached version until it expires. The effective lifetime can be longer if the
source sends a longer cache lifetime.

After deployment, compare Image Optimization transformations, cache reads/writes,
and Fast Data Transfer in Vercel Usage / Observability across comparable traffic
periods. New variants need to warm their cache, so changes do not imply an
immediate proportional reduction in the bill.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
