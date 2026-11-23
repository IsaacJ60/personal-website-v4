// Public portfolio details. Add an email only after the user chooses which
// address they want displayed; never infer it from auth or connected accounts.
export const portfolioProfile: {
  name: string;
  email: string | null;
  instagram: { href: string; handle: string };
  website: { href: string; label: string };
} = {
  name: "Isaac Jiang",
  email: "isaac.jiang66@gmail.com",
  instagram: { href: "https://www.instagram.com/ij.prime/", handle: "@ij.prime" },
  website: { href: "/", label: "isaacjiang.ca" },
};
