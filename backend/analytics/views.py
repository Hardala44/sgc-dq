from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import AnalyticsService
from core.models import Clinica


class AvailablePeriodsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic_id = request.headers.get('X-Clinic-Id') or request.query_params.get('clinic_id')
        user = request.user

        if user.rol == 'admin_dq' or user.is_superuser:
            if clinic_id:
                try:
                    target_clinic = Clinica.objects.get(id=clinic_id, activa=True)
                except Clinica.DoesNotExist:
                    return Response({'error': 'Clinic not found'}, status=404)
            else:
                target_clinic = Clinica.objects.filter(activa=True).order_by('nombre').first()
        else:
            target_clinic = user.clinica
            if target_clinic is None:
                return Response({'error': 'No clinic assigned to this user'}, status=400)
            if clinic_id and str(target_clinic.id) != clinic_id:
                return Response({'error': 'Unauthorized access to this clinic'}, status=403)

        if not target_clinic:
            return Response({'error': 'No valid clinic found for this user'}, status=400)

        data = AnalyticsService.get_available_periods(target_clinic)
        return Response(data)


class ClinicListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.rol == 'admin_dq' or user.is_superuser:
            clinics = Clinica.objects.filter(activa=True).values('id', 'nombre').order_by('nombre')
        elif user.clinica:
            clinics = [{'id': user.clinica.id, 'nombre': user.clinica.nombre}]
        else:
            return Response([], status=200) # User has no clinic and is not admin
        return Response(list(clinics))

class DashboardAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        print("--> REQUEST RECEIVED IN DASHBOARD VIEW")
        # validation of params
        period = request.query_params.get('period') # e.g. "2025-Q1"
        comparison_mode = request.query_params.get('comparison_mode', 'yoy')
        clinic_id = request.headers.get('X-Clinic-Id') or request.query_params.get('clinic_id')

        if not period:
            return Response({"error": "Period parameter is required (e.g., 2025-Q1)"}, status=400)

        # Determine target clinic
        target_clinic = None
        user = request.user

        if user.rol == 'admin_dq' or user.is_superuser:
            if clinic_id:
                try:
                    target_clinic = Clinica.objects.get(id=clinic_id, activa=True)
                except Clinica.DoesNotExist:
                    return Response({"error": "Clinic not found"}, status=404)
            else:
                # Fallback to first active clinic if none specified
                target_clinic = Clinica.objects.filter(activa=True).order_by('nombre').first()
        else:
            # Regular user: strict check
            target_clinic = user.clinica
            if clinic_id and str(target_clinic.id) != clinic_id:
                 return Response({"error": "Unauthorized access to this clinic"}, status=403)

        if not target_clinic:
             return Response({"error": "No valid clinic found for this user"}, status=400)
        
        try:
            data = AnalyticsService.get_dashboard_data(target_clinic, period, comparison_mode)
            return Response(data)
        except ValueError as e:
            return Response({"error": str(e)}, status=400)
        except Exception as e:
            # log error
            print(f"Error in DashboardAnalyticsView: {e}")
            return Response({"error": "Internal Server Error"}, status=500)


class HomeHighlightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        clinic_id = request.headers.get('X-Clinic-Id') or request.query_params.get('clinic_id')

        target_clinic = None
        user = request.user

        if user.rol == 'admin_dq' or user.is_superuser:
            if clinic_id:
                try:
                    target_clinic = Clinica.objects.get(id=clinic_id, activa=True)
                except Clinica.DoesNotExist:
                    return Response({"error": "Clinic not found"}, status=404)
            else:
                target_clinic = Clinica.objects.filter(activa=True).order_by('nombre').first()
        else:
            target_clinic = user.clinica
            if target_clinic is None:
                return Response({"error": "No clinic assigned to this user"}, status=400)
            if clinic_id and str(target_clinic.id) != clinic_id:
                return Response({"error": "Unauthorized access to this clinic"}, status=403)

        if not target_clinic:
            return Response({"error": "No valid clinic found for this user"}, status=400)

        try:
            data = AnalyticsService.get_home_highlights(target_clinic)

            providers = data.get('savings', {}).get('by_provider', [])
            for provider in providers:
                logo_url = provider.get('logo_url')
                if isinstance(logo_url, str) and logo_url.startswith('/'):
                    provider['logo_url'] = request.build_absolute_uri(logo_url)

            return Response(data)
        except Exception as e:
            print(f"Error in HomeHighlightsView: {e}")
            return Response({"error": "Internal Server Error"}, status=500)
