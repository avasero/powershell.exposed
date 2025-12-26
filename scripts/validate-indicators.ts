#!/usr/bin/env -S deno run --allow-read --allow-write --allow-env
/**
 * Indicator Validation Script
 * Validates YAML indicator files before they are added to the database.
 * 
 * Usage: deno run --allow-read scripts/validate-indicators.ts <file1.yaml> [file2.yaml ...]
 * 
 * Exit codes:
 *   0 - All validations passed
 *   1 - One or more validations failed
 */

import * as yaml from "https://esm.sh/js-yaml@4.1.0";

// ============================================================================
// Types
// ============================================================================

interface ValidationError {
    field: string;
    message: string;
    howToFix: string;
}

interface ValidationWarning {
    field: string;
    message: string;
}

interface ValidationResult {
    step: string;
    passed: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

interface FullValidationResult {
    filePath: string;
    passed: boolean;
    steps: ValidationResult[];
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

interface YamlIndicator {
    name?: unknown;
    description?: unknown;
    regex?: unknown;
    basescore?: unknown;
    max_match?: unknown;
    maxmatch?: unknown; // Alternative spelling
    tactic?: unknown;
    technique?: unknown;
    reference?: unknown;
}

// ============================================================================
// Step 1: YAML Syntax Validation
// ============================================================================

function validateYamlSyntax(content: string, filePath: string): ValidationResult {
    const result: ValidationResult = {
        step: "YAML Syntax",
        passed: true,
        errors: [],
        warnings: [],
    };

    try {
        const data = yaml.load(content);

        if (data === null || data === undefined) {
            result.passed = false;
            result.errors.push({
                field: "file",
                message: "YAML file is empty or contains only null",
                howToFix: "Add indicator content to the file",
            });
            return result;
        }

        if (typeof data !== "object" || Array.isArray(data)) {
            result.passed = false;
            result.errors.push({
                field: "file",
                message: `YAML must be an object, got: ${Array.isArray(data) ? "array" : typeof data}`,
                howToFix: "Structure the file as key-value pairs (e.g., name: value)",
            });
            return result;
        }
    } catch (error: unknown) {
        result.passed = false;
        const err = error as { message?: string; mark?: { line?: number; column?: number; snippet?: string } };

        let errorMsg = `YAML syntax error: ${err.message || "Unknown error"}`;
        let howToFix = "Fix the YAML syntax error";

        if (err.mark) {
            const line = (err.mark.line ?? 0) + 1;
            const column = (err.mark.column ?? 0) + 1;
            errorMsg += ` (Line ${line}, Column ${column})`;

            if (err.mark.snippet) {
                errorMsg += `\n   Snippet: ${err.mark.snippet}`;
            }

            howToFix = `Check line ${line} for syntax issues like unclosed quotes, incorrect indentation, or invalid characters`;
        }

        result.errors.push({
            field: "file",
            message: errorMsg,
            howToFix: howToFix,
        });
    }

    return result;
}

// ============================================================================
// Step 2: Required Fields Validation
// ============================================================================

const REQUIRED_FIELDS = ["name", "description", "regex", "basescore", "tactic", "technique", "reference"];

function validateRequiredFields(data: YamlIndicator): ValidationResult {
    const result: ValidationResult = {
        step: "Required Fields",
        passed: true,
        errors: [],
        warnings: [],
    };

    for (const field of REQUIRED_FIELDS) {
        const value = data[field as keyof YamlIndicator];

        if (value === undefined || value === null) {
            result.passed = false;
            result.errors.push({
                field: field,
                message: `Missing required field: '${field}'`,
                howToFix: `Add the '${field}' field to your YAML file`,
            });
        } else if (typeof value === "string" && value.trim() === "") {
            result.passed = false;
            result.errors.push({
                field: field,
                message: `Field '${field}' is empty`,
                howToFix: `Provide a value for the '${field}' field`,
            });
        }
    }

    return result;
}

// ============================================================================
// Step 3: Data Type Validation
// ============================================================================

function isValidUrl(str: string): boolean {
    try {
        new URL(str);
        return str.startsWith("http://") || str.startsWith("https://");
    } catch {
        return false;
    }
}

function toStringArray(value: unknown): string[] {
    if (!value) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) {
        return value.map((v) => String(v)).filter((v) => v.length > 0);
    }
    return [];
}

function validateDataTypes(data: YamlIndicator): ValidationResult {
    const result: ValidationResult = {
        step: "Data Types",
        passed: true,
        errors: [],
        warnings: [],
    };

    // Validate name (non-empty string)
    if (data.name !== undefined) {
        if (typeof data.name !== "string") {
            result.passed = false;
            result.errors.push({
                field: "name",
                message: `'name' must be a string, got: ${typeof data.name}`,
                howToFix: "Provide a text value for name, e.g., name: \"My Indicator\"",
            });
        } else if (data.name.trim().length === 0) {
            result.passed = false;
            result.errors.push({
                field: "name",
                message: "'name' cannot be empty",
                howToFix: "Provide a descriptive name for the indicator",
            });
        }
    }

    // Validate description (non-empty string)
    if (data.description !== undefined) {
        if (typeof data.description !== "string") {
            result.passed = false;
            result.errors.push({
                field: "description",
                message: `'description' must be a string, got: ${typeof data.description}`,
                howToFix: "Provide a text description, e.g., description: \"Detects suspicious activity\"",
            });
        } else if (data.description.trim().length === 0) {
            result.passed = false;
            result.errors.push({
                field: "description",
                message: "'description' cannot be empty",
                howToFix: "Provide a meaningful description of what this indicator detects",
            });
        }
    }

    // Validate basescore (number 0.0 - 10.0)
    if (data.basescore !== undefined) {
        const score = typeof data.basescore === "string" ? parseFloat(data.basescore) : data.basescore;

        if (typeof score !== "number" || isNaN(score)) {
            result.passed = false;
            result.errors.push({
                field: "basescore",
                message: `'basescore' must be a number, got: ${typeof data.basescore}`,
                howToFix: "Provide a numeric value, e.g., basescore: 7.5",
            });
        } else if (score < 0 || score > 10) {
            result.passed = false;
            result.errors.push({
                field: "basescore",
                message: `'basescore' must be between 0.0 and 10.0, got: ${score}`,
                howToFix: "Adjust the basescore to be within the valid range (0.0 - 10.0)",
            });
        }
    }

    // Validate regex (string or array of strings, non-empty)
    if (data.regex !== undefined) {
        const patterns = toStringArray(data.regex);
        if (patterns.length === 0) {
            result.passed = false;
            result.errors.push({
                field: "regex",
                message: "'regex' must have at least one pattern",
                howToFix: "Provide at least one regex pattern, e.g., regex: \"pattern|here\"",
            });
        }
    }

    // Validate tactic (string or array of strings)
    if (data.tactic !== undefined) {
        const tactics = toStringArray(data.tactic);
        if (tactics.length === 0) {
            result.passed = false;
            result.errors.push({
                field: "tactic",
                message: "'tactic' must have at least one value",
                howToFix: "Provide at least one MITRE ATT&CK tactic, e.g., tactic: Execution",
            });
        }
    }

    // Validate technique (string or array of strings)
    if (data.technique !== undefined) {
        const techniques = toStringArray(data.technique);
        if (techniques.length === 0) {
            result.passed = false;
            result.errors.push({
                field: "technique",
                message: "'technique' must have at least one value",
                howToFix: "Provide at least one MITRE ATT&CK technique, e.g., technique: T1059.001",
            });
        }
    }

    // Validate reference (string or array of valid URLs)
    if (data.reference !== undefined) {
        const refs = toStringArray(data.reference);
        if (refs.length === 0) {
            result.passed = false;
            result.errors.push({
                field: "reference",
                message: "'reference' must have at least one URL",
                howToFix: "Provide at least one reference URL, e.g., reference: https://example.com",
            });
        } else {
            for (const ref of refs) {
                if (!isValidUrl(ref)) {
                    result.passed = false;
                    result.errors.push({
                        field: "reference",
                        message: `Invalid URL in 'reference': ${ref}`,
                        howToFix: "Provide a valid URL starting with http:// or https://",
                    });
                }
            }
        }
    }

    // Validate max_match (optional, positive integer)
    const maxMatch = data.max_match ?? data.maxmatch;
    if (maxMatch !== undefined) {
        const parsed = typeof maxMatch === "string" ? parseInt(maxMatch, 10) : maxMatch;

        if (typeof parsed !== "number" || isNaN(parsed) || !Number.isInteger(parsed)) {
            result.passed = false;
            result.errors.push({
                field: "max_match",
                message: `'max_match' must be an integer, got: ${typeof maxMatch}`,
                howToFix: "Provide a positive integer, e.g., max_match: 3",
            });
        } else if (parsed < 1) {
            result.passed = false;
            result.errors.push({
                field: "max_match",
                message: `'max_match' must be >= 1, got: ${parsed}`,
                howToFix: "Provide a positive integer value",
            });
        }
    }

    return result;
}

// ============================================================================
// Step 4: Regex Pattern Validation
// ============================================================================

function validateRegexPatterns(data: YamlIndicator): ValidationResult {
    const result: ValidationResult = {
        step: "Regex Patterns",
        passed: true,
        errors: [],
        warnings: [],
    };

    const patterns = toStringArray(data.regex);

    for (const pattern of patterns) {
        // Check if it looks like a URL
        if (pattern.startsWith("http://") || pattern.startsWith("https://")) {
            result.passed = false;
            result.errors.push({
                field: "regex",
                message: `Pattern appears to be a URL, not a regex: ${pattern}`,
                howToFix: "Move URLs to the 'reference' field. The 'regex' field should contain regex patterns.",
            });
            continue;
        }

        // Check if pattern is empty
        if (pattern.trim().length === 0) {
            result.passed = false;
            result.errors.push({
                field: "regex",
                message: "Empty regex pattern found",
                howToFix: "Remove empty patterns or provide a valid regex",
            });
            continue;
        }

        // Try to compile the regex
        try {
            new RegExp(pattern, "i");
        } catch (error: unknown) {
            result.passed = false;
            const err = error as { message?: string };
            result.errors.push({
                field: "regex",
                message: `Invalid regex pattern '${pattern}': ${err.message || "Unknown error"}`,
                howToFix: "Fix the regex syntax. Common issues: unmatched brackets [], unescaped special characters.",
            });
        }

        // Warn about overly broad patterns
        if (pattern === ".*" || pattern === ".+" || pattern === "^.*$") {
            result.warnings.push({
                field: "regex",
                message: `Pattern '${pattern}' is very broad and will match almost everything`,
            });
        }
    }

    return result;
}

// ============================================================================
// Step 5: Business Rules Validation
// ============================================================================

function validateBusinessRules(data: YamlIndicator): ValidationResult {
    const result: ValidationResult = {
        step: "Business Rules",
        passed: true,
        errors: [],
        warnings: [],
    };

    // Warn about very high basescore
    const basescore = typeof data.basescore === "string" ? parseFloat(data.basescore) : data.basescore;
    if (typeof basescore === "number" && basescore >= 9.0) {
        result.warnings.push({
            field: "basescore",
            message: `High basescore (${basescore}) - ensure this indicator truly represents critical severity`,
        });
    }

    // Check technique format (basic T#### or T####.### pattern)
    const techniques = toStringArray(data.technique);
    const techniquePattern = /^T\d{4}(\.\d{3})?$/;

    for (const tech of techniques) {
        if (!techniquePattern.test(tech)) {
            result.warnings.push({
                field: "technique",
                message: `Technique '${tech}' doesn't match typical MITRE format (T####.###)`,
            });
        }
    }

    // Check for common name patterns
    const name = data.name;
    if (typeof name === "string") {
        if (name.length < 5) {
            result.warnings.push({
                field: "name",
                message: "Indicator name is very short. Consider using a more descriptive name.",
            });
        }
        if (name.length > 100) {
            result.warnings.push({
                field: "name",
                message: "Indicator name is very long. Consider shortening it.",
            });
        }
    }

    return result;
}

// ============================================================================
// Main Validation Function
// ============================================================================

async function runAllValidations(filePath: string): Promise<FullValidationResult> {
    const result: FullValidationResult = {
        filePath: filePath,
        passed: true,
        steps: [],
        errors: [],
        warnings: [],
    };

    // Read file
    let content: string;
    try {
        content = await Deno.readTextFile(filePath);
    } catch (error: unknown) {
        const err = error as { message?: string };
        result.passed = false;
        result.errors.push({
            field: "file",
            message: `Cannot read file: ${err.message || "Unknown error"}`,
            howToFix: "Check that the file exists and is readable",
        });
        return result;
    }

    // Step 1: YAML Syntax
    const syntaxResult = validateYamlSyntax(content, filePath);
    result.steps.push(syntaxResult);

    if (!syntaxResult.passed) {
        result.passed = false;
        result.errors.push(...syntaxResult.errors);
        result.warnings.push(...syntaxResult.warnings);
        return result; // Cannot continue without valid YAML
    }

    // Parse YAML for further validation
    const data = yaml.load(content) as YamlIndicator;

    // Step 2: Required Fields
    const fieldsResult = validateRequiredFields(data);
    result.steps.push(fieldsResult);

    if (!fieldsResult.passed) {
        result.passed = false;
        result.errors.push(...fieldsResult.errors);
        result.warnings.push(...fieldsResult.warnings);
        return result; // Cannot continue without required fields
    }

    // Step 3: Data Types
    const typesResult = validateDataTypes(data);
    result.steps.push(typesResult);
    result.errors.push(...typesResult.errors);
    result.warnings.push(...typesResult.warnings);

    if (!typesResult.passed) {
        result.passed = false;
        return result;
    }

    // Step 4: Regex Patterns
    const regexResult = validateRegexPatterns(data);
    result.steps.push(regexResult);
    result.errors.push(...regexResult.errors);
    result.warnings.push(...regexResult.warnings);

    if (!regexResult.passed) {
        result.passed = false;
        return result;
    }

    // Step 5: Business Rules
    const rulesResult = validateBusinessRules(data);
    result.steps.push(rulesResult);
    result.errors.push(...rulesResult.errors);
    result.warnings.push(...rulesResult.warnings);

    if (!rulesResult.passed) {
        result.passed = false;
    }

    return result;
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatValidationResult(result: FullValidationResult): string {
    const lines: string[] = [];
    const icon = result.passed ? "✅" : "❌";

    lines.push(`\n${icon} ${result.filePath}`);
    lines.push("─".repeat(60));

    // Show step results
    for (const step of result.steps) {
        const stepIcon = step.passed ? "✓" : "✗";
        lines.push(`  ${stepIcon} Step: ${step.step}`);
    }

    // Show errors
    if (result.errors.length > 0) {
        lines.push("\n  ERRORS:");
        for (const error of result.errors) {
            lines.push(`    ❌ [${error.field}] ${error.message}`);
            lines.push(`       → How to fix: ${error.howToFix}`);
        }
    }

    // Show warnings
    if (result.warnings.length > 0) {
        lines.push("\n  WARNINGS:");
        for (const warning of result.warnings) {
            lines.push(`    ⚠️  [${warning.field}] ${warning.message}`);
        }
    }

    if (result.passed && result.errors.length === 0) {
        lines.push("\n  All validations passed! ✨");
    }

    return lines.join("\n");
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
    const args = Deno.args;

    if (args.length === 0) {
        console.log("Usage: deno run --allow-read scripts/validate-indicators.ts <file1.yaml> [file2.yaml ...]");
        console.log("\nYou can also pass a JSON array via FILES_JSON environment variable.");
        Deno.exit(1);
    }

    // Support for passing files as JSON (for GitHub Actions)
    let files: string[] = args;
    const filesJson = Deno.env.get("FILES_JSON");
    if (filesJson) {
        try {
            files = JSON.parse(filesJson);
        } catch {
            console.log("Error parsing FILES_JSON environment variable");
            Deno.exit(1);
        }
    }

    console.log("╔══════════════════════════════════════════════════════════════╗");
    console.log("║           INDICATOR VALIDATION PIPELINE                      ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log(`\nValidating ${files.length} file(s)...\n`);

    const results: FullValidationResult[] = [];
    let hasFailures = false;

    for (const file of files) {
        if (!file || file.trim().length === 0) continue;

        const result = await runAllValidations(file);
        results.push(result);

        console.log(formatValidationResult(result));

        if (!result.passed) {
            hasFailures = true;
        }
    }

    // Summary
    console.log("\n" + "═".repeat(60));
    console.log("VALIDATION SUMMARY");
    console.log("═".repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    console.log(`  Total files:    ${results.length}`);
    console.log(`  ✅ Passed:      ${passed}`);
    console.log(`  ❌ Failed:      ${failed}`);
    console.log(`  ⚠️  Warnings:   ${totalWarnings}`);

    if (hasFailures) {
        console.log("\n❌ VALIDATION FAILED - Pipeline will not continue");
        console.log("   Fix the errors above and try again.\n");

        // Output for GitHub Actions
        const output = Deno.env.get("GITHUB_OUTPUT");
        if (output) {
            const outputContent = `validation_passed=false\nfailed_count=${failed}\nerror_summary=${results.filter(r => !r.passed).map(r => r.filePath).join(", ")}`;
            await Deno.writeTextFile(output, outputContent, { append: true });
        }

        Deno.exit(1);
    }

    console.log("\n✅ ALL VALIDATIONS PASSED\n");

    // Output for GitHub Actions
    const output = Deno.env.get("GITHUB_OUTPUT");
    if (output) {
        await Deno.writeTextFile(output, "validation_passed=true\nfailed_count=0\n", { append: true });
    }

    Deno.exit(0);
}

main();
