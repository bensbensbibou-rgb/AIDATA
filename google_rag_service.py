import os
import json
import base64
from typing import List, Tuple, Dict, Any
import httpx


class GoogleRAGService:
    """
    Minimal wrapper around Gemini File API for upload/list/search.
    Stores file metadata locally (JSON) to reference in searches.
    """

    def __init__(self, api_key: str | None = None, storage_path: str = "./data/gemini_files.json"):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY is required for GoogleRAGService")

        self.storage_path = storage_path
        data = self._load_files()
        self._files: list[dict[str, Any]] = data.get("files", [])
        self._store_name: str | None = data.get("store_name")

    def _load_files(self):
        try:
            if os.path.exists(self.storage_path):
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    return json.load(f)
        except Exception:
            pass
        return {"files": [], "store_name": None}

    def _save_files(self):
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump({"files": self._files, "store_name": self._store_name}, f, ensure_ascii=False, indent=2)

    def _ensure_store(self):
        """
        Create a File Search store once and persist its name.
        """
        if self._store_name:
            return self._store_name
        url = f"https://generativelanguage.googleapis.com/v1beta/fileSearchStores?key={self.api_key}"
        payload = {"displayName": "default-gemini-store"}
        resp = httpx.post(url, json=payload, timeout=30)
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Failed to create file search store: {resp.text}")
        data = resp.json()
        name = data.get("name")
        if not name:
            raise RuntimeError(f"file search store missing name: {data}")
        self._store_name = name
        self._save_files()
        return name

    def list_documents(self) -> List[str]:
        return [f.get("display_name") or f.get("name") or f.get("id", "unknown") for f in self._files]

    def add_document(self, file_content: bytes, filename: str) -> Tuple[bool, str]:
        """
        Uploads a file to Gemini File API and stores metadata locally.
        """
        # 1) Upload raw file via Files API
        upload_url = f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={self.api_key}&uploadType=application/octet-stream"
        headers = {
            "Content-Type": "application/octet-stream",
            "X-Goog-Upload-File-Name": filename,
            "X-Goog-Upload-Protocol": "raw",
        }
        try:
            resp = httpx.post(upload_url, content=file_content, headers=headers, timeout=60)
            if resp.status_code != 200:
                return False, f"Upload failed ({resp.status_code}): {resp.text}"
            data = resp.json()
            file_id = data.get("name") or data.get("file") or data.get("id")
            if not file_id:
                return False, f"Upload response missing file id: {data}"
            meta = {
                "id": file_id,
                "display_name": filename,
                "mimeType": data.get("mimeType"),
                "uri": data.get("uri") or file_id,
            }
            # avoid duplicates
            self._files = [f for f in self._files if f.get("id") != file_id]
            self._files.append(meta)
            # 2) Ensure store exists
            store_name = self._ensure_store()
            # 3) Import uploaded file into store (chunks+embed)
            import_url = f"https://generativelanguage.googleapis.com/v1beta/{store_name}:importFile?key={self.api_key}"
            import_payload = {"fileName": file_id}
            imp = httpx.post(import_url, json=import_payload, timeout=60)
            if imp.status_code not in (200, 201):
                return False, f"Import failed ({imp.status_code}): {imp.text}"
            self._save_files()
            return True, f"Uploaded+imported into store: {filename}"
        except Exception as e:
            return False, str(e)

    def search(self, query: str, n_results: int = 3) -> List[str]:
        """
        Calls Gemini with fileData references and returns text snippets.
        """
        if not self._files:
            return []
        try:
            store_name = self._ensure_store()
        except Exception:
            return []

        model = "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"

        payload = {
            "contents": [{"parts": [{"text": query}]}],
            "tools": [
                {
                    "fileSearch": {
                        "fileSearchStoreNames": [store_name]
                    }
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 512,
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
                if isinstance(p, dict):
                    if "text" in p:
                        texts.append(str(p["text"]))
                    elif "inlineData" in p and isinstance(p["inlineData"], dict):
                        txt = p["inlineData"].get("data")
                        if txt:
                            try:
                                decoded = base64.b64decode(txt).decode("utf-8", errors="ignore")
                                texts.append(decoded)
                            except Exception:
                                pass
            return texts[:n_results] if texts else []
        except Exception:
            return []
