import sys
import os
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from main import app

client = TestClient(app)

def test_questions():
    questions = [
        "hi",
        "what about the today sale",
        "who is vijay",
        "how many bending orders is there"
    ]
    
    for q in questions:
        print(f"\nUser: {q}")
        try:
            response = client.post("/api/admin/chat", json={"message": q})
            print(f"Status Code: {response.status_code}")
            if response.status_code == 200:
                print(f"AI: {response.json().get('response')}")
                print(f"Generated SQL: {response.json().get('query_generated')}")
            else:
                print(f"Error Details: {response.text}")
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    test_questions()
