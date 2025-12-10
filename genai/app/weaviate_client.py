import os
import weaviate
from weaviate.auth import Auth


def get_weaviate_client():
    WEAVIATE_URL = os.getenv("WEAVIATE_URL")  
    WEAVIATE_API_KEY = os.getenv("WEAVIATE_API_KEY")

    client = weaviate.connect_to_weaviate_cloud(
        cluster_url=WEAVIATE_URL,
        auth_credentials=Auth.api_key(WEAVIATE_API_KEY),
        skip_init_checks=True,
    )
    return client