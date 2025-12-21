import { companyLogos, mappings } from "@/constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Simple Icons CDN base URL
const simpleIconsBaseURL = "https://cdn.simpleicons.org";

// Tech icon colors (brand colors for common technologies)
const techColors: Record<string, string> = {
  react: "61DAFB",
  nextjs: "000000",
  vuejs: "4FC08D",
  vue: "4FC08D",
  express: "000000",
  nodejs: "339933",
  node: "339933",
  mongodb: "47A248",
  mysql: "4479A1",
  postgresql: "4169E1",
  firebase: "FFCA28",
  docker: "2496ED",
  kubernetes: "326CE5",
  aws: "FF9900",
  typescript: "3178C6",
  javascript: "F7DF1E",
  angular: "DD0031",
  python: "3776AB",
  java: "007396",
  go: "00ADD8",
  rust: "000000",
  php: "777BB4",
  ruby: "CC342D",
  csharp: "239120",
  cplusplus: "00599C",
  tailwindcss: "06B6D4",
  bootstrap: "7952B3",
  sass: "CC6699",
  graphql: "E10098",
  redux: "764ABC",
  git: "F05032",
  github: "181717",
  gitlab: "FC6D26",
  figma: "F24E1E",
  html5: "E34F26",
  css3: "1572B6",
};

const normalizeTechName = (tech: string): string => {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  return mappings[key as keyof typeof mappings] || key;
};

export const getTechLogos = (techArray?: string[]) => {
  if (!techArray || !Array.isArray(techArray) || techArray.length === 0) {
    return [];
  }

  return techArray.map((tech) => {
    const normalized = normalizeTechName(tech);
    const color = techColors[normalized] || "666666"; // Default gray if color not found

    return {
      tech,
      url: `${simpleIconsBaseURL}/${normalized}/${color}`,
    };
  });
};

export const getRandomInterviewCover = () => {
  const randomIndex = Math.floor(Math.random() * companyLogos.length);
  const company = companyLogos[randomIndex];

  // Use brand colors for company logos
  const companyColors: Record<string, string> = {
    adobe: "FF0000",
    amazon: "FF9900",
    meta: "0668E1",
    hostinger: "673DE6",
    pinterest: "E60023",
    quora: "B92B27",
    reddit: "FF4500",
    skype: "00AFF0",
    spotify: "1DB954",
    telegram: "26A5E4",
    tiktok: "000000",
    yahoo: "6001D2",
    google: "4285F4",
    microsoft: "5E5E5E",
    apple: "000000",
    netflix: "E50914",
    airbnb: "FF5A5F",
    uber: "000000",
    slack: "4A154B",
    salesforce: "00A1E0",
  };

  const color = companyColors[company] || "333333";
  return `${simpleIconsBaseURL}/${company}/${color}`;
};