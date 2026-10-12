import { z } from "zod";
import { ApiError } from "./http";

const cleanText = (max: number, min = 1) => z.string().trim().min(min).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

const commonInquiry = {
  name: cleanText(120),
  email: z.email().trim().max(254).transform((value) => value.toLowerCase()),
  organization: optionalText(160),
  industry: optionalText(120),
  consent: z.literal("I understand this information is submitted to HighEnd IT Sales & Solutions."),
  companyWebsite: z.string().max(0).optional().default(""),
};

export const enquirySchema = z.object({
  ...commonInquiry,
  message: cleanText(4000),
}).strict();

export const consultationSchema = z.object({
  ...commonInquiry,
  timezone: cleanText(100),
  preferredTime: cleanText(180),
  topic: z.enum([
    "AI and automation",
    "Cloud and DevOps",
    "Software and applications",
    "Data and analytics",
    "Cybersecurity and IT consulting",
    "Products and technology",
    "Other technology discussion",
  ]),
  context: optionalText(3000),
}).strict();

const serviceSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: cleanText(180),
  shortTitle: cleanText(100),
  icon: cleanText(40),
  summary: cleanText(600),
  introduction: cleanText(4000),
  outcomes: z.array(cleanText(500)).min(1).max(12),
  capabilities: z.array(cleanText(160)).min(1).max(24),
  approach: z.array(z.object({ title: cleanText(180), description: cleanText(1200) }).strict()).min(1).max(12),
  example: cleanText(2500),
  featured: z.boolean(),
}).strict();

const industrySchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  name: cleanText(180),
  category: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80),
  focus: cleanText(400),
  icon: cleanText(40),
  summary: cleanText(600),
  introduction: cleanText(3000),
  keywords: z.array(cleanText(80)).max(40),
  systems: z.array(cleanText(300)).min(1).max(24),
  challenges: z.array(cleanText(1200)).min(1).max(12),
  opportunities: z.array(cleanText(1200)).min(1).max(12),
  agents: z.array(cleanText(1600)).min(1).max(12),
  services: z.array(cleanText(100)).max(24),
  integrations: z.array(cleanText(500)).min(1).max(24),
  safeguards: z.array(cleanText(1200)).min(1).max(16),
  example: cleanText(2000),
}).strict();

const articleSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  category: cleanText(100),
  title: cleanText(240),
  summary: cleanText(800),
  readTime: cleanText(80),
  sections: z.array(z.object({
    heading: cleanText(240),
    paragraphs: z.array(cleanText(3000)).min(1).max(12),
  }).strict()).min(1).max(30),
}).strict();

const productSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  name: cleanText(180),
  category: cleanText(120),
  summary: cleanText(600),
  description: cleanText(4000),
  vendorName: optionalText(180),
  productUrl: z.union([z.literal(""), z.url({ protocol: /^https$/ }).max(2048)]).optional().default(""),
  details: z.record(z.string(), z.unknown()).optional().default({}),
}).strict();

export type Inquiry = z.infer<typeof enquirySchema>;
export type Consultation = z.infer<typeof consultationSchema>;
export type ManagedContent = z.infer<typeof serviceSchema | typeof industrySchema | typeof articleSchema | typeof productSchema>;

export function validateInquiry(value: unknown): Inquiry {
  const result = enquirySchema.safeParse(value);
  if (!result.success) throw validationError(result.error.issues);
  return result.data;
}

export function validateConsultation(value: unknown): Consultation {
  const result = consultationSchema.safeParse(value);
  if (!result.success) throw validationError(result.error.issues);
  return result.data;
}

const schemas = {
  services: serviceSchema,
  industries: industrySchema,
  articles: articleSchema,
  products: productSchema,
} as const;

export function validateContent(collection: keyof typeof schemas, value: unknown): Record<string, unknown> {
  const result = schemas[collection].safeParse(value);
  if (!result.success) throw validationError(result.error.issues);
  return result.data as Record<string, unknown>;
}

function validationError(issues: { path: PropertyKey[]; message: string }[]): ApiError {
  const fields: Record<string, string[]> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".") || "request";
    (fields[path] ??= []).push(issue.message);
  }
  return new ApiError(422, "VALIDATION_FAILED", "Check the submitted fields and try again.", fields);
}
