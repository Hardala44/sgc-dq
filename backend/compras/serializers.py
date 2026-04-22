from rest_framework.serializers import ModelSerializer
from rest_framework import serializers
from django.db.models import Min, Count
from .models import (
    Categoria, Proveedor, ProductoLegado, Oferta, ProductoEstrella,
    LeadSolicitud, Producto, ProveedorOferta,
)


class CategoriaSerializer(ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'


class ProveedorSerializer(ModelSerializer):
    categorias = serializers.StringRelatedField(many=True, read_only=True)

    class Meta:
        model = Proveedor
        fields = '__all__'


# ─── Legacy Serializers (kept for backward compatibility) ─────────────────────

class ProductoLegadoSerializer(ModelSerializer):
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)

    class Meta:
        model = ProductoLegado
        fields = '__all__'


# Kept alas as ProductoSerializer so existing view imports don't break
ProductoSerializer = ProductoLegadoSerializer


class OfertaSerializer(ModelSerializer):
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
        logo_url = None
        
        if obj.proveedor.logo and request:
            logo_url = request.build_absolute_uri(obj.proveedor.logo.url)
        else:
            # Fallback to Clearbit for professional branding if no local logo exists
            # We use a clean domain mapping for common providers
            domain_map = {
                'Henry Schein': 'henryschein.com',
                'Proclinic': 'proclinic.es',
                'ZimVie': 'zimvie.com',
                '3M': '3m.com',
                'Klockner': 'klockner.es',
                'Dentaid': 'dentaid.com',
                'Normon': 'normon.es',
            }
            
            if obj.proveedor.nombre in domain_map:
                domain = domain_map[obj.proveedor.nombre]
            elif obj.proveedor.contacto_email and '@' in obj.proveedor.contacto_email:
                domain = obj.proveedor.contacto_email.split('@')[-1].strip().split(' ')[0]
            elif obj.proveedor.url_web:
                domain = obj.proveedor.url_web.replace('https://', '').replace('http://', '').replace('www.', '').split('/')[0]
            else:
                domain = f"{obj.proveedor.nombre.lower().replace(' ', '')}.com"

            logo_url = f"https://logo.clearbit.com/{domain}"
            
        return {
            'id': obj.proveedor.id,
            'nombre': obj.proveedor.nombre,
            'logo': logo_url,
            'contacto_nombre': obj.proveedor.contacto_nombre,
            'contacto_email': obj.proveedor.contacto_email,
            'contacto_telefono': obj.proveedor.contacto_telefono,
            'url_web': obj.proveedor.url_web,
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
        # We guarantee an array of unique suppliers (by ID), 
        # picking the first representative supply per provider, ignoring sku/price variations.
        ofertas = instance.ofertas.all()
        seen = set()
        unique = []
        for o in ofertas:
            if o.proveedor_id not in seen:
                seen.add(o.proveedor_id)
                unique.append(o)
                
        serializer = ProveedorOfertaSerializer(unique, many=True, context=self.context)
        return serializer.data
