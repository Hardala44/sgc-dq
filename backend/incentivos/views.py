import secrets, string
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Premio, Puntos


def _is_admin(user) -> bool:
    return user.is_staff or user.is_superuser or getattr(user, 'rol', '') == 'admin_dq'


class PremioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        premios = Premio.objects.all().order_by('orden', 'coste_puntos')
        data = []
        for p in premios:
            data.append({
                'id': p.id,
                'nombre': p.nombre,
                'descripcion': p.descripcion,
                'coste_puntos': p.coste_puntos,
                'imagen_url': request.build_absolute_uri(p.imagen.url) if p.imagen else p.imagen_url,
                'activo': p.activo,
                'orden': p.orden
            })
        return Response(data)

    def post(self, request):
        if not _is_admin(request.user):
            return Response({'detail': 'Acceso restringido.'}, status=403)
        d = request.data
        nombre = d.get('nombre', '').strip()
        if not nombre:
            return Response({'detail': 'nombre es obligatorio.'}, status=400)
        # Handle boolean from FormData
        activo_str = d.get('activo', 'true')
        activo = activo_str.lower() == 'true' if isinstance(activo_str, str) else bool(activo_str)
        premio = Premio.objects.create(
            nombre=nombre,
            descripcion=d.get('descripcion', ''),
            coste_puntos=int(d.get('coste_puntos', 500)),
            imagen_url=d.get('imagen_url', ''),
            imagen=request.FILES.get('imagen'),
            activo=activo,
            orden=int(d.get('orden', 0)),
        )
        
        img_url = request.build_absolute_uri(premio.imagen.url) if premio.imagen else premio.imagen_url
        return Response({
            'id': premio.id, 'nombre': premio.nombre,
            'coste_puntos': premio.coste_puntos, 'activo': premio.activo,
            'imagen_url': img_url
        }, status=201)


class PremioDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk):
        try:
            return Premio.objects.get(pk=pk)
        except Premio.DoesNotExist:
            return None

    def patch(self, request, pk):
        if not _is_admin(request.user):
            return Response({'detail': 'Acceso restringido.'}, status=403)
        p = self._get(pk)
        if not p:
            return Response({'detail': 'Premio no encontrado.'}, status=404)
        d = request.data
        if 'nombre' in d: p.nombre = d['nombre']
        if 'descripcion' in d: p.descripcion = d['descripcion']
        if 'coste_puntos' in d: p.coste_puntos = int(d['coste_puntos'])
        if 'imagen_url' in d: p.imagen_url = d['imagen_url']
        if 'orden' in d: p.orden = int(d['orden'])
        if 'activo' in d:
            activo_str = d['activo']
            p.activo = activo_str.lower() == 'true' if isinstance(activo_str, str) else bool(activo_str)
            
        if 'imagen' in request.FILES:
            p.imagen = request.FILES['imagen']
            
        p.save()
        img_url = request.build_absolute_uri(p.imagen.url) if p.imagen else p.imagen_url
        return Response({
            'id': p.id, 'nombre': p.nombre, 'activo': p.activo,
            'imagen_url': img_url
        })

    def delete(self, request, pk):
        if not _is_admin(request.user):
            return Response({'detail': 'Acceso restringido.'}, status=403)
        p = self._get(pk)
        if not p:
            return Response({'detail': 'Premio no encontrado.'}, status=404)
        p.delete()
        return Response(status=204)
