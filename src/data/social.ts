import { profile } from "./profile";

export const socialLinks = [
  { label: "Email", href: `mailto:${profile.email}` },
  { label: "X", href: profile.x },
  { label: "GitHub", href: profile.github },
] as const;
