from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_clinic_or_error(user):
    """Returns (clinic, None) or (None, Response error)."""
    clinic = getattr(user, 'clinica', None)
    if not clinic:
        return None, Response({"detail": "El usuario no tiene una clínica asignada."}, status=400)
    return clinic, None


def _clinic_payload(clinic):
    """Builds the standard clinic settings payload."""
    # Pull profile fields from the first legal entity if available
    legal = clinic.legal_entities.order_by('created_at').first()
    return {
        "id": str(clinic.id),
        "nombre": clinic.nombre,
        "num_boxes": clinic.num_boxes,
        # Legal entity / profile fields (editable)
        "cif": legal.cif if legal else "",
        "nombre_fiscal": legal.nombre_fiscal if legal else "",
        "direccion": legal.direccion if legal else "",
        "poblacion": legal.poblacion if legal else "",
        "provincia": legal.provincia if legal else "",
        "telefono": legal.telefono if legal else "",
        "email": legal.email_preferred if legal else "",
    }


# ─── Clinic Settings ──────────────────────────────────────────────────────────

class ClinicSettingsView(APIView):
    """
    GET  /api/core/clinics/me/  → Retrieve clinic profile + operational params.
    PATCH /api/core/clinics/me/ → Update clinic profile + operational params.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic, err = _get_clinic_or_error(request.user)
        if err:
            return err
        return Response(_clinic_payload(clinic))

    def patch(self, request):
        clinic, err = _get_clinic_or_error(request.user)
        if err:
            return err

        data = request.data

        # ── num_boxes ─────────────────────────────────────────────────────────
        if 'num_boxes' in data:
            raw = data['num_boxes']
            if raw is None or raw == "":
                clinic.num_boxes = None
            else:
                try:
                    val = int(raw)
                    if val < 0:
                        return Response(
                            {"detail": "El número de gabinetes debe ser un valor positivo."},
                            status=400,
                        )
                    clinic.num_boxes = val
                except (ValueError, TypeError):
                    return Response(
                        {"detail": "El número de gabinetes debe ser un número entero."},
                        status=400,
                    )

        # ── Clinic-level fields ───────────────────────────────────────────────
        if 'nombre' in data and data['nombre']:
            clinic.nombre = str(data['nombre']).strip()

        clinic.save()

        # ── Legal entity fields ───────────────────────────────────────────────
        legal_fields = ('cif', 'nombre_fiscal', 'direccion', 'poblacion', 'provincia', 'telefono', 'email')
        has_legal_data = any(k in data for k in legal_fields)

        if has_legal_data:
            legal = clinic.legal_entities.order_by('created_at').first()
            if legal is None:
                from core.models import ClinicLegalEntity
                legal = ClinicLegalEntity(clinic=clinic)

            if 'cif' in data:
                legal.cif = str(data['cif']).strip()
            if 'nombre_fiscal' in data:
                legal.nombre_fiscal = str(data['nombre_fiscal']).strip()
            if 'direccion' in data:
                legal.direccion = str(data['direccion']).strip()
            if 'poblacion' in data:
                legal.poblacion = str(data['poblacion']).strip()
            if 'provincia' in data:
                legal.provincia = str(data['provincia']).strip()
            if 'telefono' in data:
                legal.telefono = str(data['telefono']).strip()
            if 'email' in data:
                legal.email_preferred = str(data['email']).strip()

            legal.save()

        return Response(_clinic_payload(clinic))


# ─── Change Password ──────────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    POST /api/core/auth/change-password/
    Body: { current_password, new_password, confirm_password }

    Security:
    - Verifies current_password with check_password() (no plaintext storage).
    - Validates new_password strength with Django's AUTH_PASSWORD_VALIDATORS.
    - Calls set_password() + save() to hash the new password.
    - Does NOT call update_session_auth_hash because we use JWT (stateless).
      The client must re-authenticate to get a fresh token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current  = request.data.get('current_password', '')
        new_pw   = request.data.get('new_password', '')
        confirm  = request.data.get('confirm_password', '')

        # ── Basic presence checks ─────────────────────────────────────────────
        errors = {}
        if not current:
            errors['current_password'] = 'La contraseña actual es obligatoria.'
        if not new_pw:
            errors['new_password'] = 'La nueva contraseña es obligatoria.'
        if not confirm:
            errors['confirm_password'] = 'Por favor confirma la nueva contraseña.'
        if errors:
            return Response({"errors": errors}, status=400)

        # ── Verify current password ───────────────────────────────────────────
        if not user.check_password(current):
            return Response(
                {"errors": {"current_password": "La contraseña actual no es correcta."}},
                status=400,
            )

        # ── Confirm match ─────────────────────────────────────────────────────
        if new_pw != confirm:
            return Response(
                {"errors": {"confirm_password": "Las contraseñas no coinciden."}},
                status=400,
            )

        # ── Must differ from current ──────────────────────────────────────────
        if user.check_password(new_pw):
            return Response(
                {"errors": {"new_password": "La nueva contraseña debe ser diferente a la actual."}},
                status=400,
            )

        # ── Django password validators (length, complexity, common passwords) ─
        try:
            validate_password(new_pw, user=user)
        except ValidationError as exc:
            return Response(
                {"errors": {"new_password": " ".join(exc.messages)}},
                status=400,
            )

        # ── Apply ─────────────────────────────────────────────────────────────
        user.set_password(new_pw)
        user.must_change_password = False
        user.save()

        # Note: JWT tokens remain valid until expiry — inform the client to
        # re-login so the next token reflects the updated credentials.
        return Response({
            "detail": "Contraseña actualizada correctamente. Por seguridad, inicia sesión de nuevo.",
            "require_relogin": True,
        })
