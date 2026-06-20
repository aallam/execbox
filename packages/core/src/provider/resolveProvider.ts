import Ajv from "ajv";

import {
  ExecuteFailure,
  isExecuteFailure,
  isJsonSerializable,
} from "../errors";
import { assertValidIdentifier } from "../identifier";
import { sanitizeToolName } from "../sanitize";
import { normalizeToolSchema } from "../schema/normalizeSchema";
import { generateTypesFromJsonSchema } from "../typegen/jsonSchema";
import type {
  JsonSchema,
  ResolvedToolDescriptor,
  ResolvedToolProvider,
  ToolAnnotations,
  ToolExecutionContext,
  ToolProvider,
  TypegenToolDescriptor,
} from "../types";

const DEFAULT_PROVIDER_NAME = "codemode";
type AjvInstance = InstanceType<typeof Ajv>;
type AjvValidateFunction = ReturnType<AjvInstance["compile"]>;

function assertValidNamespace(name: string): void {
  assertValidIdentifier(name, "provider namespace");
}

function cloneToolAnnotations(
  annotations: ToolAnnotations | undefined,
): ToolAnnotations | undefined {
  if (!annotations) {
    return undefined;
  }

  const clone: ToolAnnotations = {};

  if (annotations.title !== undefined) {
    clone.title = annotations.title;
  }

  if (annotations.readOnlyHint !== undefined) {
    clone.readOnlyHint = annotations.readOnlyHint;
  }

  if (annotations.destructiveHint !== undefined) {
    clone.destructiveHint = annotations.destructiveHint;
  }

  if (annotations.idempotentHint !== undefined) {
    clone.idempotentHint = annotations.idempotentHint;
  }

  if (annotations.openWorldHint !== undefined) {
    clone.openWorldHint = annotations.openWorldHint;
  }

  return Object.keys(clone).length === 0 ? undefined : clone;
}

function compileValidator(
  ajv: AjvInstance,
  schema: JsonSchema | undefined,
): AjvValidateFunction | undefined {
  return schema ? ajv.compile(schema as object) : undefined;
}

function formatValidationMessage(
  ajv: AjvInstance,
  phase: "input" | "output",
  toolName: string,
  validator: AjvValidateFunction,
): string {
  return `Invalid ${phase} for tool ${toolName}: ${ajv.errorsText(validator.errors)}`;
}

/**
 * Resolves a tool provider into the validated, sanitized shape consumed by executors.
 */
export function resolveProvider(provider: ToolProvider): ResolvedToolProvider {
  const name = provider.name ?? DEFAULT_PROVIDER_NAME;
  assertValidNamespace(name);

  // Keep provider schemas permissive for generated schemas and extension keywords.
  const ajv = new Ajv({
    allErrors: true,
    strictKeywords: false,
  });

  const originalToSafeName: Record<string, string> = {};
  const safeToOriginalName: Record<string, string> = {};
  const usedSafeNames = new Set<string>();
  const resolvedTools: Record<string, ResolvedToolDescriptor> = {};
  const typegenTools: Record<string, TypegenToolDescriptor> = {};

  for (const [originalName, descriptor] of Object.entries(provider.tools)) {
    const baseSafeName = sanitizeToolName(originalName);
    let safeName = baseSafeName;
    let suffix = 2;

    while (usedSafeNames.has(safeName)) {
      safeName = `${baseSafeName}__${suffix}`;
      suffix += 1;
    }

    usedSafeNames.add(safeName);
    originalToSafeName[originalName] = safeName;
    safeToOriginalName[safeName] = originalName;

    const inputSchema = normalizeToolSchema(
      descriptor.inputSchema,
      "input",
      originalName,
    );
    const outputSchema = normalizeToolSchema(
      descriptor.outputSchema,
      "output",
      originalName,
    );
    const inputValidator = compileValidator(ajv, inputSchema);
    const outputValidator = compileValidator(ajv, outputSchema);

    resolvedTools[safeName] = {
      annotations: cloneToolAnnotations(descriptor.annotations),
      description: descriptor.description,
      execute: async (
        input: unknown,
        context: ToolExecutionContext,
      ): Promise<unknown> => {
        if (inputValidator && !inputValidator(input)) {
          throw new ExecuteFailure(
            "validation_error",
            formatValidationMessage(ajv, "input", originalName, inputValidator),
          );
        }

        try {
          const result = await descriptor.execute(input, context);

          if (!isJsonSerializable(result)) {
            throw new ExecuteFailure(
              "serialization_error",
              `Tool ${originalName} returned a non-serializable value`,
            );
          }

          if (outputValidator && !outputValidator(result)) {
            throw new ExecuteFailure(
              "validation_error",
              formatValidationMessage(
                ajv,
                "output",
                originalName,
                outputValidator,
              ),
            );
          }

          return result;
        } catch (error) {
          if (isExecuteFailure(error)) {
            throw error;
          }

          throw new ExecuteFailure(
            "tool_error",
            error instanceof Error
              ? error.message
              : `Tool ${originalName} failed`,
          );
        }
      },
      inputSchema,
      originalName,
      outputSchema,
      safeName,
    };

    typegenTools[safeName] = {
      description: descriptor.description,
      inputSchema,
      outputSchema,
    };
  }

  return {
    name,
    originalToSafeName,
    safeToOriginalName,
    tools: resolvedTools,
    types: provider.types ?? generateTypesFromJsonSchema(name, typegenTools),
  };
}
