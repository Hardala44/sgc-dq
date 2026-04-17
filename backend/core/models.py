import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class Clinica(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=200) # Global Name (Nombre Oficial)
    nombre_norm = models.CharField(max_length=200, unique=True, db_index=True, null=True, blank=True) # Normalized Name
    activa = models.BooleanField(default=True)
    num_boxes = models.PositiveIntegerField(null=True, blank=True, default=None)
    fecha_alta = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

class ClinicLegalEntity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey(Clinica, on_delete=models.CASCADE, related_name='legal_entities')
    cif = models.CharField(max_length=20, unique=True)
    reg_sanitario = models.CharField(max_length=100, blank=True)
    nombre_fiscal = models.CharField(max_length=200, blank=True)
    direccion = models.TextField(blank=True)
    poblacion = models.CharField(max_length=100, blank=True)
    provincia = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    email_preferred = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Legal Entity"
        verbose_name_plural = "Legal Entities"

    def __str__(self):
        return f"{self.cif} - {self.nombre_fiscal or 'No fiscal name'}"

class ClinicAlias(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alias_raw = models.CharField(max_length=200)
    alias_norm = models.CharField(max_length=200, unique=True, db_index=True)
    clinic = models.ForeignKey(Clinica, on_delete=models.SET_NULL, null=True, blank=True, related_name='aliases')
    method = models.CharField(max_length=50, default='unresolved') # exact, rule, fuzzy, manual, ignore, unresolved
    confidence = models.FloatField(default=0.0)
    ignore = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.alias_raw} -> {self.clinic}"

class ImportBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    original_filename = models.CharField(max_length=255)
    checksum = models.CharField(max_length=64, unique=True)
    imported_at = models.DateTimeField(auto_now_add=True)
    stats = models.JSONField(default=dict)

    def __str__(self):
        return f"Batch {self.imported_at} - {self.original_filename}"

class ExpenseCategory(models.Model):
    nombre = models.CharField(max_length=200)
    nombre_norm = models.CharField(max_length=200, unique=True)

    class Meta:
        verbose_name_plural = "Expense Categories"

    def __str__(self):
        return self.nombre

class Gasto(models.Model): # User called this 'Expense' but codebase uses Spanish. 'Gasto' is appropriate.
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey(Clinica, on_delete=models.CASCADE, related_name='gastos')
    year = models.IntegerField()
    quarter = models.IntegerField() # 1-4
    category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    source_sheet = models.CharField(max_length=100)
    source_row = models.IntegerField()
    last_import_batch = models.ForeignKey(ImportBatch, on_delete=models.PROTECT, null=True)
    proveedor = models.ForeignKey('compras.Proveedor', on_delete=models.SET_NULL, null=True, blank=True, related_name='gastos')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('clinic', 'year', 'quarter', 'category')
        indexes = [
            models.Index(fields=['clinic', 'year', 'quarter']),
        ]

    def __str__(self):
        return f"{self.clinic} - {self.year} Q{self.quarter} - {self.category}: {self.amount}"

class Usuario(AbstractUser):
    ROLES = (
        ('admin_dq', 'Admin DQ'),
        ('responsable_compras', 'Responsable de Compras'),
        ('consulta', 'Consulta'),
    )
    
    clinica = models.ForeignKey(Clinica, on_delete=models.SET_NULL, null=True, blank=True)
    legal_entity = models.ForeignKey(ClinicLegalEntity, on_delete=models.SET_NULL, null=True, blank=True)
    rol = models.CharField(max_length=30, choices=ROLES, default='consulta') # Validar default
    telefono = models.CharField(max_length=20, blank=True)
    must_change_password = models.BooleanField(default=True)
    
    def __str__(self):
        return self.username
