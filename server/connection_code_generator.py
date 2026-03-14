import secrets
import string

CONN_CODE_LENGTH = 12
ALPHABET = string.ascii_uppercase + string.digits

def generate_connection_code():
    return ''.join(secrets.choice(ALPHABET) for _ in range(CONN_CODE_LENGTH))