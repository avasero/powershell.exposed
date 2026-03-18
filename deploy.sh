#!/bin/bash
set -e

APP_SRC="/home/en20/powershell.exposed/psexposed_app"
APP_DST="/opt/splunk/etc/apps/psexposed_app"

echo "=== Removing old deployed app ==="
sudo rm -rf "$APP_DST"

echo "=== Copying fresh app ==="
sudo cp -r "$APP_SRC" "$APP_DST"

echo "=== Setting permissions ==="
sudo chown -R splunk:splunk "$APP_DST" 2>/dev/null || sudo chown -R root:root "$APP_DST"
sudo chmod +x "$APP_DST/bin/psexposed_command.sh"

echo "=== Verifying deployment ==="
echo "commands.conf:"
cat "$APP_DST/default/commands.conf"
echo ""
echo "Shell wrapper exists:"
ls -la "$APP_DST/bin/psexposed_command.sh"
echo ""
echo "setup.xml references:"
head -1 "$APP_DST/default/data/ui/views/setup.xml"

echo ""
echo "=== Restarting Splunk ==="
sudo /opt/splunk/bin/splunk restart --run-as-root

echo "=== Done ==="
