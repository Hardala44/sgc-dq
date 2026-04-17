from django.db import models
from django.conf import settings
import uuid
from core.models import Clinica

class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subcategorias')
    orden = models.IntegerField(default=0)

    class Meta:
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre

class Proveedor(models.Model):
    MODO_PEDIDO_CHOICES = (
        ('email_pedido', 'Email Pedido'),
        ('redireccion_web', 'Redireccion Web'),
        ('api_rest', 'API REST'),
        ('edi', 'EDI'),
    )

    nombre = models.CharField(max_length=200)
    descripcion_larga = models.TextField(blank=True)
    logo = models.ImageField(upload_to='proveedores/', blank=True, null=True)
    categorias = models.ManyToManyField(Categoria)
    es_estrategico = models.BooleanField(default=False)
    descuento_dq = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    descuento_mercado = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    condiciones_especiales = models.TextField(blank=True)
    contacto_nombre = models.CharField(max_length=100)
    contacto_email = models.EmailField()
    contacto_telefono = models.CharField(max_length=20)
    url_web = models.URLField(blank=True)
    url_catalogo = models.URLField(blank=True)
    codigo_descuento = models.CharField(max_length=50, blank=True)
    tipo_interaccion = models.CharField(max_length=20, choices=[('link', 'Link'), ('lead_form', 'Lead Form')], default='link')
    pdf_tarifas = models.FileField(upload_to='tarifas/', blank=True, null=True)
    modo_pedido = models.CharField(max_length=20, choices=MODO_PEDIDO_CHOICES, default='email_pedido')
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

class ProductoLegado(models.Model):
    """Legacy single-supplier product model — preserved for backward compatibility."""
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT)
    nombre = models.CharField(max_length=300)
    descripcion = models.TextField(blank=True)
    codigo_producto = models.CharField(max_length=100, unique=True, null=True, blank=True)
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True)
    precio_mercado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_dq = models.DecimalField(max_digits=10, decimal_places=2)
    stock_disponible = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Producto (Legado)'
        verbose_name_plural = 'Productos (Legado)'

    def __str__(self):
        return self.nombre


# ─── Marketplace Models ──────────────────────────────────────────────────────

class Producto(models.Model):
    """
    The canonical 'parent' product in the Marketplace model.
    One Producto can have many ProveedorOfertas from different suppliers.
    """
    nombre = models.CharField(max_length=300, db_index=True)
    marca = models.CharField(max_length=200, blank=True)
    linea_producto = models.CharField(max_length=300, blank=True, help_text='Conceptual product line for grouping and procurement highlights')
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='productos_marketplace')
    descripcion = models.TextField(blank=True)
    imagen_url = models.URLField(blank=True, help_text='URL of a generic reference image')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)
    needs_review = models.BooleanField(default=False, help_text='Flag automatically set if semantic similarity with other products suggests a duplicate')

    class Meta:
        verbose_name = 'Producto (Marketplace)'
        verbose_name_plural = 'Productos (Marketplace)'
        ordering = ['nombre']
        unique_together = [('nombre', 'marca')]

    def __str__(self):
        brand_part = f' [{self.marca}]' if self.marca else ''
        line_part = f' | Linea: {self.linea_producto}' if self.linea_producto else ''
        return f'{self.nombre}{brand_part}{line_part}'


class ProveedorOferta(models.Model):
    """
    A supplier's specific offer for a Marketplace Producto.
    Identified uniquely by (proveedor, sku).
    """
    STOCK_CHOICES = [
        ('in_stock', 'En stock'),
        ('low_stock', 'Stock bajo'),
        ('out_of_stock', 'Sin stock'),
        ('unknown', 'Desconocido'),
    ]

    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='ofertas')
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, related_name='ofertas_marketplace')
    sku = models.CharField(max_length=200, help_text='Unique product ID from the supplier website')
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    url_compra = models.URLField(blank=True, help_text='Direct link to the product page on the supplier website')
    stock_status = models.CharField(max_length=20, choices=STOCK_CHOICES, default='unknown')
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Oferta de Proveedor'
        verbose_name_plural = 'Ofertas de Proveedor'
        unique_together = [('proveedor', 'sku')]
        ordering = ['precio']

    def __str__(self):
        return f'{self.proveedor.nombre} › {self.producto.nombre} @ {self.precio}€'

class Oferta(models.Model):
    producto = models.ForeignKey(ProductoLegado, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    descuento_porcentaje = models.DecimalField(max_digits=5, decimal_places=2)
    precio_oferta = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    destacada = models.BooleanField(default=False)
    enviar_notificacion = models.BooleanField(default=True)
    activa = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo

class CompraAgrupada(models.Model):
    producto = models.ForeignKey(ProductoLegado, on_delete=models.CASCADE)
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField()
    precio_objetivo = models.DecimalField(max_digits=10, decimal_places=2)
    cantidad_minima = models.IntegerField()
    cantidad_actual = models.IntegerField(default=0)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activa = models.BooleanField(default=True)

    def __str__(self):
        return self.titulo

class Pedido(models.Model):
    ESTADO_CHOICES = (
        ('pendiente', 'Pendiente'),
        ('enviado', 'Enviado'),
        ('entregado', 'Entregado'),
        ('cancelado', 'Cancelado'),
    )
    TIPO_GESTION_CHOICES = (
        ('checkout_propio', 'Checkout Propio'),
        ('redireccion_proveedor', 'Redireccion Proveedor'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinica = models.ForeignKey(Clinica, on_delete=models.PROTECT)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT)
    numero_pedido = models.CharField(max_length=50, unique=True)
    fecha = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    tipo_gestion = models.CharField(max_length=30, choices=TIPO_GESTION_CHOICES)
    url_seguimiento = models.URLField(blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    descuentos = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    notas = models.TextField(blank=True)

    def __str__(self):
        return f"Pedido {self.numero_pedido}"

class LineaPedido(models.Model):
    pedido = models.ForeignKey(Pedido, related_name='lineas', on_delete=models.CASCADE)
    producto = models.ForeignKey(ProductoLegado, on_delete=models.PROTECT)
    cantidad = models.IntegerField()
    precio_unitario = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal_linea = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre}"

class ProductoEstrella(models.Model):
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    precio_mercado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_dq = models.DecimalField(max_digits=10, decimal_places=2)
    imagen = models.ImageField(upload_to='productos_estrella/', blank=True, null=True)

    def __str__(self):
        return self.nombre

class LeadSolicitud(models.Model):
    ESTADO_CHOICES = (
        ('Pending', 'Pending'),
        ('Contacted', 'Contacted'),
        ('Closed', 'Closed'),
    )

    clinica = models.ForeignKey(Clinica, on_delete=models.CASCADE)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE)
    usuario_solicitante = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    mensaje_interes = models.TextField()
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='Pending')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Lead: {self.clinica} -> {self.proveedor}"
