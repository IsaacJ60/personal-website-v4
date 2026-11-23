import localFont from "next/font/local";

const instrumentSans = localFont({ src:"./fonts/instrumentsans-latin.woff2", variable:"--portfolio-font-body", weight:"400 600", display:"swap", preload:false });
const fraunces = localFont({ src:"./fonts/fraunces-latin.woff2", variable:"--portfolio-font-light-heading", weight:"400 600", display:"swap", preload:false, adjustFontFallback:"Times New Roman" });
const manrope = localFont({ src:"./fonts/manrope-latin.woff2", variable:"--portfolio-font-light-body", weight:"400 600", display:"swap", preload:false });
const spaceGrotesk = localFont({ src:"./fonts/spacegrotesk-latin.woff2", variable:"--portfolio-font-dark-heading", weight:"400 600", display:"swap", preload:false });
const plexSans = localFont({ src:"./fonts/ibmplexsans-latin.woff2", variable:"--portfolio-font-dark-body", weight:"400 600", display:"swap", preload:false });

// The root next-themes class chooses the semantic heading/body variables in CSS.
// No client-side font swapping or independent typography toggle is required.
export const portfolioTypography = {
  className: `${fraunces.variable} ${manrope.variable} ${spaceGrotesk.variable} ${plexSans.variable}`,
  wordmarkClassName: instrumentSans.className,
};
