import secrets
import string
from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q
from django.db.models.functions import Coalesce
from core.models import Clinica, ClinicLegalEntity, Gasto

User = get_user_model()


def _is_admin(user) -> bool:
    return user.is_staff or user.is_superuser or getattr(user, 'rol', '') == 'admin_dq'


def _require_admin(user):
    if not _is_admin(user):
        return Response({"detail": "Acceso restringido a administradores."}, status=403)
    return None


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# ─── /api/core/me/ ─────────────────────────────────────────────────────────────

class MeView(APIView):
    """
    Returns the authenticated user's profile including admin flags and clinic info.
    Used by the frontend to enrich AuthContext after login.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        clinic = getattr(user, 'clinica', None)
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "rol": getattr(user, 'rol', 'consulta'),
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "clinic_id": str(clinic.id) if clinic else None,
            "clinic_nombre": clinic.nombre if clinic else None,
            "must_change_password": getattr(user, 'must_change_password', False),
        })


# ─── /api/core/admin/clinics/ ─────────────────────────────────────────────────

class AdminClinicListView(APIView):
    """All active clinics — for admin ClinicSelector dropdown."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_admin(request.user)
        if err:
            return err
        clinics = Clinica.objects.filter(activa=True).values('id', 'nombre', 'num_boxes').order_by('nombre')
        return Response([
            {'id': str(c['id']), 'nombre': c['nombre'], 'num_boxes': c['num_boxes']}
            for c in clinics
        ])


# ─── /api/core/admin/users/ ──────────────────────────────────────────────────

class AdminUserListView(APIView):
    """List all users (admin only) and create new users."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_admin(request.user)
        if err:
            return err
        users = User.objects.select_related('clinica').order_by('clinica__nombre', 'username')
        data = []
        for u in users:
            data.append({
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'rol': getattr(u, 'rol', 'consulta'),
                'is_active': u.is_active,
                'is_staff': u.is_staff,
                'clinica_id': str(u.clinica.id) if u.clinica else None,
                'clinica_nombre': u.clinica.nombre if u.clinica else '—',
                'must_change_password': getattr(u, 'must_change_password', False),
            })
        return Response(data)

    def post(self, request):
        err = _require_admin(request.user)
        if err:
            return err
        d = request.data
        username = d.get('username', '').strip()
        email    = d.get('email', '').strip()
        if not username or not email:
            return Response({"detail": "username y email son obligatorios."}, status=400)

        if User.objects.filter(username=username).exists():
            return Response({"detail": f"El usuario '{username}' ya existe."}, status=400)

        temp_password = _generate_temp_password()
        clinica_id = d.get('clinica_id')
        clinica = None
        if clinica_id:
            try:
                clinica = Clinica.objects.get(id=clinica_id)
            except Clinica.DoesNotExist:
                return Response({"detail": "Clínica no encontrada."}, status=400)

        rol = d.get('rol', 'consulta')
        if rol != 'admin_dq' and not clinica:
            return Response({"detail": "Es obligatorio asignar una Clínica (excepto para Admins)."}, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=temp_password,
            first_name=d.get('first_name', ''),
            last_name=d.get('last_name', ''),
        )
        user.rol = d.get('rol', 'consulta')
        user.clinica = clinica
        user.must_change_password = True
        user.save()

        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "temp_password": temp_password,   # shown once to admin
            "must_change_password": True,
            "message": "Usuario creado. Comunica la contraseña temporal al usuario.",
        }, status=201)


# ─── /api/core/admin/users/<id>/ ─────────────────────────────────────────────

class AdminUserDetailView(APIView):
    """Get / update / toggle active / reset password for a single user."""
    permission_classes = [IsAuthenticated]

    def _get_user(self, pk):
        try:
            return User.objects.select_related('clinica').get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        err = _require_admin(request.user)
        if err:
            return err
        u = self._get_user(pk)
        if not u:
            return Response({"detail": "Usuario no encontrado."}, status=404)
        return Response({
            'id': u.id, 'username': u.username, 'email': u.email,
            'first_name': u.first_name, 'last_name': u.last_name,
            'rol': getattr(u, 'rol', 'consulta'),
            'is_active': u.is_active, 'is_staff': u.is_staff,
            'clinica_id': str(u.clinica.id) if u.clinica else None,
            'clinica_nombre': u.clinica.nombre if u.clinica else '—',
            'must_change_password': getattr(u, 'must_change_password', False),
        })

    def patch(self, request, pk):
        err = _require_admin(request.user)
        if err:
            return err
        u = self._get_user(pk)
        if not u:
            return Response({"detail": "Usuario no encontrado."}, status=404)

        d = request.data
        if 'is_active' in d:
            u.is_active = bool(d['is_active'])
        if 'rol' in d:
            u.rol = d['rol']
        if 'first_name' in d:
            u.first_name = d['first_name']
        if 'last_name' in d:
            u.last_name = d['last_name']
        if 'email' in d:
            u.email = d['email']
        if 'clinica_id' in d:
            if d['clinica_id']:
                try:
                    u.clinica = Clinica.objects.get(id=d['clinica_id'])
                except Clinica.DoesNotExist:
                    return Response({"detail": "Clínica no encontrada."}, status=400)
            else:
                u.clinica = None

        if getattr(u, 'rol', 'consulta') != 'admin_dq' and not u.clinica:
            return Response({"detail": "Es obligatorio asignar una Clínica (excepto para Admins)."}, status=400)

        u.save()

        return Response({
            'id': u.id, 'username': u.username, 'email': u.email,
            'is_active': u.is_active, 'rol': getattr(u, 'rol', ''),
            'clinica_nombre': u.clinica.nombre if u.clinica else '—',
        })

    def delete(self, request, pk):
        err = _require_admin(request.user)
        if err:
            return err
        u = self._get_user(pk)
        if not u:
            return Response({"detail": "Usuario no encontrado."}, status=404)
        
        # Don't let superadmin delete themselves
        if u.id == request.user.id:
            return Response({"detail": "No puedes eliminar tu propio usuario."}, status=400)
            
        u.delete()
        return Response(status=204)


# ─── /api/core/admin/users/<id>/reset-password/ ──────────────────────────────

class AdminResetPasswordView(APIView):
    """Generate a temp password for a user and force change on next login."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        err = _require_admin(request.user)
        if err:
            return err
        try:
            u = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"detail": "Usuario no encontrado."}, status=404)

        temp_password = _generate_temp_password()
        u.set_password(temp_password)
        u.must_change_password = True
        u.save()

        return Response({
            "detail": "Contraseña reseteada. Comparte la contraseña temporal con el usuario.",
            "temp_password": temp_password,   # displayed once to admin
            "username": u.username,
        })


