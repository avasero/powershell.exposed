#!/usr/bin/env python3
import requests
import json

url = "http://localhost:8081/deobfuscate"
headers = {
    "Content-Type": "application/json",
    "X-Api-Key": "dev-local-key-12345"
}

# The obfuscated command
command = r'''$mRSp73  =  [ChaR[] ]" ))43]raHc[]gNIRtS[,)38]raHc[+98]raHc[+611]raHc[((eCAlper.)421]raHc[]gNIRtS[,'5IP'(eCAlper.)'$',)09]raHc[+99]raHc[+701]raHc[((eCAlper.)93]raHc[]gNIRtS[,'vzW'(eCAlper.)'


2halB.tcejboZck tuptuO-etirW

7halB.tcejboZck +'+' 6halB.tcejboZck + halB.tc'+'ejboZck '+'= 2galFFT'+'C:'+'vneZck

SYt!eciNSYt = 1galFFTC:vneZck

SYt...aedi dab yre'+'v'+' ,yre'+'v a yllacipyt svzWtaht ,ton fI .ti gninnur erofeb siht detacsufbo-ed uoy epoh ISYt eulaV- 2halB emaN- '+'ytreporPetoN epy'+'TrebmeM- rebmeM-ddA 5IP tcejboZck

SYt'+'.uoy tresed dna dnuora nur annog reveNSYt eulaV- 9hal'+'B emaN- ytreporPetoN epyTrebmeM- rebmeM-ddA 5'+'IP tcejboZck

SYt.nwod uo'+'y tel annog '+'re'+'veN .'+'pu uoy evig annog reveNSYt eulaV- 8halB emaN- ytreporPetoN epyTrebm'+'eM- rebmeM-d'+'dA 5IP tcejboZck

SYt}f1j9kdSYt eulaV- 7halB emaN- y'+'treporPetoN ep'+'yTrebmeM- rebmeM-ddA 5IP tcejboZck

SYtg4lf_3ht_t0nSYt eulaV- 4halB emaN- yt'+'reporPetoN epyTrebmeM- rebmeM-ddA 5IP tcejboZck

SYt1#f!J{SYt eulaV- 6halB emaN- ytreporPetoN epyTrebmeM- rebmeM-'+'ddA 5IP tcejboZck

SYtgalF,ehT,toN,oslASYt eulaV- 5halB emaN- ytreporPetoN epyTrebmeM- rebmeM-ddA 5IP tcejboZck

SY'+'t}fdjfkslfdSYt eulaV- 3halB emaN- ytrepor'+'PetoN e'+'pyTrebmeM- rebmeM-ddA 5IP tcejboZ'+'ck

SYtgalfSYt eulaV- halB em'+'aN- ytreporPetoN e'+'pyTrebmeM- rebmeM-ddA 5IP tcej'+'boZck

tc'+'ejbO'+'SP tcejbO-weN = tc'+'ejboZck'( ()''nioJ-'x'+]3,1[)eCNERefErpESoBreV$]GniRTS[( (. " ;[aRRAy]::REVerse($MrSp73);. ( 'IeX') ( -JoiN$MrSp73)'''
payload = {"command": command}

try:
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    result = response.json()
    
    print("=== SUCCESS ===" if result.get("success") else "=== FAILED ===")
    print()
    
    if result.get("success"):
        print("=== DEOBFUSCATED ===")
        print(result["result"]["deobfuscated"])
        print()
        print("=== TECHNIQUES FOUND ===")
        print(result["result"].get("techniques_found", []))
        print()
        print("=== TRANSFORMATIONS ===")
        for t in result["result"].get("transformations", [])[:3]:
            print(f"  - {t['technique']}: {t.get('after', '')[:100]}...")
    else:
        print("Error:", result.get("error"))
        
except Exception as e:
    print(f"Error: {e}")
    print(f"Response: {response.text if 'response' in dir() else 'N/A'}")
