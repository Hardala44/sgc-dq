from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        users = UserModel.objects.filter(email=username)
        for user in users:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user
        return None
