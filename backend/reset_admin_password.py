import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

User = get_user_model()

try:
    user = User.objects.get(username='Antigravity')
    user.set_password('Antigravity123!')
    user.save()
    print("SUCCESS: Password for 'Antigravity' set to 'Antigravity123!'")
except User.DoesNotExist:
    print("ERROR: User 'Antigravity' not found! Creating it...")
    user = User.objects.create_superuser('Antigravity', 'admin@example.com', 'Antigravity123!')
    print("SUCCESS: Created superuser 'Antigravity' with password 'Antigravity123!'")
