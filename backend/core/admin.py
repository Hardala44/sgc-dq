from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Clinica, Usuario, ClinicLegalEntity, ClinicAlias, ImportBatch, ExpenseCategory, Gasto

@admin.register(Clinica)
class ClinicaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nombre_norm', 'activa', 'fecha_alta')
    search_fields = ('nombre', 'nombre_norm')
    list_filter = ('activa',)

@admin.register(ClinicLegalEntity)
class ClinicLegalEntityAdmin(admin.ModelAdmin):
    list_display = ('cif', 'nombre_fiscal', 'clinic', 'email_preferred')
    search_fields = ('cif', 'nombre_fiscal', 'clinic__nombre')
    list_filter = ('clinic',)

@admin.register(ClinicAlias)
class ClinicAliasAdmin(admin.ModelAdmin):
    list_display = ('alias_raw', 'alias_norm', 'clinic', 'method', 'confidence', 'ignore')
    search_fields = ('alias_raw', 'alias_norm')
    list_filter = ('method', 'ignore')

@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'nombre_norm')

@admin.register(Gasto)
class GastoAdmin(admin.ModelAdmin):
    list_display = ('clinic', 'year', 'quarter', 'category', 'amount')
    list_filter = ('year', 'quarter', 'category', 'clinic')

@admin.register(ImportBatch)
class ImportBatchAdmin(admin.ModelAdmin):
    list_display = ('original_filename', 'imported_at', 'checksum')
    readonly_fields = ('stats',)

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'rol', 'clinica', 'legal_entity', 'is_staff')
    list_filter = ('rol', 'is_staff', 'is_superuser', 'groups', 'clinica')
    fieldsets = UserAdmin.fieldsets + (
        ('Información Extra', {'fields': ('clinica', 'legal_entity', 'rol', 'telefono', 'must_change_password')}),
    )
