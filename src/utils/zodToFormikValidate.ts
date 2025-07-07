import { ZodObject, ZodRawShape } from "zod"

export function zodToFormikValidate<T extends ZodRawShape>(
  schema: ZodObject<T>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (values: any) => {
    const result = schema.safeParse(values)
    const errors: Record<string, string> = {}

    if (!result.success) {
      for (const err of result.error.errors) {
        if (err.path.length) {
          errors[err.path[0] as string] = err.message
        }
      }
    }

    return errors
  }
}