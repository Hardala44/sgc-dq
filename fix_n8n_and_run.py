import requests
import json

URL = "http://localhost:5678/api/v1/workflows/7N4DDfLPborcHX4b"
ACTIVATE_URL = "http://localhost:5678/api/v1/workflows/7N4DDfLPborcHX4b/activate"
EXECUTE_URL = "http://localhost:5678/api/v1/workflows/7N4DDfLPborcHX4b/execute"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNmJmNmNjMC1jZWI1LTRhMTktYTBiYi1lZTJhYTlhYTRmZmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMDAzMDlmM2UtNmVmOS00ZGQ4LWE3MjMtZmQzNDg2ZTg0MWM0IiwiaWF0IjoxNzc2Mjc1NzI0fQ.CpH2g434SZ4ant7T6WoVHfEoaKPhDbaHbM5BcMLc3Vo"

headers = {
    "X-N8N-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

def fix_and_trigger():
    # 1. Get workflow
    print("Fetching workflow...")
    res = requests.get(URL, headers=headers)
    if res.status_code != 200:
        print(f"Error fetching workflow: {res.text}")
        return

    wf = res.json()
    
    # 2. Update nodes
    print("Updating node command...")
    found = False
    for node in wf['nodes']:
        if node['id'] == 'exec-cmd-dq':
            node['parameters']['command'] = 'python3 /dq_crawler.py --api-url http://host.docker.internal:8000/api/ingesta-productos/ --api-key dq-ingesta-dev-key-change-me-in-production --limit 50'
            found = True
            break
    
    if not found:
        print("Could not find node 'exec-cmd-dq' in workflow.")
        return

    # 3. Save workflow
    print("Saving updated workflow...")
    # PUT requires nodes, connections and name
    update_data = {
        "name": wf['name'],
        "nodes": wf['nodes'],
        "connections": wf['connections'],
        "settings": wf['settings']
    }
    res = requests.put(URL, headers=headers, json=update_data)
    if res.status_code != 200:
        print(f"Error updating workflow: {res.text}")
        return

    # 4. Trigger workflow
    print("Triggering workflow execution...")
    # To execute, we can't 'trigger' via API easily if it's a schedule, 
    # but we can call the test endpoint if we want immediate result
    # or just activate it.
    # Actually, n8n has a POST /workflows/:id/execute but it's for manual execution simulation
    res = requests.post(EXECUTE_URL, headers=headers)
    if res.status_code != 200:
        print(f"Error triggering workflow: {res.text}")
        return

    print("Success! Workflow triggered.")
    print(res.json())

if __name__ == "__main__":
    fix_and_trigger()
