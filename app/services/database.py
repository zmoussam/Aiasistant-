
import os
import logging
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    business_name = Column(String(255))
    phone = Column(String(50))
    business_type = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class Subscription(Base):
    __tablename__ = 'subscriptions'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    plan_type = Column(String(50), nullable=False)
    status = Column(String(50), default='active')
    stripe_subscription_id = Column(String(255))
    stripe_customer_id = Column(String(255))
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Conversation(Base):
    __tablename__ = 'conversations'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False)
    channel = Column(String(50), nullable=False)  # whatsapp, telegram, email, etc.
    customer_identifier = Column(String(255))  # phone, email, username
    message_content = Column(Text)
    response_content = Column(Text)
    status = Column(String(50), default='pending')
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime)

class DatabaseManager:
    def __init__(self, database_url=None):
        self.database_url = database_url or os.environ.get('DATABASE_URL', 'sqlite:///app.db')
        self.engine = None
        self.SessionLocal = None
        
    def init_db(self):
        """Initialize database connection"""
        try:
            self.engine = create_engine(self.database_url)
            self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
            
            # Create tables
            Base.metadata.create_all(bind=self.engine)
            logging.info("Database initialized successfully")
            
        except Exception as e:
            logging.error(f"Database initialization failed: {e}")
            raise
    
    def get_session(self):
        """Get database session"""
        if not self.SessionLocal:
            self.init_db()
        return self.SessionLocal()
    
    def health_check(self):
        """Check database health"""
        try:
            session = self.get_session()
            session.execute("SELECT 1")
            session.close()
            return True
        except Exception as e:
            logging.error(f"Database health check failed: {e}")
            return False

# Global database instance
db_manager = DatabaseManager()
