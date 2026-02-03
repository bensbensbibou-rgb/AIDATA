import os
import json
import time
from typing import List, Optional, Tuple

import httpx


class GoogleFileSearchService:
    """
    RAG backend using Gemini File Search (uploadToFileSearchStore + tool_config).
    - Maintains a single File Search store (persisted locally in a json file).
    - Supports upload, list, search.
    """

    def __init__(self, api_key: Optional[str] = None, storage_path: str = "./data/gemini_store.json"):
        self.api_key = (api_key or os.getenv("GEMINI_API_KEY", "")).strip()
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is required for GoogleFileSearchService")

        self.storage_path = storage_path
        self.base_url = "https://generativelanguage.googleapis.com"
        self.store_name = self._load_store_name()
        if not self.store_name:
            self.store_name = self._create_store(display_name="dashboard-file-search-store")
            self._save_store_name(self.store_name)

    # --- persistence helpers ---
    def _load_store_name(self) -> Optional[str]:
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("store_name")
        except Exception:
            return None
        return None

    def _save_store_name(self, name: str):
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump({"store_name": name}, f, ensure_ascii=False, indent=2)

    # --- core API calls ---
    def _create_store(self, display_name: str = "file-search-store") -> str:
        url = f"{self.base_url}/v1beta/fileSearchStores?key={self.api_key}"
        payload = {"display_name": display_name}
        resp = httpx.post(url, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        name = data.get("name")
        if not name:
            raise RuntimeError(f"Failed to create store: {data}")
        return name

    def _poll_operation(self, operation: dict, max_wait_s: int = 60, step_s: int = 2) -> dict:
        name = operation.get("name")
        if not name:
            return operation
        url = f"{self.base_url}/v1beta/operations/{name}?key={self.api_key}"
        waited = 0
        while waited < max_wait_s:
            if operation.get("done"):
                return operation
            time.sleep(step_s)
            waited += step_s
            try:
                op_resp = httpx.get(url, timeout=15)
                if op_resp.status_code == 200:
                    operation = op_resp.json()
                else:
                    break
            except Exception:
                break
        return operation

    # --- public methods ---
    def add_document(self, file_content: bytes, filename: str) -> Tuple[bool, str]:
        """
        Upload and import into File Search store.
        """
        if not self.store_name:
            return False, "Store not initialized"

        url = f"{self.base_url}/v1beta/{self.store_name}:uploadToFileSearchStore?key={self.api_key}"
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Goog-Upload-File-Name": filename,
            "X-Goog-Upload-Protocol": "raw",
        }
        try:
            resp = httpx.post(url, content=file_content, headers=headers, timeout=60)
            if resp.status_code != 200:
                return False, f"Upload failed ({resp.status_code}): {resp.text}"
            op = resp.json()
            op = self._poll_operation(op)
            if not op.get("done"):
                return False, "Upload operation not completed"
            return True, f"Uploaded to FileSearch store: {filename}"
        except Exception as e:
            return False, str(e)

    def list_documents(self) -> List[str]:
        """
        File Search store doesn't have a simple list of imported files;
        we rely on local knowledge: not available. Return placeholder.
        """
        return ["FileSearchStore: " + (self.store_name or "unknown")]

    def search(self, query: str, n_results: int = 3) -> List[str]:
        """
        Call generateContent with file_search tool pointing to the store.
        """
        if not self.store_name:
            return []
        model = "gemini-3-pro-preview"
        url = f"{self.base_url}/v1beta/models/{model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [
                {"parts": [{"text": query}]}
            ],
            "tools": [
                {"file_search": {}}
            ],
            "tool_config": {
                "file_search": {
                    "file_search_store_names": [self.store_name]
                }
            },
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 512
            }
        }
        try:
            resp = httpx.post(url, json=payload, timeout=60)
            if resp.status_code != 200:
                return []
            data = resp.json()
            cands = data.get("candidates") or []
            if not cands:
                return []
            first = cands[0]
            parts = first.get("content", {}).get("parts", []) if isinstance(first.get("content"), dict) else first.get("content", [])
            texts = []
            for p in parts:
                if isinstance(p, dict) and "text" in p:
                    texts.append(str(p["text"]))
            return texts[:n_results] if texts else []
        except Exception:
            return []