# ─── /api/core/admin/global-stats/ ───────────────────────────────────────────

class AdminGlobalStatsView(APIView):
    """
    Aggregate stats for the whole group — billing, savings, top providers, clinic list.
    Accessible only to admin_dq / superusers.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_admin(request.user)
        if err:
            return err

        User = get_user_model()

        # ── Total billing from Gasto.amount (real data source) ─────────────────
        total_facturacion = Gasto.objects.aggregate(
            total=Coalesce(Sum('amount'), Decimal('0'))
        )['total']

        # ── Dynamic total savings: Gasto × Proveedor.ahorro_estimado ──────────
        # Group by provider savings rate and multiply by billing volume
        provs_with_savings = (
            Gasto.objects
            .filter(proveedor__isnull=False, proveedor__ahorro_estimado__gt=0)
            .values('proveedor__ahorro_estimado', 'proveedor__descuento_dq')
            .annotate(vol=Coalesce(Sum('amount'), Decimal('0')))
        )
        total_ahorro = Decimal('0')
        for row in provs_with_savings:
            ae = row['proveedor__ahorro_estimado'] or Decimal('0')
            dd = row['proveedor__descuento_dq'] or Decimal('0')
            vol = row['vol']
            if Decimal('0') < dd <= Decimal('1'):
                divisor = Decimal('1') - dd
                total_ahorro += vol * (ae / divisor)
            else:
                total_ahorro += vol * ae
        # Fallback to static ahorro_aprox for providers without ahorro_estimado
        total_ahorro += Gasto.objects.filter(
            Q(proveedor__ahorro_estimado__isnull=True) | Q(proveedor__ahorro_estimado=0)
        ).aggregate(total=Coalesce(Sum('ahorro_aprox'), Decimal('0')))['total']

        # ── Real historical savings from Gasto model (static, for reference) ──
        ahorro_gastos = float(total_ahorro)  # now uses dynamic formula

        # ── Top 5 providers by billing volume (from Gasto) ─────────────────────
        top_proveedores = list(
            Gasto.objects
            .filter(proveedor__isnull=False)
            .values('proveedor__id', 'proveedor__nombre')
            .annotate(
                volumen=Coalesce(Sum('amount'), Decimal('0')),
                num_pedidos=Count('id'),
            )
            .order_by('-volumen')[:5]
        )

        # ── Clinic list with user counts ───────────────────────────────────────
        active_clinics = list(
            Clinica.objects
            .filter(activa=True)
            .values('id', 'nombre', 'num_boxes')
            .order_by('nombre')
        )
        user_counts = {
            str(row['clinica_id']): row['total']
            for row in (
                User.objects
                .filter(is_active=True)
                .exclude(clinica__isnull=True)
                .values('clinica_id')
                .annotate(total=Count('id'))
            )
        }

        return Response({
            'facturacion_total': float(total_facturacion),
            'ahorro_total': float(total_ahorro),
            'ahorro_gastos': ahorro_gastos,
            'clinicas_activas': len(active_clinics),
            'top_proveedores': [
                {
                    'id': p['proveedor__id'],
                    'nombre': p['proveedor__nombre'],
                    'volumen': float(p['volumen']),
                    'num_pedidos': p['num_pedidos'],
                }
                for p in top_proveedores
            ],
            'clinicas': [
                {
                    'id': str(c['id']),
                    'nombre': c['nombre'],
                    'num_boxes': c['num_boxes'],
                    'num_usuarios': user_counts.get(str(c['id']), 0),
                }
                for c in active_clinics
            ],
        })


# ─── /api/core/admin/clinics/manage/ ─────────────────────────────────────────

class AdminClinicManageView(APIView):
    """Create or list all clinics (including inactive)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_admin(request.user)
        if err:
            return err
        clinics = Clinica.objects.prefetch_related('legal_entities').order_by('nombre')
        data = []
        for c in clinics:
            le = c.legal_entities.first()
            data.append({
                'id': str(c.id),
                'nombre': c.nombre,
                'activa': c.activa,
                'num_boxes': c.num_boxes,
                'cif': le.cif if le else '',
                'nombre_fiscal': le.nombre_fiscal if le else '',
            })
        return Response(data)

    def post(self, request):
        err = _require_admin(request.user)
        if err:
            return err
        d = request.data
        nombre = d.get('nombre', '').strip()
        if not nombre:
            return Response({'detail': 'nombre es obligatorio.'}, status=400)
        clinic = Clinica.objects.create(
            nombre=nombre,
            activa=d.get('activa', True),
            num_boxes=d.get('num_boxes') or None,
        )
        cif = d.get('cif', '').strip()
        if cif:
            ClinicLegalEntity.objects.create(
                clinic=clinic,
                cif=cif,
                nombre_fiscal=d.get('nombre_fiscal', '').strip(),
            )
        return Response({
            'id': str(clinic.id),
            'nombre': clinic.nombre,
            'activa': clinic.activa,
            'num_boxes': clinic.num_boxes,
            'cif': cif,
        }, status=201)


