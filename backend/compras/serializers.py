from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from django.db.models import Min, Count
from .models import (
    Categoria, Proveedor, ProductoLegado, Oferta, ProductoEstrella,
    LeadSolicitud, Producto, ProveedorOferta, PeticionPresupuesto,
    OfertaDestacada,
)


class CategoriaSerializer(ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ProveedorSerializer(ModelSerializer):
    # Read: return category names for display
    categorias_nombres = serializers.SerializerMethodField()
    # Write: accept category IDs (M2M); read returns IDs by default
    categorias = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Categoria.objects.all(), required=False
    )
    num_lineas_producto = serializers.SerializerMethodField()

    class Meta:
        model = Proveedor
        fields = '__all__'

    def get_categorias_nombres(self, obj):
        return list(obj.categorias.values_list('nombre', flat=True))

    def get_num_lineas_producto(self, obj):
        """Count distinct Marketplace Productos this provider supplies."""
        return obj.ofertas_marketplace.values('producto').distinct().count()


# ─── Legacy Serializers (kept for backward compatibility) ─────────────────────

class ProductoLegadoSerializer(ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)

    class Meta:
        model = ProductoLegado
        fields = '__all__'


# Kept alas as ProductoSerializer so existing view imports don't break
ProductoSerializer = ProductoLegadoSerializer


class OfertaSerializer(ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    
    class Meta:
        model = Oferta
        fields = '__all__'


class ProductoEstrellaSerializer(ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)

    class Meta:
        model = ProductoEstrella
        fields = '__all__'


class LeadSolicitudSerializer(ModelSerializer):
    class Meta:
        model = LeadSolicitud
        fields = '__all__'
        read_only_fields = ('usuario_solicitante', 'clinica', 'estado')


# ─── Marketplace Serializers ──────────────────────────────────────────────────

class ProveedorOfertaSerializer(ModelSerializer):
    proveedor = serializers.SerializerMethodField()
    
    class Meta:
        model = ProveedorOferta
        fields = [
            'id', 'proveedor', 'url_compra', 'stock_status', 'ultima_actualizacion',
        ]

    def get_proveedor(self, obj):
        request = self.context.get('request')
        # Prefer external logo_url; fall back to uploaded file
        if obj.proveedor.logo_url:
            logo_url = obj.proveedor.logo_url
        elif obj.proveedor.logo and request:
            logo_url = request.build_absolute_uri(obj.proveedor.logo.url)
        else:
            logo_url = None

        return {
            'id': obj.proveedor.id,
            'nombre': obj.proveedor.nombre,
            'logo': logo_url,
            'contacto_nombre': obj.proveedor.contacto_nombre,
            'contacto_email': obj.proveedor.contacto_email,
            'contacto_telefono': obj.proveedor.contacto_telefono,
            'url_web': obj.proveedor.url_web,
            'condiciones_especiales': obj.proveedor.condiciones_especiales,
        }


class ProductoMarketplaceSerializer(ModelSerializer):
    """
    Serializer for the Marketplace Producto parent entity.
    Returns a deduplicated list of supplying providers removing SKUs/prices.
    """
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    supplier_count = serializers.IntegerField(read_only=True)
    suministros = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id', 'nombre', 'linea_producto', 'marca', 'categoria', 'categoria_nombre',
            'descripcion', 'imagen_url', 'activo', 'fecha_creacion',
            'supplier_count', 'suministros',
        ]

    def get_suministros(self, instance):
        request = self.context.get('request')

        def build_logo(prov):
            if prov.logo_url:
                return prov.logo_url
            if prov.logo and request:
                return request.build_absolute_uri(prov.logo.url)
            return None

        def prov_to_dict(prov, has_price=False, url_compra='', stock_status='unknown'):
            return {
                'id': prov.id,
                'nombre': prov.nombre,
                'logo': build_logo(prov),
                'contacto_nombre': prov.contacto_nombre,
                'contacto_email': prov.contacto_email,
                'contacto_telefono': prov.contacto_telefono,
                'url_web': prov.url_web,
                'condiciones_especiales': prov.condiciones_especiales,
                'url_compra': url_compra,
                'stock_status': stock_status,
                'has_price': has_price,
            }

        # Only return providers with actual ProveedorOferta records.
        # Category-level fallback was removed — it caused ALL category providers
        # to appear on every product, which is incorrect.
        ofertas = instance.ofertas.select_related('proveedor').all()
        seen = set()
        result = []
        for o in ofertas:
            if o.proveedor_id not in seen:
                seen.add(o.proveedor_id)
                result.append(prov_to_dict(
                    o.proveedor,
                    has_price=True,
                    url_compra=o.url_compra,
                    stock_status=o.stock_status,
                ))
        return result

class PeticionPresupuestoSerializer(ModelSerializer):
    clinica_nombre = serializers.CharField(source='clinica.nombre', read_only=True)
    usuario_nombre = serializers.SerializerMethodField()
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)

    class Meta:
        model = PeticionPresupuesto
        fields = '__all__'
        read_only_fields = ('usuario', 'clinica', 'estado')

    def get_usuario_nombre(self, obj):
        full_name = obj.usuario.get_full_name()
        return full_name or obj.usuario.username


class OfertaDestacadaSerializer(ModelSerializer):
    imagen_url = serializers.SerializerMethodField()

    class Meta:
        model = OfertaDestacada
        fields = ['id', 'titulo', 'imagen', 'imagen_url', 'url_destino', 'activa', 'orden', 'fecha_creacion']

    def get_imagen_url(self, obj):
        request = self.context.get('request')
        if obj.imagen and request:
            return request.build_absolute_uri(obj.imagen.url)
        if obj.imagen:
            return obj.imagen.url
        return None
