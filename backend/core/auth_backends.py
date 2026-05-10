from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        identifier = str(username).strip()
        if not identifier:
            return None

        UserModel = get_user_model()
        # Accept login with either email or username to preserve legacy access patterns.
        users = UserModel.objects.filter(
            Q(email__iexact=identifier) | Q(username__iexact=identifier)
        )
        for user in users:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        return None
