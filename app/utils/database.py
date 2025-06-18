from supabase import create_client, Client
from app.config import Config
import logging
import os  # Import the os module

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.client = None
        self._connect()

    def _connect(self):
        try:
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_KEY')

            if not supabase_url or not supabase_key:
                logger.error("Supabase URL or Key not provided in environment variables.")
                self.client = None  # Ensure client is None if connection fails
                return

            self.client = create_client(supabase_url, supabase_key)
            logger.info("Supabase client created successfully")

        except Exception as e:
            logger.error(f"Failed to create Supabase client: {e}")
            self.client = None  # Ensure client is None if connection fails

    def get_client(self) -> Client:
        if not self.client:
            self._connect()
        return self.client

    def health_check(self) -> bool:
        try:
            if not self.client:
                logger.warning("Supabase client is not initialized. Cannot perform health check.")
                return False

            # Try a simple query to check connection
            result = self.client.table("users").select("id").limit(1).execute()
            if result and result.data:
                logger.info("Database health check successful.")
                return True
            else:
                logger.warning("Database health check query returned no data.")
                return False
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False

# Global database instance
db = Database()