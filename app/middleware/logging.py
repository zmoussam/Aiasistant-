
import logging
import sys
from datetime import datetime
from flask import request, g
import uuid

def setup_logging(app):
    """Setup professional logging configuration"""
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    
    # File handler for errors
    file_handler = logging.FileHandler('logs/app.log')
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.ERROR)
    
    # Configure app logger
    app.logger.addHandler(console_handler)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    
    return app.logger

def log_request():
    """Log incoming requests"""
    g.start_time = datetime.utcnow()
    g.request_id = str(uuid.uuid4())[:8]
    
    logging.info(f"[{g.request_id}] {request.method} {request.path} - IP: {request.remote_addr}")

def log_response(response):
    """Log outgoing responses"""
    duration = datetime.utcnow() - g.start_time
    
    logging.info(f"[{g.request_id}] Response: {response.status_code} - Duration: {duration.total_seconds():.3f}s")
    
    if response.status_code >= 400:
        logging.error(f"[{g.request_id}] Error response: {response.status_code}")
    
    return response
