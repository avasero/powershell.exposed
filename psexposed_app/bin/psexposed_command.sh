#!/bin/bash
export LD_LIBRARY_PATH=/opt/splunk/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}
exec /opt/splunk/bin/python3 "$(dirname "$0")/psexposed_command.py" "$@"
