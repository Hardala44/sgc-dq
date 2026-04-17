import requests
import json

WF_ID = "7N4DDfLPborcHX4b"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmJmNmNjMC1jZWI1LTRhMTktYTBiYi1lZTJhYTlhYTRmZmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDAzMDlmM2UtNmVmOS00ZGQ4LWE3MjMtZmQzNDg2ZTg0MWM0IiwiaWF0IjoxNzc2Mjc1NzI0fQ.CpH2g434SZ4ant7T6WoVHfEoaKPhDbaHbM5BcMLc3Vo"
BASE_URL = f"http://localhost:5678/api/v1/workflows/{WF_ID}"

headers = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

# Use JS child_process to call python3 directly - avoids the Python runner entirely
js_code = """const { execSync } = require('child_process');

// Use absolute path to the poetry venv python binary where modules are installed
const pythonPath = '/opt/poetryvenv/bin/python';
const cmd = `${pythonPath} /dq_crawler.py --api-url http://host.docker.internal:8000/api/ingesta-productos/ --api-key dq-ingesta-dev-key-change-me-in-production --limit 50`;

const output = execSync(
  cmd,
  { cwd: '/', timeout: 300000 }
).toString();

return [{ json: { output, status: 'ok' } }];"""

res = requests.get(BASE_URL, headers=headers)
wf = res.json()

for node in wf['nodes']:
    if node['id'] == 'exec-cmd-dq':
        node['type'] = 'n8n-nodes-base.code'
        node['typeVersion'] = 2
        node['parameters'] = {
            "language": "javaScript",
            "jsCode": js_code
        }
        print("Node updated to JavaScript child_process mode")
        break

payload = {
    "name": wf['name'],
    "nodes": wf['nodes'],
    "connections": wf['connections'],
    "settings": {
        "saveManualExecutions": True,
        "saveDataErrorExecution": "all",
        "saveDataSuccessExecution": "all",
        "executionOrder": "v1"
    }
}

res = requests.put(BASE_URL, headers=headers, json=payload)
if res.status_code == 200:
    print("Success! Workflow now uses JavaScript child_process to call python3.")
else:
    print(f"Error: {res.status_code} - {res.text}")
