from django.contrib import admin
from .models import (
    Categoria, Proveedor, ProductoLegado, Oferta, CompraAgrupada,
    Pedido, LineaPedido, Producto, ProveedorOferta,
)


class LineaPedidoInline(admin.TabularInline):
    model = LineaPedido
    extra = 0


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'orden')
    ordering = ('orden', 'nombre')


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'contacto_email', 'modo_pedido', 'activo', 'es_estrategico')
    list_filter = ('activo', 'es_estrategico', 'modo_pedido')
    search_fields = ('nombre', 'contacto_email')
    filter_horizontal = ('categorias',)


@admin.register(ProductoLegado)
class ProductoLegadoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'proveedor', 'categoria', 'precio_dq', 'stock_disponible', 'activo')
    list_filter = ('activo', 'proveedor', 'categoria')
    search_fields = ('nombre', 'codigo_producto')


# ─── Marketplace Admin ────────────────────────────────────────────────────────

class ProveedorOfertaInline(admin.TabularInline):
    model = ProveedorOferta
    extra = 0
    readonly_fields = ('ultima_actualizacion',)
    fields = ('proveedor', 'sku', 'precio', 'url_compra', 'stock_status', 'ultima_actualizacion')


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'linea_producto', 'marca', 'categoria', 'offer_count', 'activo')
    list_filter = ('activo', 'categoria')
    search_fields = ('nombre', 'linea_producto', 'marca', 'descripcion')
    inlines = [ProveedorOfertaInline]

    def offer_count(self, obj):
        return obj.ofertas.count()
    offer_count.short_description = 'Ofertas'

    def min_price(self, obj):
        agg = obj.ofertas.order_by('precio').values_list('precio', flat=True).first()
        return f'{agg} €' if agg else '—'
    min_price.short_description = 'Precio mínimo'


@admin.register(ProveedorOferta)
class ProveedorOfertaAdmin(admin.ModelAdmin):
    list_display = ('producto', 'proveedor', 'sku', 'precio', 'stock_status', 'ultima_actualizacion')
    list_filter = ('stock_status', 'proveedor')
    search_fields = ('sku', 'producto__nombre', 'proveedor__nombre')
    readonly_fields = ('ultima_actualizacion',)


# Legacy models
@admin.register(Oferta)
class OfertaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'producto', 'descuento_porcentaje', 'precio_oferta', 'activa', 'fecha_fin')
    list_filter = ('activa', 'destacada')


@admin.register(CompraAgrupada)
class CompraAgrupadaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'producto', 'precio_objetivo', 'cantidad_actual', 'cantidad_minima', 'activa')
    list_filter = ('activa',)


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ('numero_pedido', 'clinica', 'proveedor', 'fecha', 'estado', 'total')
    list_filter = ('estado', 'tipo_gestion', 'fecha')
    search_fields = ('numero_pedido', 'clinica__nombre', 'proveedor__nombre')
    inlines = [LineaPedidoInline]
