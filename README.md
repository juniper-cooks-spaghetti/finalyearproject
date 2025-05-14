CircuitLearn is a NTU Final Year Project created by Gregory Isaac Koesno from the NTU Undergraduate Programme under EEE.
The platofrm was created with the goal of promoting "life-long learning" practices amongst the NTU EEE MSc students. 
With this in mind, the application supports it's userbase with the usage of roadmap data systems, which aggregate content for specific topics and recommend pathways towards learning new topics as well. The website supports admin and user functionality within a single deployment using vercel, and runs authorization using Clerk. Furthermore scraping functionalities are funneled through the Apify API, which combs Google SERP for new content on a rolling basis.

Github Repository: 

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

## API Setup

Ensure that an environment local file is created with the relevant API keys from both Clerk and Apify to experience full functionality of the website. Upon deployment environment variables should be migrated to Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