class AdminClinicDetailView(APIView):
    """Update or delete a single clinic."""
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Clinica.objects.prefetch_related('legal_entities').get(pk=pk)
        except Clinica.DoesNotExist:
            return None

    def patch(self, request, pk):
        err = _require_admin(request.user)
        if err:
            return err
        clinic = self._get(pk)
        if not clinic:
            return Response({'detail': 'Clínica no encontrada.'}, status=404)
        d = request.data
        if 'nombre' in d:
            clinic.nombre = d['nombre'].strip()
        if 'activa' in d:
            clinic.activa = bool(d['activa'])
        if 'num_boxes' in d:
            clinic.num_boxes = d['num_boxes'] or None
        clinic.save()
        # Legal entity
        cif = d.get('cif', '').strip()
        nombre_fiscal = d.get('nombre_fiscal', '').strip()
        if cif:
            le = clinic.legal_entities.first()
            if le:
                le.cif = cif
                le.nombre_fiscal = nombre_fiscal
                le.save()
            else:
                ClinicLegalEntity.objects.create(
                    clinic=clinic, cif=cif, nombre_fiscal=nombre_fiscal
                )
        le = clinic.legal_entities.first()
        return Response({
            'id': str(clinic.id),
            'nombre': clinic.nombre,
            'activa': clinic.activa,
            'num_boxes': clinic.num_boxes,
            'cif': le.cif if le else '',
            'nombre_fiscal': le.nombre_fiscal if le else '',
        })

    def delete(self, request, pk):
        err = _require_admin(request.user)
        if err:
            return err
        clinic = self._get(pk)
        if not clinic:
            return Response({'detail': 'Clínica no encontrada.'}, status=404)
        clinic.delete()
        return Response(status=204)


# ─── /api/core/admin/clinics/coins/ ──────────────────────────────────────────

class AdminClinicCoinsView(APIView):
    """DQ Coins balance for every clinic — loyalty audit table."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = _require_admin(request.user)
        if err:
            return err
        from incentivos.models import Puntos
        puntos_map = {
            p.clinica_id: p.puntos_acumulados
            for p in Puntos.objects.select_related('clinica').all()
        }
        clinics = Clinica.objects.filter(activa=True).order_by('nombre')
        return Response([
            {
                'id': str(c.id),
                'nombre': c.nombre,
                'puntos_acumulados': puntos_map.get(c.id, 0),
            }
            for c in clinics
        ])
