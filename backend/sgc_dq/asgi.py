"""
ASGI config for sgc_dq project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')

django_application = get_asgi_application()

# Import FastAPI app after Django setup
from core.api import app as fastapi_app

async def application(scope, receive, send):
    if scope['type'] == 'http' and scope['path'].startswith('/fastapi'):
        scope['root_path'] = '/fastapi'
        path = scope['path'][len('/fastapi'):]
        scope['path'] = path if path else '/'
        await fastapi_app(scope, receive, send)
    else:
        await django_application(scope, receive, send)
