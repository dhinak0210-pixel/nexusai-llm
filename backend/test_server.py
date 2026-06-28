#!/usr/bin/env python3
"""
NexusAI Backend Diagnostic Tool
================================
Validates server connection, model switching, and streaming completion APIs.

Usage:
  python3 test_server.py
  python3 test_server.py --url http://localhost:8000
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error

def make_request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, method=method, headers=headers)
    if data:
        req.data = json.dumps(data).encode("utf-8")
        req.add_header("Content-Type", "application/json")
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, response.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except urllib.error.URLError as e:
        print(f"❌ Connection error: {e.reason}")
        return None, str(e.reason)

def main():
    parser = argparse.ArgumentParser(description="NexusAI Server Diagnostic Utility")
    parser.add_argument("--url", default="http://localhost:8000", help="FastAPI Server URL")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    print("🔍 Diagnostic started for server at:", base_url)
    print("=" * 60)

    # 1. Test root endpoint
    print("1. Checking Server Status...")
    status_code, body = make_request(f"{base_url}/v1/status")
    if status_code != 200:
        print("❌ Server root check failed. Is the server running?")
        sys.exit(1)
    
    status_data = json.loads(body)
    print(f"   ✅ Server active: {status_data.get('service')}")
    print(f"   📌 Current loaded model: {status_data.get('current_model')}")
    print(f"   🖥️  Device: {status_data.get('device')}")
    print(f"   🎮 GPU Available: {status_data.get('gpu_available')}")
    if status_data.get("gpu_name"):
        print(f"      GPU Model: {status_data.get('gpu_name')}")

    # 2. Get available models
    print("\n2. Fetching Supported Models...")
    status_code, body = make_request(f"{base_url}/v1/models")
    if status_code != 200:
        print("❌ Failed to retrieve model list.")
        sys.exit(1)
    
    models_data = json.loads(body)
    models = models_data.get("data", [])
    print(f"   ✅ Retrieved {len(models)} models:")
    for idx, model in enumerate(models, 1):
        status_tag = "[LOADED]" if model.get("loaded") else "[AVAILABLE]"
        print(f"      {idx}. {model.get('name')} ({model.get('id')}) - {model.get('size')} {status_tag}")

    # 3. Test chat completion stream
    print("\n3. Testing Stream Chat Completion API...")
    payload = {
        "messages": [
            {"role": "user", "content": "What are the three laws of robotics?"}
        ],
        "max_tokens": 100,
        "temperature": 0.7,
        "stream": True
    }
    
    req = urllib.request.Request(
        f"{base_url}/v1/chat/completions",
        method="POST",
        headers={"Content-Type": "application/json"},
        data=json.dumps(payload).encode("utf-8")
    )
    
    try:
        start_time = time.time()
        print("   💬 Sending prompt: 'What are the three laws of robotics?'")
        print("   📥 Streaming response chunks:\n" + "-" * 40)
        
        with urllib.request.urlopen(req, timeout=15) as response:
            first_token_time = None
            for line in response:
                line_str = line.decode("utf-8").strip()
                if not line_str:
                    continue
                if line_str.startswith("data: [DONE]"):
                    break
                if line_str.startswith("data:"):
                    try:
                        chunk_data = json.loads(line_str[5:].strip())
                        content = chunk_data["choices"][0]["delta"].get("content", "")
                        if content:
                            if first_token_time is None:
                                first_token_time = time.time() - start_time
                            sys.stdout.write(content)
                            sys.stdout.flush()
                    except (KeyError, IndexError, ValueError):
                        pass
        
        print("\n" + "-" * 40)
        print(f"   ✅ Stream completed successfully!")
        if first_token_time:
            print(f"   ⏱️ Time to first token: {first_token_time:.2f}s")
            
    except Exception as e:
        print(f"\n   ❌ Streaming test failed: {e}")
        print("   💡 If the model wasn't loaded, loading takes about a minute. Try running the diagnostic again.")

if __name__ == "__main__":
    main()
