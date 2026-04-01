import { z } from "zod";

export const imageCodeMailerOutputSchema = z.object({
  success: z.boolean(),
  summary: z.string(),
  generatedFiles: z.array(z.string()),
  email: z.object({
    attempted: z.boolean(),
    sent: z.boolean(),
    recipient: z.string(),
    subject: z.string(),
    message: z.string(),
  }),
});

export type ImageCodeMailerOutput = z.infer<typeof imageCodeMailerOutputSchema>;

export const imageCodeMailerJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    success: { type: "boolean" },
    summary: { type: "string" },
    generatedFiles: {
      type: "array",
      items: { type: "string" },
    },
    email: {
      type: "object",
      additionalProperties: false,
      properties: {
        attempted: { type: "boolean" },
        sent: { type: "boolean" },
        recipient: { type: "string" },
        subject: { type: "string" },
        message: { type: "string" },
      },
      required: ["attempted", "sent", "recipient", "subject", "message"],
    },
  },
  required: ["success", "summary", "generatedFiles", "email"],
} as const;
