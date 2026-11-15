import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Display name must be at least 2 characters")
  .max(64, "Display name is too long");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const channelNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name is too long");

export const channelDescriptionSchema = z
  .string()
  .max(2000, "Description is too long")
  .optional()
  .transform((s) => (s == null ? "" : s));

export const postTitleSchema = z
  .string()
  .trim()
  .min(1, "Title is required")
  .max(300, "Title is too long");

export const postBodySchema = z
  .string()
  .min(1, "Body is required")
  .max(20000, "Body is too long");

export const replyBodySchema = postBodySchema;

export const targetTypeSchema = z.enum(["post", "reply"]);
