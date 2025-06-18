
from flask import request, jsonify
from functools import wraps
import time
from collections import defaultdict, deque

class RateLimiter:
    def __init__(self):
        self.requests = defaultdict(deque)
    
    def is_allowed(self, key, limit, window):
        """Check if request is allowed based on rate limit"""
        now = time.time()
        
        # Remove old requests outside the window
        while self.requests[key] and self.requests[key][0] <= now - window:
            self.requests[key].popleft()
        
        # Check if limit exceeded
        if len(self.requests[key]) >= limit:
            return False
        
        # Add current request
        self.requests[key].append(now)
        return True

rate_limiter = RateLimiter()

def rate_limit(limit=100, window=3600, per='ip'):
    """Rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if per == 'ip':
                key = request.remote_addr
            elif per == 'user':
                key = getattr(request, 'current_user', {}).get('user_id', request.remote_addr)
            else:
                key = request.remote_addr
            
            if not rate_limiter.is_allowed(key, limit, window):
                return jsonify({
                    'error': 'Rate limit exceeded',
                    'limit': limit,
                    'window': window
                }), 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
