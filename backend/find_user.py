import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from core.models import Usuario, ClinicLegalEntity

users = Usuario.objects.filter(clinica__isnull=False)
user = next((u for u in users if u.email and 'example.com' not in u.email), None)

if user:
    user.set_password('dq12345')
    user.save()
    print(f"FOUND: email={user.email} username={user.username}")
else:
    user = users.first()
    if user:
        le = user.clinica.cliniclegalentity_set.first()
        if le and le.email_preferred:
            user.email = le.email_preferred
            user.username = le.email_preferred
            user.set_password('dq12345')
            user.save()
            print(f"UPDATED: email={user.email} username={user.username}")
        else:
            print("No real email found in clinic.")
    else:
        print("No clinic users found.")
