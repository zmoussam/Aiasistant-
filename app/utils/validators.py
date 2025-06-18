
import re
from datetime import datetime, date
from typing import Optional

def validate_phone_number(phone: str) -> bool:
    """Valida formato de número telefónico"""
    if not phone:
        return False
    
    # Remove spaces, dashes, parentheses
    cleaned = re.sub(r'[\s\-\(\)]', '', phone)
    
    # Check if it's a valid Mexican phone number format
    # +52 followed by 10 digits or just 10 digits
    pattern = r'^(\+52)?[0-9]{10}$'
    return bool(re.match(pattern, cleaned))

def validate_email(email: str) -> bool:
    """Valida formato de email"""
    if not email:
        return False
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_appointment_date(appointment_date: str) -> bool:
    """Valida que la fecha de cita sea válida y futura"""
    try:
        date_obj = datetime.strptime(appointment_date, '%Y-%m-%d').date()
        return date_obj >= date.today()
    except ValueError:
        return False

def validate_appointment_time(appointment_time: str) -> bool:
    """Valida formato de hora (HH:MM)"""
    try:
        datetime.strptime(appointment_time, '%H:%M')
        return True
    except ValueError:
        return False

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Valida fortaleza de contraseña"""
    if len(password) < 8:
        return False, "La contraseña debe tener al menos 8 caracteres"
    
    if not re.search(r'[A-Z]', password):
        return False, "La contraseña debe contener al menos una letra mayúscula"
    
    if not re.search(r'[a-z]', password):
        return False, "La contraseña debe contener al menos una letra minúscula"
    
    if not re.search(r'\d', password):
        return False, "La contraseña debe contener al menos un número"
    
    return True, "Contraseña válida"

def sanitize_phone_number(phone: str) -> Optional[str]:
    """Limpia y formatea número telefónico"""
    if not phone:
        return None
    
    # Remove all non-digit characters except +
    cleaned = re.sub(r'[^\d+]', '', phone)
    
    # If starts with +52, keep it
    if cleaned.startswith('+52'):
        return cleaned
    
    # If starts with 52 (without +), add +
    if cleaned.startswith('52') and len(cleaned) == 12:
        return '+' + cleaned
    
    # If 10 digits, add +52
    if len(cleaned) == 10:
        return '+52' + cleaned
    
    return cleaned if cleaned else None

def validate_business_hours(start_time: str, end_time: str) -> bool:
    """Valida horarios de negocio"""
    try:
        start = datetime.strptime(start_time, '%H:%M').time()
        end = datetime.strptime(end_time, '%H:%M').time()
        return start < end
    except ValueError:
        return False
import re
from typing import Dict, Any, Optional

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_phone(phone: str) -> bool:
    """Validate phone number format"""
    pattern = r'^\+?[\d\s\-\(\)]{10,}$'
    return bool(re.match(pattern, phone))

def validate_password(password: str) -> Dict[str, Any]:
    """Validate password strength"""
    errors = []
    
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }

def sanitize_input(data: str) -> str:
    """Sanitize user input"""
    if not isinstance(data, str):
        return str(data)
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&', 'script', 'javascript']
    clean_data = data
    
    for char in dangerous_chars:
        clean_data = clean_data.replace(char, '')
    
    return clean_data.strip()

def validate_business_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate business registration data"""
    errors = {}
    
    if not data.get('business_name'):
        errors['business_name'] = 'Business name is required'
    
    if not data.get('email') or not validate_email(data['email']):
        errors['email'] = 'Valid email is required'
    
    if not data.get('password'):
        errors['password'] = 'Password is required'
    else:
        password_validation = validate_password(data['password'])
        if not password_validation['valid']:
            errors['password'] = password_validation['errors']
    
    phone = data.get('phone')
    if phone and not validate_phone(phone):
        errors['phone'] = 'Invalid phone number format'
    
    return {
        'valid': len(errors) == 0,
        'errors': errors
    }
