#!/usr/bin/env python3
"""Test the /detonate sandbox execution endpoint"""
import requests
import json

url = "http://localhost:8081/detonate"
headers = {
    "Content-Type": "application/json",
    "X-Api-Key": "dev-local-key-12345"
}

# Test with an obfuscated command - it will be executed and we capture output
# pegar log do comando, e não o output do comando em si.
#1 microsoft defender
#2 EXECUTAR O COMANDO E VER O LOG
#4104
command = r'''( nEW-ObJeCt sYsTem.Io.COMPression.DeFlATestreAM([IO.MEMorySTREaM] [sYsteM.ConveRT]::fROmbaSE64String(’83SN0FBQ8Est1/VPykpNLgEyS/TCU5OcczJT
80oUNPVc8svzcvITU4JLijLz0jXsM0pKCqz09cvLy/VSUnPz9XLykxNz9JMrkxJT9AqKDe01AQ==’) ,[io.cOmpresSioN.cOMpREssionMODE]::DECoMPress) |fOrEACH-OBJECt { nEW-ObJeCt iO.StREamreAder($_, [tExt.ENcoDIng]::Ascii ) } |FoREach-ObjeCT { $_.REaDToenD()} )'''

payload = {"command": command, "timeout": 10}


print(f"Command:\n{command[:200]}...")
print()

try:
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    result = response.json()
    

    
    if result.get("success"):
        r = result.get("result", {})
        for line in r.get("output", []):
            print(f"  {line}")

        
        for sb in r.get("scriptblocks_logged", []):
            print(f"  {sb[:100]}...")
        
        if r.get("errors"):
            for err in r.get("errors", []):
                print(f"  {err}")
            
        if r.get("timed_out"):
            print("EXECUTION TIMED OUT")
            
        print(f"{result.get('warning', 'Code was executed')}")
    else:
        print("Error:", result.get("error"))
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
