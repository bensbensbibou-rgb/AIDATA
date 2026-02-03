import os
import chromadb
from chromadb.utils import embedding_functions
from sentence_transformers import SentenceTransformer
import pypdf
import io

class RAGService:
    def __init__(self, persistence_path="./data/chroma_db"):
        self.persistence_path = persistence_path
        if not os.path.exists(persistence_path):
            os.makedirs(persistence_path)
        
        # Initialize Chroma Client
        self.client = chromadb.PersistentClient(path=persistence_path)
        
        # Use a local embedding model
        # We use a lightweight model for speed
        self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="knowledge_base",
            embedding_function=self.embedding_function
        )

    def extract_text_from_file(self, file_content: bytes, filename: str) -> str:
        """Extracts text from PDF or TXT files."""
        text = ""
        if filename.lower().endswith('.pdf'):
            try:
                pdf_reader = pypdf.PdfReader(io.BytesIO(file_content))
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
            except Exception as e:
                print(f"Error reading PDF {filename}: {e}")
                return ""
        else:
            # Assume text based
            try:
                text = file_content.decode('utf-8', errors='ignore')
            except Exception as e:
                print(f"Error reading text file {filename}: {e}")
                return ""
        return text

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 100) -> list[str]:
        """Simple chunking strategy."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap
        return chunks

    def add_document(self, file_content: bytes, filename: str):
        """Processes a file and adds it to the vector store."""
        text = self.extract_text_from_file(file_content, filename)
        if not text.strip():
            return False, "No text extracted"

        chunks = self.chunk_text(text)
        if not chunks:
            return False, "No chunks created"

        # Prepare data for Chroma
        ids = [f"{filename}_{i}" for i in range(len(chunks))]
        metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]
        
        try:
            self.collection.add(
                documents=chunks,
                metadatas=metadatas,
                ids=ids
            )
            return True, f"Added {len(chunks)} chunks from {filename}"
        except Exception as e:
            return False, str(e)

    def search(self, query: str, n_results: int = 3) -> list[str]:
        """Searches the vector store for relevant chunks."""
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            # results['documents'] is a list of lists (one list per query)
            if results['documents']:
                return results['documents'][0]
            return []
        except Exception as e:
            print(f"Search error: {e}")
            return []

    def list_documents(self) -> list[str]:
        """Returns a list of unique document filenames."""
        try:
            # Fetch all metadata to find unique sources
            # For larger datasets, we should maintain a separate index of files.
            result = self.collection.get(include=["metadatas"])
            metadatas = result.get("metadatas", [])
            if not metadatas:
                return []
            
            unique_sources = set()
            for m in metadatas:
                if m and "source" in m:
                    unique_sources.add(m["source"])
            return list(unique_sources)
        except Exception as e:
            print(f"Error listing documents: {e}")
            return []

    def get_all_documents(self):
        """Returns a list of unique document sources."""
        # This is efficient only for small datasets. For large ones, we'd need a separate metadata store.
        try:
            # Peek to get some items, but to get ALL sources we might need to scan.
            # Chroma doesn't have a direct 'list unique metadata' query efficiently yet.
            # We'll just return a count for now or implement a separate tracker if needed.
            return self.collection.count()
        except:
            return 0
