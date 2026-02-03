import sys
import traceback

try:
    print("Attempting to import RAGService...")
    from rag_service import RAGService
    print("Import successful. Initializing RAGService...")
    rag = RAGService()
    print("Initialization successful.")
except Exception:
    print("Error occurred:")
    traceback.print_exc()
