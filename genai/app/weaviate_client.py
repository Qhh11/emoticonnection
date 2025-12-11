import os
import weaviate
from weaviate.auth import Auth
from weaviate.client import WeaviateClient
from typing import List, Dict, Any, Optional
from weaviate.classes.query import MetadataQuery 

class WeaviateManager:
    """
    A generic manager class to encapsulate Weaviate client connection, 
    data ingestion, and vector search operations.
    """
    def __init__(self):
        """Initializes the Weaviate client and performs a connection check."""
        self.client: Optional[WeaviateClient] = self._connect_client()

    def _connect_client(self) -> Optional[WeaviateClient]:
        """
        Internal method: Connects to the Weaviate cluster using environment variables.
        Gracefully handles missing configuration.
        """
        WEAVIATE_URL = os.getenv("WEAVIATE_URL")
        WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY")

        if not WEAVIATE_URL or not WEAVIATE_API_KEY:
            print("❌ Error: Missing WEAVIATE_URL or WEAVIATE_API_KEY environment variables. Weaviate features are disabled.")
            return None

        try:
            # Connect to Weaviate Cloud (or self-hosted using connect_to_local)
            client = weaviate.connect_to_weaviate_cloud(
                cluster_url=WEAVIATE_URL,
                auth_credentials=Auth.api_key(WEAVIATE_API_KEY),
                skip_init_checks=True,
            )
            # Use client.is_ready() for a better connection check if desired
            print("✅ Weaviate client successfully connected!")
            return client
        except Exception as e:
            print(f"❌ Weaviate connection failed: {e}")
            return None

    def close(self):
        """Closes the client connection. Recommended for application cleanup."""
        if self.client:
            self.client.close()
            print("🚪 Weaviate client connection closed.")

    # --- Write Interface (Generic Ingestion) ---

    def write_data(self, collection_name: str, data: List[Dict[str, Any]]) -> bool:
        """
        Generic ingestion interface: Writes a batch of data objects to the specified Collection.

        It supports pre-vectorized data: if an item contains a 'vector' key, 
        that vector is used; otherwise, Weaviate's configured vectorizer computes it.

        Args:
            collection_name: The name of the target Collection (Schema).
            data: A list of dictionaries containing properties and an optional 'vector'.
                  Example: [{'title': '...', 'content': '...', 'vector': [...]}, ...]
        Returns:
            bool: True if the batch write operation completed (even with some errors), False if connection failed.
        """
        if not self.client:
            return False

        try:
            collection = self.client.collections.get(collection_name)
        except Exception:
            # Handle case where collection might not exist
            print(f"❌ Collection '{collection_name}' not found.")
            return False
        
        try:
            # Using sequential_writer for efficient batching of data
            with collection.batch.sequential_writer() as batch_writer:
                for item in data:
                    # Pop vector from the data item to pass it separately
                    vector = item.pop("vector", None)
                    # Insert the object
                    batch_writer.insert(properties=item, vector=vector)
            
            # Check for batch errors (optional, but good practice)
            if collection.batch.num_errors > 0:
                print(f"⚠️ Write operation completed with {collection.batch.num_errors} errors.")
            return True
        except Exception as e:
            print(f"❌ Failed to write data to Weaviate: {e}")
            return False

    # --- Read Interface (Generic Vector Search) ---

    def hybrid_search(
        self,
        collection_name: str,
        query: str,
        limit: int = 5,
        alpha: float = 0.5, # Controls the weight between vector (1.0) and BM25 (0.0) search
    ) -> List[Dict[str, Any]]:
        """
        Generic retrieval interface: Executes a Hybrid Search (vector + keyword).
        This is typically the most robust retrieval method for RAG applications.

        Args:
            collection_name: The name of the target Collection.
            query: The user's input query or text prompt.
            limit: The maximum number of results to return.
            alpha: Hybrid search weight (1.0 = pure vector search, 0.0 = pure BM25 keyword search).

        Returns:
            List[Dict[str, Any]]: A list of search results, including properties and the relevance score.
        """
        if not self.client:
            return []

        try:
            collection = self.client.collections.get(collection_name)
        except Exception:
            print(f"❌ Collection '{collection_name}' not found for searching.")
            return []
        
        try:
            # Execute the Hybrid search
            response = collection.query.hybrid(
                query=query,
                alpha=alpha,
                limit=limit,
                # Ensure all object properties are returned
                return_properties=collection.config.get().properties, 
                # Return metadata, including the score (fusion score for hybrid)
                return_metadata=MetadataQuery(score=True), 
            )

            # Format the results into a list of accessible dictionaries
            results = []
            for item in response.objects:
                result_item = item.properties.copy()
                # Add the relevance score for downstream filtering/ranking
                result_item["score"] = item.metadata.score
                results.append(result_item)
            
            return results

        except Exception as e:
            print(f"❌ Weaviate search failed: {e}")
            return []